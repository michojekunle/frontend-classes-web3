import { useState, useEffect, useCallback, useMemo } from "react";
import { BrowserProvider, JsonRpcSigner, formatEther } from "ethers";
import { EIP6963AnnounceProvider, EIP6963RequestProvider } from "../constants";

export const useWalletConnection = () => {
  const [account, setAccount] = useState("");
  const [signer, setSigner] = useState(null);
  const [balance, setBalance] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [browserProvider, setBrowserProvider] = useState(null);
  const [provider, setProvider] = useState(null);

  const setAccountAndSigner = async (accounts) => {
    if (accounts.length > 0) {
      setAccount(accounts[0]);
      const signer = await browserProvider.getSigner();
      setSigner(signer);
    } else {
      setAccount(null);
      setSigner(null);
    }
  };

  const connectWallet = async () => {
    const accounts = await browserProvider.send("eth_requestAccounts", []);
    await setAccountAndSigner(accounts);
    const network = await browserProvider.getNetwork();
    setChainId(parseInt(network.chainId.toString()));
  };

  const disconnectWallet = async () => {
    setAccount(null);
    setSigner(null);
    setChainId(null);
    setBalance(null);
    await provider.request({
      method: "wallet_revokePermissions",
      params: [{ eth_accounts: {} }],
    });
  };

  const handleAccountsChanged = async (accounts) => {
    await setAccountAndSigner(accounts);
  };

  const handleChainChanged = async (newChainId) => {
    if (!chainId) setChainId(null);
    const newChainIdInt = parseInt(newChainId, 16);
    console.log(newChainIdInt, chainId);
    if (newChainIdInt == chainId) return;
    setChainId(newChainIdInt);
  };

  const handleDisconnect = async (error) => {
    console.error(error);
    await disconnectWallet();
    console.log("handle disconnect...");
  };

  const getBalance = async () => {
    if(browserProvider) {
        const balance = await browserProvider.getBalance(account);
        console.log("Balance: ", balance)
        setBalance(formatEther(balance));
    }
  };

  useEffect(() => {
    const init = async () => {
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      await setAccountAndSigner(accounts);

      const network = await browserProvider.getNetwork();
      setChainId(parseInt(network.chainId.toString()));
    };

    if (!browserProvider) {
      console.log("browserProvider is not set....");
      return;
    }

    init();

    provider.on("chainChanged", handleChainChanged);
    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("disconnect", handleDisconnect);

    return () => {
      provider.off("chainChanged", handleChainChanged);
      provider.off("accountsChanged", handleAccountsChanged);
      provider.off("disconnect", handleDisconnect);
    };
  }, [browserProvider]);

  useEffect(() => {
    window.dispatchEvent(new Event(EIP6963RequestProvider));
    window.addEventListener(EIP6963AnnounceProvider, (event) => {
      if (event.detail.info.rdns == "io.metamask") {
        setProvider(event.detail.provider);
        const browserProvider = new BrowserProvider(event.detail.provider);
        setBrowserProvider(browserProvider);
      }
    });
  }, []);

  return {
    account,
    browserProvider,
    signer,
    balance,
    chainId,
    connectWallet,
    disconnectWallet,
    getBalance,
  };
};
