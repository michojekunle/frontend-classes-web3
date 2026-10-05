// Types for Ethers.js Prediction Market dApp

export enum MarketOutcome {
  PENDING = 0,
  YES = 1,
  NO = 2,
  CANCELED = 3
}

export const EIP6963AnnounceProvider = "eip6963:announceProvider";
export const EIP6963RequestProvider = "eip6963:requestProvider";
export const rpc_url = "https://ethereum-sepolia-rpc.publicnode.com";

export type SupportedChain = {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl: string;
  blockExplorer: string;
};

export const SUPPORTED_CHAINS: Record<number, SupportedChain> = {
  11155111: {
    id: 11155111,
    name: "Sepolia",
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    blockExplorer: "https://sepolia.etherscan.io",
  },
};


export interface PredictionMarketData {
  id: number;
  title: string;
  category: string;
  endTime: number;
  outcome: MarketOutcome;
  totalYesPool: string;
  totalNoPool: string;
  resolved: boolean;
  userYesBet: string;
  userNoBet: string;
  userClaimed: boolean;
  userEstimatedWinnings: string;
  isExpired: boolean;
}

export interface WalletState {
  address: string | null;
  chainId: number | null;
  balance: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export interface PredictionEventLog {
  id: string;
  type: 'MarketCreated' | 'BetPlaced' | 'MarketResolved' | 'WinningsClaimed';
  marketId: number;
  user?: string;
  amount?: string;
  outcome?: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: string;
}

//  struct PredictionMarketOracleHub.Market: {
//       id (uint256) : 0
//       title (string) : Will ETH reach $4,500 by end of quarter?
//       category (string) : Crypto & DeFi
//       endTime (uint256) : 1790955120
//       outcome (uint8) : 0
//       totalYesPool (uint256) : 0
//       totalNoPool (uint256) : 0
//       resolved (bool) : false
//     }

