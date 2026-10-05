import { useState, useEffect, useCallback, useMemo } from "react";
import { BrowserProvider, JsonRpcSigner, formatEther, Contract, parseEther } from "ethers";
import {
  EIP6963RequestProvider,
  EIP6963AnnounceProvider,
  SUPPORTED_CHAINS,
  MarketOutcome,
  PredictionMarketData,
} from "../types/prediction";
import { PREDICTION_HUB_ABI, PREDICTION_HUB_ADDRESS } from "../contracts/predictionConfig";
import { useContract } from "./useContract";



type EIP1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, listener: (...args: any[]) => void) => void;
  removeListener: (event: string, listener: (...args: any[]) => void) => void;
};

type EIP6963ProviderDetail = {
  info: { rdns: string };
  provider: EIP1193Provider;
};

type EIP6963ProviderEvent = CustomEvent<EIP6963ProviderDetail>;

type ProviderError = Error & { code?: number };

type ChainConfig = {
  name: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrl: string;
  blockExplorer: string;
};

type SupportedChains = Record<number, ChainConfig>;

const chains = SUPPORTED_CHAINS as SupportedChains;



export const useWalletConnection = () => {
  const [account, setAccount] = useState<string | null>("");
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [browserProvider, setBrowserProvider] = useState<BrowserProvider | null>(null);
  const [provider, setProvider] = useState<EIP1193Provider | null>(null);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isSupportedChain = useMemo(() => {
    if (!chainId) return false;
    return Boolean(chains[chainId]);
  }, [chainId]);

  const currentChain = useMemo(() => {
    if (!chainId) return null;
    return chains[chainId] || null;
  }, [chainId]);

  const setAccountAndSigner = useCallback(
    async (accounts: string[]): Promise<void> => {
      if (browserProvider && accounts.length > 0) {
        const newAccount = accounts[0];
        setAccount(newAccount);
        const newSigner = await browserProvider.getSigner(newAccount);
        setSigner(newSigner);
      } else {
        setAccount(null);
        setSigner(null);
        setBalance(null);
      }
    },
    [browserProvider]
  );

  const getBalance = useCallback(async (): Promise<void> => {
    if (!browserProvider || !account) return;

    try {
      setIsRefreshingBalance(true);
      const network = await browserProvider.getNetwork();

      if (!chains[Number(network.chainId)]) {
        setBalance(null);
        return;
      }

      const bal = await browserProvider.getBalance(account);
      setBalance(Number(formatEther(bal)).toFixed(5));
    } catch (err: unknown) {
      console.error("Failed to fetch balance:", err);
      setBalance(null);
    } finally {
      setIsRefreshingBalance(false);
    }
  }, [browserProvider, account]);

  const switchChain = useCallback(
    async (targetChainId: number): Promise<void> => {
      if (!provider) throw new Error("No wallet provider detected.");

      const chain = chains[targetChainId];
      if (!chain) throw new Error(`Chain ${targetChainId} is not supported by this application.`);

      const hexChainId = `0x${targetChainId.toString(16)}`;
      try {
        await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexChainId }] });
      } catch (err: unknown) {
        const providerError = err as ProviderError;
        if (providerError.code === 4902) {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: hexChainId,
                chainName: chain.name,
                nativeCurrency: chain.nativeCurrency,
                rpcUrls: [chain.rpcUrl],
                blockExplorerUrls: [chain.blockExplorer],
              },
            ],
          });
          await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexChainId }] });
        } else {
          throw err;
        }
      }
    },
    [provider]
  );

  const validateChainId = useCallback((): boolean => {
    if (!chainId) return false;
    return Boolean(SUPPORTED_CHAINS[chainId]);
  }, [chainId]);

  const connectWallet = useCallback(async (): Promise<void> => {
    if (!browserProvider) throw new Error("No wallet provider detected.");
    setIsConnecting(true);
    try {
      const accounts = (await browserProvider.send("eth_requestAccounts", [])) as string[];
      await setAccountAndSigner(accounts);
      const network = await browserProvider.getNetwork();
      setChainId(Number(network.chainId));
    } catch (err: any) {
      setError(err?.message ?? "An unexpected error occurred, please try again");
    } finally {
      setIsConnecting(false);
    }
  }, [browserProvider, setAccountAndSigner]);

  const disconnectWallet = useCallback(async (): Promise<void> => {
    try {
      if (provider) {
        await provider.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] });
      }
    } catch (err: unknown) {
      console.error("Failed to revoke wallet permission:", err);
    }
    setAccount(null);
    setSigner(null);
    setChainId(null);
    setBalance(null);
  }, [provider]);

  const handleAccountsChanged = useCallback(
    async (accounts: string[]): Promise<void> => {
      await setAccountAndSigner(accounts);
      if (accounts.length === 0) {
        setChainId(null);
        setBalance(null);
      }
    },
    [setAccountAndSigner]
  );

  const handleChainChanged = useCallback(
    (newChainId: string): void => {
      setChainId(parseInt(newChainId, 16));
      setBalance(null);
      if (provider) setBrowserProvider(new BrowserProvider(provider as any));
    },
    [provider]
  );

  const handleDisconnect = useCallback(
    async (err: unknown): Promise<void> => {
      console.error("Wallet disconnected with error:", err);
      await disconnectWallet();
    },
    [disconnectWallet]
  );

 
  useEffect(() => {
    if (!browserProvider) return;

    const init = async () => {
      const accounts = (await browserProvider.send("eth_accounts", [])) as string[];
      if (accounts.length === 0) return;
      await setAccountAndSigner(accounts);
      const network = await browserProvider.getNetwork();
      setChainId(Number(network.chainId));
    };

    init();
  }, [browserProvider, setAccountAndSigner]);

  
  useEffect(() => {
    if (!provider) return;
    provider.on("chainChanged", handleChainChanged);
    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("disconnect", handleDisconnect);
    return () => {
      provider.removeListener("chainChanged", handleChainChanged);
      provider.removeListener("accountsChanged", handleAccountsChanged);
      provider.removeListener("disconnect", handleDisconnect);
    };
  }, [provider, handleAccountsChanged, handleChainChanged, handleDisconnect]);

  
  useEffect(() => {
    if (!account || !browserProvider) return;
    getBalance();
  }, [account, browserProvider, getBalance]);

 
  useEffect(() => {
    const handleProviderAnnouncement = (event: Event): void => {
      const providerEvent = event as EIP6963ProviderEvent;
      if (providerEvent.detail.info.rdns === "io.metamask") {
        const injectedProvider = providerEvent.detail.provider;
        setProvider(injectedProvider);
        setBrowserProvider(new BrowserProvider(injectedProvider as any));
      }
    };

    window.addEventListener(EIP6963AnnounceProvider, handleProviderAnnouncement);
    window.dispatchEvent(new Event(EIP6963RequestProvider));

    return () => {
      window.removeEventListener(EIP6963AnnounceProvider, handleProviderAnnouncement);
    };
  }, []);

  return {
    wallet: {
      address: account,
      chainId,
      balance,
      isConnected: !!account,
      isConnecting,
      error,
    },
    provider,
    browserProvider,
    signer,
    chainId,
    isSupportedChain,
    currentChain,
    supportedChains: SUPPORTED_CHAINS,
    connectWallet,
    disconnectWallet,
    getBalance,
    switchNetwork: switchChain,
    validateChainId,
    isRefreshingBalance,
  };
};


