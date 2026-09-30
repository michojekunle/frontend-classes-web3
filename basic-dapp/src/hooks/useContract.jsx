import { useState, useEffect, useCallback, useMemo } from "react";
import { BrowserProvider, JsonRpcSigner, formatEther } from "ethers";
import {
  EIP6963AnnounceProvider,
  EIP6963RequestProvider,
  SUPPORTED_CHAINS,
} from "../constants";

export const useWalletConnection = () => {
  const [account, setAccount] = useState("");
  const [signer, setSigner] = useState(null);
  const [balance, setBalance] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [browserProvider, setBrowserProvider] = useState(null);
  const [provider, setProvider] = useState(null);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);

  const isSupportedChain = useMemo(() => {
    if (!chainId) {
      return false;
    }
    return Boolean(SUPPORTED_CHAINS[chainId]);
  }, [chainId]);

  const currentChain = useMemo(() => {
    if (!chainId) {
      return null;
    }
    return SUPPORTED_CHAINS[chainId] || null;
  }, [chainId]);

  const setAccountAndSigner = useCallback(
    async (accounts) => {
      if (accounts.length > 0) {
        const newAccount = accounts[0];
        setAccount(newAccount);
        const signer = await browserProvider.getSigner(newAccount);
        setSigner(signer);
      } else {
        setAccount(null);
        setSigner(null);
        setBalance(null);
      }
    },
    [browserProvider]
  );

  const getBalance = useCallback(async () => {
    if (!browserProvider || !account) {
      return;
    }

    try {
      setIsRefreshingBalance(true);

      const network = await browserProvider.getNetwork();

      if (!SUPPORTED_CHAINS[Number(network.chainId)]) {
        setBalance(null);
        return;
      }

      const balance = await browserProvider.getBalance(account);

      setBalance(formatEther(balance));
    } catch (error) {
      console.error("Failed to fetch balance:", error);

      setBalance(null);
    } finally {
      setIsRefreshingBalance(false);
    }
  }, [browserProvider, account]);

  const switchChain = useCallback(
    async (targetChainId) => {
      if (!provider) {
        throw new Error("No wallet provider detected.");
      }

      const chain = SUPPORTED_CHAINS[targetChainId];
      if (!chain) {
        throw new Error(
          `Chain ${targetChainId} is not supported by this application.`
        );
      }

      const hexChainId = `0x${targetChainId.toString(16)}`;
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: hexChainId }],
        });
      } catch (error) {
        /** * Error 4902 means the wallet does not know * about this chain yet. * * Ask the wallet to add it. */
        // Check for all error codes here https://eips.ethereum.org/EIPS/eip-1193 under the Provider Errors;
        if (error.code === 4902) {
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
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: hexChainId }],
          });
        } else {
          throw error;
        }
      }
    },
    [provider]
  );

  const connectWallet = useCallback(async () => {
    if (!browserProvider) {
      throw new Error("No wallet provider detected.");
    }
    const accounts = await browserProvider.send("eth_requestAccounts", []);
    await setAccountAndSigner(accounts);
    const network = await browserProvider.getNetwork();
    setChainId(Number(network.chainId));
  }, [browserProvider, setAccountAndSigner]);

  const disconnectWallet = useCallback(async () => {
    try {
      if (provider) {
        await provider.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      }
    } catch (error) {
      console.error("Failed to revoke wallet permission:", error);
    }

    setAccount(null);
    setSigner(null);
    setChainId(null);
    setBalance(null);
  }, [provider]);

  const handleAccountsChanged = useCallback(
    async (accounts) => {
      await setAccountAndSigner(accounts);

      if (accounts.length == 0) {
        setChainId(null);
        setBalance(null);
      }
    },
    [setAccountAndSigner]
  );

  const handleChainChanged = useCallback((newChainId) => {
    setChainId(parseInt(newChainId, 16));

    setBalance(null);
    if (provider) {
        setBrowserProvider(new BrowserProvider(provider))
    }
  }, [provider]);

  const handleDisconnect = useCallback(
    async (error) => {
      console.error("Wallet disocnnected with error: ", error);
      await disconnectWallet();
      console.log("handle disconnect successful...");
    },
    [disconnectWallet]
  );

  useEffect(() => {
    const init = async () => {
      const accounts = await browserProvider.send("eth_accounts", []);
      if (accounts.length == 0) {
        return;
      }
      await setAccountAndSigner(accounts);

      const network = await browserProvider.getNetwork();
      setChainId(Number(network.chainId));
    };

    if (!browserProvider) {
      console.log("browserProvider is not set....");
      return;
    }

    init();
  }, [browserProvider, setAccountAndSigner]);

  useEffect(() => {
    if (!provider) {
      return;
    }

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
    if (!account || !browserProvider) {
      return;
    }
    getBalance();
  }, [account, browserProvider, getBalance]);

  useEffect(() => {
    const handleProviderAnnouncement = (event) => {
      if (event.detail.info.rdns === "io.metamask") {
        const injectedProvider = event.detail.provider;

        setProvider(injectedProvider);
        setBrowserProvider(new BrowserProvider(injectedProvider));
      }
    };

    window.addEventListener(
      EIP6963AnnounceProvider,
      handleProviderAnnouncement
    );

    window.dispatchEvent(new Event(EIP6963RequestProvider));

    return () => {
      window.removeEventListener(
        EIP6963AnnounceProvider,
        handleProviderAnnouncement
      );
    };
  }, []);

  return {
 
  };
};
