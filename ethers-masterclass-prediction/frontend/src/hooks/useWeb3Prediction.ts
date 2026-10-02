import { WalletState } from '../types/prediction';

export const useWeb3Wallet = () => {
  // TODO FOR ASSIGNMENT:
  // 1. Detect window.ethereum
  // 2. Connect via ethers.BrowserProvider
  // 3. Keep track of address, network chainId, and ETH balance
  
  const wallet: WalletState = {
    address: null,
    chainId: null,
    balance: '0.00',
    isConnected: false,
    isConnecting: false,
    error: null,
  };

  const connectWallet = async () => {
    console.log('Assignment TODO: Connect wallet using ethers BrowserProvider');
  };

  return { wallet, connectWallet };
};

export const usePredictionMarket = (walletAddress: string | null) => {
  // TODO FOR ASSIGNMENT:
  // 1. Connect to PredictionMarketOracleHub contract using ethers.Contract
  // 2. Fetch all markets using getAllMarkets()
  // 3. For each market, read calculateWinnings() and userBets() for connected user
  // 4. Implement event listeners for MarketCreated, BetPlaced, MarketResolved, WinningsClaimed
  // 5. Implement placeBet(), claimWinnings(), and createMarket() (Owner mode)

  const markets = [];
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
