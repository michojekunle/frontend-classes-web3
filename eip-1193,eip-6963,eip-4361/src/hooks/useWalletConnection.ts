import { useState, useEffect, useCallback } from "react";
import { ethers, BrowserProvider, JsonRpcSigner } from "ethers";

export function useWalletConnection() {
  const [accountAddress, setAccountAddress] = useState("");
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  useEffect(() => {
    const { ethereum } = window as any;
    const initializeEthereum = async () => {
      if (typeof window !== "undefined" && typeof ethereum !== "undefined") {
        const browserProvider = new ethers.BrowserProvider(ethereum);
        setProvider(browserProvider);

        try {
          const accounts = await browserProvider.listAccounts();
          if (accounts.length > 0) {
            setAccountAddress(accounts[0].address);
            setSigner(await browserProvider.getSigner());
          }

          const network = await browserProvider.getNetwork();
          setChainId(parseInt(network.chainId.toString()));

          ethereum.on("accountsChanged", handleAccountsChanged);
          ethereum.on("chainChanged", handleChainChanged);
          ethereum.on("disconnect", handleDisconnect);
        } catch (error) {
          console.error("Error initializing Ethereum:", error);
        }
      }
    };

    initializeEthereum();

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
      ethereum.removeListener("disconnect", handleDisconnect);
    };
  }, []);

  // Listen for disconnection
  const handleDisconnect = () => {
    disconnectWallet();
    console.log("Wallet disconnected");
  };

  // Listen for account changes
  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      setAccountAddress(accounts[0]);
      setSigner(!provider ? null : await provider.getSigner());
      console.log("Account changed:", accounts[0]);
    }
  };

  // Listen for chain changes
  const handleChainChanged = async (chainId: string) => {
    const { ethereum } = window as any;
    if (ethereum) {
      try {
        const browserProvider = new ethers.BrowserProvider(ethereum);
        setProvider(browserProvider);
      } catch (error) {
        console.error(error);
      }
    }
    const numericChainId = parseInt(chainId, 16); // Convert chainId to a number
    setChainId(numericChainId);
    console.log("Chain changed to:", numericChainId);
  };

  const connectWallet = useCallback(async () => {
    const { ethereum } = window as any;
    if (ethereum) {
      try {
        const browserProvider = new ethers.BrowserProvider(ethereum);
        setProvider(browserProvider);

        const accounts = await browserProvider.send("eth_requestAccounts", []);
        const network = await browserProvider.getNetwork();
        setAccountAddress(accounts[0]);
        setChainId(parseInt(network.chainId.toString()));
        setSigner(await browserProvider.getSigner());
      } catch (error) {
        console.error("Error connecting wallet:", error);
      }
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setAccountAddress("");
    setSigner(null);
    setBalance(null);
    setChainId(null);
    setProvider(null);

    console.log(
      "Disconnected from wallet. Please manually disconnect from MetaMask if necessary."
    );
  }, []);

  const getBalance = useCallback(
    async (address: string) => {
      if (provider && ethers.isAddress(address)) {
        setIsLoading(true);
        try {
          const balance = await provider.getBalance(address);
          setBalance(ethers.formatEther(balance));
        } catch (error) {
          console.error("Error fetching balance:", error);
          setBalance(null);
        }
        setIsLoading(false);
      } else {
        setBalance(null);
      }
    },
    [provider, accountAddress, chainId]
  );

  return {
    accountAddress,
    chainId,
    balance,
    isLoading,
    signer,
    connectWallet,
    disconnectWallet,
    getBalance,
  };
}
