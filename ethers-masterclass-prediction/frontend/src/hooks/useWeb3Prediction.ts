import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatEther, isAddress, isError, parseEther } from "ethers";
import { PredictionMarketData } from "../types/prediction";
import { PREDICTION_HUB_ADDRESS } from "../contracts/predictionConfig";
import { DEFAULT_CHAIN_ID, predictionmarketabi } from "../constants";
import { useContract } from "./useContract";
import { useWalletConnection } from "./useWalletConnection";

// Wallet connection (EIP-6963 discovery, BrowserProvider, chain validation) lives in useWalletConnection
export const useWeb3Wallet = useWalletConnection;

type MarketStruct = {
  id: bigint;
  title: string;
  category: string;
  endTime: bigint;
  outcome: bigint;
  totalYesPool: bigint;
  totalNoPool: bigint;
  resolved: boolean;
};

type UserPosition = {
  yesAmount: bigint;
  noAmount: bigint;
  claimed: boolean;
  winnings: bigint;
};

const NO_POSITION: UserPosition = {
  yesAmount: 0n,
  noAmount: 0n,
  claimed: false,
  winnings: 0n,
};

// MarketCard compares against the literal "0" to decide if the user has a position
const formatPool = (value: bigint): string =>
  value === 0n ? "0" : formatEther(value);

// Proportional odds from the two pools, done in bigint so large pools do not lose precision
export const calculateOdds = (
  totalYesPool: bigint,
  totalNoPool: bigint
): { yesPercentage: number; noPercentage: number } => {
  const totalPool = totalYesPool + totalNoPool;
  if (totalPool === 0n) {
    return { yesPercentage: 50, noPercentage: 50 };
  }
  // basis points first, then round to a whole percent
  const yesBps = Number((totalYesPool * 10000n) / totalPool);
  const yesPercentage = Math.round(yesBps / 100);
  return { yesPercentage, noPercentage: 100 - yesPercentage };
};

const toMarketData = (
  market: MarketStruct,
  position: UserPosition
): PredictionMarketData => ({
  id: Number(market.id),
  title: market.title,
  category: market.category,
  endTime: Number(market.endTime),
  outcome: Number(market.outcome),
  totalYesPool: formatPool(market.totalYesPool),
  totalNoPool: formatPool(market.totalNoPool),
  resolved: market.resolved,
  userYesBet: formatPool(position.yesAmount),
  userNoBet: formatPool(position.noAmount),
  userClaimed: position.claimed,
  userEstimatedWinnings: formatPool(position.winnings),
  isExpired: Number(market.endTime) <= Math.floor(Date.now() / 1000),
  ...calculateOdds(market.totalYesPool, market.totalNoPool),
});

// Turn wallet / RPC / contract failures into one readable sentence for the error banner
const parseContractError = (err: any, fallback: string): string => {
  if (
    isError(err, "ACTION_REJECTED") ||
    err?.code === 4001 ||
    err?.info?.error?.code === 4001
  ) {
    return "Transaction cancelled in your wallet.";
  }
  if (isError(err, "INSUFFICIENT_FUNDS")) {
    return "Not enough Sepolia ETH to cover the bet and gas.";
  }
  if (isError(err, "CALL_EXCEPTION")) {
    // require(...) strings, e.g. "Market betting has closed"
    if (err.reason) return err.reason;
    // custom errors, e.g. OwnableUnauthorizedAccount
    if (err.revert?.name === "OwnableUnauthorizedAccount") {
      return "Only the contract owner can do this.";
    }
    if (err.revert?.name) return `Transaction reverted: ${err.revert.name}`;
    return "Transaction reverted by the contract.";
  }
  if (isError(err, "INVALID_ARGUMENT")) {
    return "Enter a valid ETH amount.";
  }
  if (isError(err, "NETWORK_ERROR") || isError(err, "TIMEOUT")) {
    return "Network error, please check your connection and try again.";
  }
  return err?.shortMessage || err?.message || fallback;
};

