//   // TODO FOR ASSIGNMENT:
//   // 1. Connect to PredictionMarketOracleHub contract using ethers.Contract
//   // 2. Fetch all markets using getAllMarkets()
//   // 3. For each market, read calculateWinnings() and userBets() for connected user
//   // 4. Implement event listeners for MarketCreated, BetPlaced, MarketResolved, WinningsClaimed
//   // 5. Implement placeBet(), claimWinnings(), and createMarket() (Owner mode)

import { useEffect, useState } from 'react';
import { ethers, BrowserProvider, JsonRpcProvider } from 'ethers';
import { WalletState } from '../types/prediction';
import { rpc_url } from '../constants';

const PROVIDER_URL = rpc_url;

export const useWalletConnection = () => {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    chainId: null,
    balance: '0.00',
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  const [provider, setProvider] = useState<
    BrowserProvider | JsonRpcProvider | null
  >(null);

  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  // Initialize provider
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.ethereum) {
      const browserProvider = new BrowserProvider(window.ethereum);
      setProvider(browserProvider);
      console.log('Web3 wallet detected');
      return;
    }

    console.log(
      'Web3 wallet not detected; using read-only RPC provider'
    );

    const rpcProvider = new JsonRpcProvider(PROVIDER_URL);
    setProvider(rpcProvider);
  }, []);

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setWallet(prev => ({
        ...prev,
        error: 'No crypto wallet detected. Please install MetaMask.',
      }));

      return;
    }

    setWallet(prev => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    try {
      // Create provider connected to the browser wallet
      const browserProvider = new BrowserProvider(window.ethereum);

      // Request wallet access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No wallet account was returned.');
      }

      const address = accounts[0];

      // Get signer
      const web3Signer = await browserProvider.getSigner();

      // Get network
      const network = await browserProvider.getNetwork();

      // Get ETH balance
      const rawBalance = await browserProvider.getBalance(address);
      const balance = ethers.formatEther(rawBalance);

      console.log('========== WALLET CONNECTED ==========');
      console.log('Address:', address);
      console.log('Chain ID:', Number(network.chainId));
      console.log('Balance:', balance);
      console.log('======================================');

      // Save provider and signer
      setProvider(browserProvider);
      setSigner(web3Signer);

      // Save wallet state
      setWallet({
        address,
        chainId: Number(network.chainId),
        balance: parseFloat(balance).toFixed(4),
        isConnected: true,
        isConnecting: false,
        error: null,
      });
    } catch (err: unknown) {
      console.error('Wallet connection failed:', err);

      const message =
        err instanceof Error
          ? err.message
          : 'Failed to connect wallet';

      setWallet(prev => ({
        ...prev,
        isConnecting: false,
        error: message,
      }));
    }
  };

  // Handle account changes in MetaMask
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        setSigner(null);

        setWallet({
          address: null,
          chainId: null,
          balance: '0.00',
          isConnected: false,
          isConnecting: false,
          error: null,
        });

        return;
      }

      const address = accounts[0];

      try {
        const browserProvider = new BrowserProvider(window.ethereum);
        const web3Signer = await browserProvider.getSigner();
        const network = await browserProvider.getNetwork();
        const rawBalance = await browserProvider.getBalance(address);

        setProvider(browserProvider);
        setSigner(web3Signer);

        setWallet({
          address,
          chainId: Number(network.chainId),
          balance: parseFloat(
            ethers.formatEther(rawBalance)
          ).toFixed(4),
          isConnected: true,
          isConnecting: false,
          error: null,
        });
      } catch (err) {
        console.error('Failed to update wallet account:', err);
      }
    };

    const handleChainChanged = () => {
      // Reloading is the safest approach when changing networks
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener(
        'accountsChanged',
        handleAccountsChanged
      );

      window.ethereum.removeListener(
        'chainChanged',
        handleChainChanged
      );
    };
  }, []);

  return {
    wallet,
    provider,
    signer,
    connectWallet,
  };
};


