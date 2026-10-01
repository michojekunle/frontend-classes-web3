// Types for Ethers.js Staking Vault dApp

export interface NetworkInfo {
  chainId: number;
  name: string;
  isSupported: boolean;
}

export interface PoolData {
  poolId: number;
  stakingTokenAddress: string;
  rewardRatePerSecond: string;
  lastRewardTime: number;
  accRewardPerShare: string;
  totalStaked: string;
  isEthPool: boolean;
  tokenSymbol: string;
  tokenDecimals: number;
  userStakedAmount: string;
  userPendingReward: string;
  userAllowance: string;
  userTokenBalance: string;
}

export interface WalletState {
  address: string | null;
  chainId: number | null;
  balance:  string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export interface ContractError {
  code: string;
  reason: string;
  rawError: any;
}

export interface StakingEventLog {
  id: string;
  type: 'Staked' | 'Withdrawn' | 'RewardClaimed' | 'PoolAdded';
  user: string;
  poolId: number;
  amount: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: string;
}
