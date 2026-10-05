import { useState, useEffect } from 'react';
import { ethers, BrowserProvider, JsonRpcProvider } from 'ethers';
import { PredictionMarketData, WalletState } from '../types/prediction';

// Replace with your actual RPC URL (e.g., Infura, Alchemy, or a local Hardhat node)
const PROVIDER_URL = "https://alchemy.com";

export const useWeb3Wallet = () => {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    chainId: null,
    balance: '0.00',
    isConnected: false,
    isConnecting: false,
    error: null,
  });

    // 1. Detect window.ethereum
  // 2. Connect via ethers.BrowserProvider
  // 3. Keep track of address, network chainId, and ETH balance

  const [provider, setProvider] = useState<BrowserProvider | JsonRpcProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);


  useEffect(() => {
    if (typeof window !== 'undefined' && (window.ethereum)) {
      const browserProvider = new BrowserProvider((window as any).ethereum);
      setProvider(provider);
    } else {
      console.log("Web3 wallet not detected; using read-only dummy RPC provider");
      const dummyProvider = new JsonRpcProvider(PROVIDER_URL);
      setProvider(provider);
    }
  }, []);

    const connectWallet = async () => {

    const provider = new ethers.BrowserProvider(window.ethereum);

    console.log("Wallet Connected", provider);
    if (!provider || !(provider instanceof BrowserProvider)) {
      setWallet(prev => ({ ...prev, error: "No crypto wallet detected. Please install MetaMask." }));
      return;
    }



    setWallet(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // 1. Request account access
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      // 2. Get signer, network, and balance
      const web3Signer = await provider.getSigner();
      const network = await provider.getNetwork();
      const rawBalance = await provider.getBalance(address);
      const balance = ethers.formatEther(rawBalance);

      setSigner(web3Signer);
      setWallet({
        address,
        chainId: Number(network.chainId),
        balance: parseFloat(balance).toFixed(4),
        isConnected: true,
        isConnecting: false,
        error: null,
      });
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
      setWallet(prev => ({
        ...prev,
        isConnecting: false,
        error: err.message || "Failed to connect wallet",
      }));
    }
  };

  return { wallet, provider, signer, connectWallet };
};




export const usePredictionMarket = (walletAddress: string | null) => {
  // Remaining code left intact for your contract assignment tasks
  const markets: PredictionMarketData[] = [];
  const isLoading = false;
  const error = null;

  const placeBet = async (marketId: number, isYes: boolean, amountEth: string) => {
    console.log('Assignment TODO: Execute placeBet transaction with msg.value');
  };

  const claimWinnings = async (marketId: number) => {
    console.log('Assignment TODO: Call claimWinnings and update UI state');
  };

  const createMarket = async (title: string, category: string, durationSeconds: number) => {
    console.log('Assignment TODO: Call createMarket contract function');
  };

  return { markets, isLoading, error, placeBet, claimWinnings, createMarket };
};