export const usePredictionMarket = (walletAddress: string | null) => {
  const {
    wallet: { chainId },
    isSupportedChain,
    switchNetwork,
    getBalance: refreshEthBalance,
  } = useWalletConnection();
  const { getContract } = useContract();

  const [markets, setMarkets] = useState<PredictionMarketData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Read-only contract on the public Sepolia RPC: markets and live events work before connecting
  const readContract = useMemo(
    () => getContract(PREDICTION_HUB_ADDRESS, predictionmarketabi, false),
    [getContract]
  );
  // Signer-backed contract for placeBet / claimWinnings / createMarket
  const writeContract = useMemo(
    () => getContract(PREDICTION_HUB_ADDRESS, predictionmarketabi, true),
    [getContract]
  );

  const userAddress = useMemo(
    () => (walletAddress && isAddress(walletAddress) ? walletAddress : null),
    [walletAddress]
  );

  // Guards against an older fetch (previous account) landing after a newer one
  const fetchIdRef = useRef(0);

  const getUserPosition = useCallback(
    async (marketId: bigint | number): Promise<UserPosition> => {
      if (!readContract || !userAddress) return NO_POSITION;
      const [bet, winnings] = await Promise.all([
        readContract.userBets(marketId, userAddress),
        readContract.calculateWinnings(marketId, userAddress),
      ]);
      return {
        yesAmount: bet.yesAmount,
        noAmount: bet.noAmount,
        claimed: bet.claimed,
        winnings,
      };
    },
    [readContract, userAddress]
  );

  const fetchMarkets = useCallback(
    async (showLoader = true) => {
      if (!readContract) return;
      const fetchId = ++fetchIdRef.current;
      try {
        if (showLoader) setIsLoading(true);
        const allMarkets: MarketStruct[] = await readContract.getAllMarkets();
        const positions = await Promise.all(
          allMarkets.map((market) => getUserPosition(market.id))
        );
        if (fetchId !== fetchIdRef.current) return;
        setMarkets(
          allMarkets.map((market, idx) => toMarketData(market, positions[idx]))
        );
        setError(null);
      } catch (err: any) {
        if (fetchId !== fetchIdRef.current) return;
        console.error("Failed to fetch markets:", err);
        setError(parseContractError(err, "Failed to fetch prediction markets"));
      } finally {
        if (fetchId === fetchIdRef.current) setIsLoading(false);
      }
    },
    [readContract, getUserPosition]
  );

  // Re-read a single market from chain. Used by the event listeners, so the UI
  // always shows contract state and a bet is never counted twice.
  const refreshMarket = useCallback(
    async (marketId: number) => {
      if (!readContract) return;
      try {
        const [market, position] = await Promise.all([
          readContract.markets(marketId) as Promise<MarketStruct>,
          getUserPosition(marketId),
        ]);
        const updated = toMarketData(market, position);
        setMarkets((prev) => {
          if (!prev.some((m) => m.id === marketId)) {
            return [...prev, updated].sort((a, b) => a.id - b.id);
          }
          return prev.map((m) => (m.id === marketId ? updated : m));
        });
      } catch (err) {
        console.error(`Failed to refresh market ${marketId}:`, err);
      }
    },
    [readContract, getUserPosition]
  );

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  // Flip markets to expired when their endTime passes, without another RPC call
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      setMarkets((prev) =>
        prev.some((m) => !m.isExpired && m.endTime <= now)
          ? prev.map((m) => ({ ...m, isExpired: m.endTime <= now }))
          : prev
      );
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Real-time event subscriptions
  useEffect(() => {
    if (!readContract) return;

    const isUserEvent = (user: string) =>
      !!userAddress && user.toLowerCase() === userAddress.toLowerCase();

    const handleMarketCreated = (marketId: bigint) => {
      console.log("Event [MarketCreated]:", marketId);
      refreshMarket(Number(marketId));
    };

    const handleBetPlaced = (
      marketId: bigint,
      user: string,
      isYes: boolean,
      amount: bigint
    ) => {
      console.log("Event [BetPlaced]:", marketId, user, isYes, amount);
      refreshMarket(Number(marketId));
      if (isUserEvent(user)) refreshEthBalance();
    };

    const handleMarketResolved = (marketId: bigint, outcome: bigint) => {
      console.log("Event [MarketResolved]:", marketId, outcome);
      refreshMarket(Number(marketId));
    };

    const handleWinningsClaimed = (
      marketId: bigint,
      user: string,
      amount: bigint
    ) => {
      console.log("Event [WinningsClaimed]:", marketId, user, amount);
      if (isUserEvent(user)) {
        refreshMarket(Number(marketId));
        refreshEthBalance();
      }
    };

    readContract.on("MarketCreated", handleMarketCreated);
    readContract.on("BetPlaced", handleBetPlaced);
    readContract.on("MarketResolved", handleMarketResolved);
    readContract.on("WinningsClaimed", handleWinningsClaimed);

    return () => {
      readContract.off("MarketCreated", handleMarketCreated);
      readContract.off("BetPlaced", handleBetPlaced);
      readContract.off("MarketResolved", handleMarketResolved);
      readContract.off("WinningsClaimed", handleWinningsClaimed);
    };
  }, [readContract, userAddress, refreshMarket, refreshEthBalance]);

  // Shared pre-flight for every write: connected wallet on Sepolia
  const getWriteContract = useCallback(async () => {
    if (!writeContract || !userAddress) {
      setError("Please connect your wallet first.");
      return null;
    }
    if (!isSupportedChain) {
      setError(
        `Wrong network (chain ${chainId ?? "unknown"}). Switch to Sepolia and try again.`
      );
      try {
        await switchNetwork(DEFAULT_CHAIN_ID);
      } catch (err) {
        console.error("Network switch failed:", err);
      }
      return null;
    }
    return writeContract;
  }, [writeContract, userAddress, isSupportedChain, chainId, switchNetwork]);

  const placeBet = async (
    marketId: number,
    isYes: boolean,
    amountEth: string
  ) => {
    setError(null);
    const contract = await getWriteContract();
    if (!contract) return;

    try {
      const market = markets.find((m) => m.id === marketId);
      if (market?.resolved) {
        setError("Market already resolved");
        return;
      }
      if (market && market.endTime <= Math.floor(Date.now() / 1000)) {
        setError("Market betting has closed");
        return;
      }

      const value = parseEther(amountEth);
      if (value <= 0n) {
        setError("Bet amount must be > 0");
        return;
      }

      // native ETH travels as msg.value
      const tx = await contract.placeBet(marketId, isYes, { value });
      await tx.wait();

      await refreshMarket(marketId);
      refreshEthBalance();
    } catch (err: any) {
      console.error("Place Bet Error:", err);
      setError(parseContractError(err, "Placing bet failed"));
    }
  };

  const claimWinnings = async (marketId: number) => {
    setError(null);
    const contract = await getWriteContract();
    if (!contract) return;

    try {
      const tx = await contract.claimWinnings(marketId);
      await tx.wait();

      await refreshMarket(marketId);
      refreshEthBalance();
    } catch (err: any) {
      console.error("Claim Error:", err);
      setError(parseContractError(err, "Claiming winnings failed"));
    }
  };

  const createMarket = async (
    title: string,
    category: string,
    durationSeconds: number
  ) => {
    setError(null);
    const contract = await getWriteContract();
    if (!contract) return;

    try {
      const tx = await contract.createMarket(title, category, durationSeconds);
      await tx.wait();
      // the MarketCreated listener adds the new card; this covers a missed event
      await fetchMarkets(false);
    } catch (err: any) {
      console.error("Create Market Error:", err);
      setError(parseContractError(err, "Creating market failed"));
    }
  };

  return {
    markets,
    isLoading,
    error,
    placeBet,
    claimWinnings,
    createMarket,
    refetchMarkets: fetchMarkets,
  };
};