export const useWeb3Wallet = useWalletConnection;


export const usePredictionMarket = (userAddress: string | null) => {
  const { signer, wallet } = useWalletConnection();
  const { getContract } = useContract()

  const [markets, setMarkets] = useState<PredictionMarketData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPredictionContract = useMemo(
    () => getContract(PREDICTION_HUB_ADDRESS, PREDICTION_HUB_ABI, true),
    [wallet.address, signer]
  );

  const readOnlyContract = useMemo(
    () => getContract(PREDICTION_HUB_ADDRESS, PREDICTION_HUB_ABI, false),
    []
  )

  const fetchMarkets = useCallback(async () => {
    const contract = getPredictionContract;
    console.log(contract)
    if (!contract) return;

    try {
      setIsLoading(true);
      setError(null);

    const raw = await contract.getAllMarkets();
    console.log("THIS IS THE MARKET", raw)

    const now = Math.floor(Date.now() / 1000);


    const fetchedMarket = await Promise.all(
      raw.map(async (market: any) => {
        const userBet = await contract.userBets(market.id, signer);
        const userWinnings = await contract.calculateWinnings(market.id, signer)

        return {
          id: market.id,
          title: market.title,
          category: market.category,
          endTime: market.endTime,
          outCome: market.outcome,
          totalYesPool: formatEther(BigInt(market.totalYesPool)),
          totalNoPool: formatEther(BigInt(market.totalNoPool)),
          resolved: market.resolved,
          userYesBet: formatEther(BigInt(userBet.yesAmount)),
          userNoBet: formatEther(BigInt(userBet.noAmount)),
          userClaimed: userBet.claimed,
          userEstimatedWinnings: userWinnings,
          isExpired: now > market.endTime ? true : false
        };
      })
    );
   

    setMarkets(fetchedMarket);

    console.log("This is the parsed", fetchedMarket); 

    } catch (err: any) {
      console.error("fetchMarkets error:", err);
      setError(err?.message ?? "Failed to load markets");
    } finally {
      setIsLoading(false);
    }
  }, [getContract, userAddress]);

 
  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  useEffect(() => {
    const contract = readOnlyContract;
    if (!contract) return;

    const onMarketCreated = (_marketId: bigint, _title: string, _category: string, _endTime: bigint) => {
      fetchMarkets();
    };

    const onBetPlaced = (_marketId: bigint, _user: string, _isYes: boolean, _amount: bigint) => {
      fetchMarkets();
    };

    const onMarketResolved = (_marketId: bigint, _outcome: number) => {
      fetchMarkets();
    };

    contract.on("MarketCreated", onMarketCreated);
    contract.on("BetPlaced", onBetPlaced);
    contract.on("MarketResolved", onMarketResolved);

    return () => {
      contract.off("MarketCreated", onMarketCreated);
      contract.off("BetPlaced", onBetPlaced);
      contract.off("MarketResolved", onMarketResolved);
    };
  }, [readOnlyContract, fetchMarkets]);

  const placeBet = useCallback(
    async (marketId: number, betYes: boolean, amountEth: string): Promise<void> => {
      const contract = getPredictionContract;
      if (!contract || !signer) throw new Error("Wallet not connected.");
      try {
        const tx = await contract.placeBet(marketId, betYes, { value: parseEther(amountEth) });
        await tx.wait();
        await fetchMarkets();
      } catch (err: any) {
        if (err.code === "ACTION_REJECTED" || err.code === 4001) {
          throw new Error("Transaction cancelled.");
        }
        if (err.reason) {
          throw new Error(err.reason);
        }
        throw err;
      }
    },
    [getPredictionContract, signer, fetchMarkets]
  );

  const claimWinnings = useCallback(
    async (marketId: number): Promise<void> => {
      const contract = getPredictionContract;
      if (!contract || !signer) throw new Error("Wallet not connected.");
      try {
        const tx = await contract.claimWinnings(marketId);
        await tx.wait();
        await fetchMarkets();
      } catch (err: any) {
        if (err.code === "ACTION_REJECTED" || err.code === 4001) {
          throw new Error("Transaction cancelled.");
        }
        if (err.reason) {
          throw new Error(err.reason);
        }
        throw err;
      }
    },
    [getPredictionContract, signer, fetchMarkets]
  );

  return { markets, isLoading, error, placeBet, claimWinnings, refetch: fetchMarkets };
};
