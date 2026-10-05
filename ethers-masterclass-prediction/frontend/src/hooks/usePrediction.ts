import { useEffect, useState, useMemo, useCallback } from "react";
import { useWalletConnection } from "./useWalletConnection";
import { CONTRACTS } from "../contracts/predictionConfig";
import { Contract, formatEther, isAddress, parseEther, ZeroAddress } from "ethers";
import { PredictionEventLog, PredictionMarketData } from "../types/prediction";



export const usePrediction = (walletAddress?: string | null) => {
  const {
    wallet: {
      address,
      chainId,
      balance,
      isConnected,
      isConnecting,
      error: walletError,
    },
    provider,
    signer,
    connectWallet,
  } = useWalletConnection();

  const { predict, multicall2 } = CONTRACTS;
  const [market, setMarket] = useState<PredictionMarketData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<PredictionEventLog[]>([]);

  // Contracts

  const predContract = useMemo(
    () => provider ? new Contract(predict.address, predict.abi, provider) : null,
    [predict.address, predict.abi, provider]
  );

  const multicall2Contract = useMemo(
    () => provider ? new Contract(multicall2.address, multicall2.abi, provider) : null,
    [multicall2.address, multicall2.abi, provider]
  );

  // Wallet address

  const validAddress = useMemo(
    () =>
      (walletAddress ?? address) && isAddress(walletAddress ?? address!)
        ? walletAddress ?? address!
        : ZeroAddress,
    [address, walletAddress]
  );

  // Get all market details

  const getMarket = useCallback(
    async (contract: Contract): Promise<PredictionMarketData[]> => {
      const markets = await contract.getAllMarkets();

      return Promise.all(markets.map(async (item: any) => {
        const id = Number(item.id);
        const userBets = validAddress === ZeroAddress
          ? [0n, 0n, false]
          : await contract.userBets(id, validAddress);
        const estimatedWinnings = validAddress === ZeroAddress
          ? 0n
          : await contract.calculateWinnings(id, validAddress);
        const endTime = Number(item.endTime);

        return {
          id,
          title: item.title,
          category: item.category,
          endTime,
          outcome: Number(item.outcome),
          totalYesPool: formatEther(item.totalYesPool),
          totalNoPool: formatEther(item.totalNoPool),
          resolved: Boolean(item.resolved),
          userYesBet: formatEther(userBets.yesAmount ?? userBets[0]),
          userNoBet: formatEther(userBets.noAmount ?? userBets[1]),
          userClaimed: Boolean(userBets.claimed ?? userBets[2]),
          userEstimatedWinnings: formatEther(estimatedWinnings),
          isExpired: endTime <= Math.floor(Date.now() / 1000),
        };
      }));
    },
    [validAddress]
  );

  // Fetch all market data

  const fetchMarketData = useCallback(async () => {
    if (!predContract) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const markets = await getMarket(predContract);
      setMarket(markets);
    } catch (err: any) {
      console.error("Failed to fetch prediction markets:", err);

      setError(
        err?.reason ||
          err?.message ||
          "Failed to fetch prediction markets"
      );
    } finally {
      setIsLoading(false);
    }
  }, [predContract, getMarket]);

  const runTransaction = useCallback(async (action: () => Promise<any>) => {
    try {
      setError(null);
      const transaction = await action();
      await transaction.wait();
      await fetchMarketData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      setError(message);
      throw err;
    }
  }, [fetchMarketData]);

  const placeBet = useCallback(async (marketId: number, isYes: boolean, amountEth: string) => {
    if (!signer || !predContract) throw new Error("Connect your wallet to place a bet.");
    const amount = parseEther(amountEth);
    if (amount <= 0n) throw new Error("Bet amount must be greater than zero.");

    await runTransaction(() => new Contract(predict.address, predict.abi, signer).placeBet(marketId, isYes, { value: amount }));
  }, [predict.abi, predict.address, predContract, runTransaction, signer]);

  const claimWinnings = useCallback(async (marketId: number) => {
    if (!signer || !predContract) throw new Error("Connect your wallet to claim winnings.");
    await runTransaction(() => new Contract(predict.address, predict.abi, signer).claimWinnings(marketId));
  }, [predict.abi, predict.address, predContract, runTransaction, signer]);

  const createMarket = useCallback(async (title: string, category: string, durationSeconds: number) => {
    if (!signer || !predContract) throw new Error("Connect the owner wallet to create a market.");
    if (!title.trim() || !category.trim() || !Number.isInteger(durationSeconds) || durationSeconds <= 0) {
      throw new Error("Provide a title, category, and positive whole-number duration.");
    }

    await runTransaction(() => new Contract(predict.address, predict.abi, signer).createMarket(title.trim(), category.trim(), durationSeconds));
  }, [predict.abi, predict.address, predContract, runTransaction, signer]);

  useEffect(() => {
    if (!predContract) return;

    const eventNames: PredictionEventLog["type"][] = [
      "MarketCreated",
      "BetPlaced",
      "MarketResolved",
      "WinningsClaimed",
    ];
    const listeners = eventNames.map((type) => {
      const listener = (...args: any[]) => {
        const payload = args[args.length - 1];
        const log = payload?.log;
        if (!log) return;

        const user = type === "BetPlaced" || type === "WinningsClaimed"
          ? String(args[1])
          : undefined;
        const amount = type === "BetPlaced"
          ? formatEther(args[3])
          : type === "WinningsClaimed"
            ? formatEther(args[2])
            : undefined;
        const entry: PredictionEventLog = {
          id: `${log.transactionHash}:${log.index}`,
          type,
          marketId: Number(args[0]),
          user,
          amount,
          outcome: type === "MarketResolved" ? String(args[1]) : undefined,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          timestamp: new Date().toISOString(),
        };

        setEvents((previous) => [entry, ...previous].slice(0, 50));
        void fetchMarketData();
      };

      predContract.on(type, listener);
      return { type, listener };
    });

    return () => {
      for (const { type, listener } of listeners) {
        void predContract.off(type, listener);
      }
    };
  }, [fetchMarketData, predContract]);

  // Fetch markets when contract changes

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // Return

  return {
    market,
    events,
    isLoading,
    error,

    // Wallet
    address,
    chainId,
    balance,
    isConnected,
    isConnecting,

    provider,
    signer,

    connectWallet,

    wallet: {
      address,
      chainId,
      balance,
      isConnected,
      isConnecting,
      error: walletError,
    },

    // Contracts
    predContract,
    multicall2Contract,

    // Actions
    refetchMarket: fetchMarketData,
    placeBet,
    claimWinnings,
    createMarket,
  };
};
