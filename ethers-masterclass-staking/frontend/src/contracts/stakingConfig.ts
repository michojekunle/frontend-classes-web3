import { erc20abi, multicallabi } from "../constants";

// MultiTokenStakingVault ABI & Addresses
export const VAULT_ADDRESS = "0xD70114727F841ec6288D33089Ccb77EbCe669534";
export const REWARD_TOKEN_ADDRESS =
  "0xEfF517687753FFEc4b0536a735a06FD9EB1094b3";
export const STAKING_TOKEN_ADDRESS =
  "0x16C3097dbBb1e7B7De760AF1048AbBd3c23B57fD";
export const MULTICALL2_ADDRESS = "0xBE575090EA0706FD4785a483120A8A8654005178";

export const VAULT_ABI = [
  "function poolLength() view returns (uint256)",
  "function poolInfo(uint256) view returns (address stakingToken, uint256 rewardRatePerSecond, uint256 lastRewardTime, uint256 accRewardPerShare, uint256 totalStaked, bool isEthPool)",
  "function userInfo(uint256, address) view returns (uint256 amount, uint256 rewardDebt, uint256 pendingRewards)",
  "function pendingReward(uint256 _poolId, address _user) view returns (uint256)",
  "function stake(uint256 _poolId, uint256 _amount) payable",
  "function withdraw(uint256 _poolId, uint256 _amount)",
  "function claimReward(uint256 _poolId)",
  "event PoolAdded(uint256 indexed poolId, address indexed stakingToken, uint256 rewardRatePerSecond, bool isEthPool)",
  "event Staked(address indexed user, uint256 indexed poolId, uint256 amount)",
  "event Withdrawn(address indexed user, uint256 indexed poolId, uint256 amount)",
  "event RewardClaimed(address indexed user, uint256 indexed poolId, uint256 amount)",
];

export const CONTRACTS = {
  vault: {
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
  },
  stk: {
    address: STAKING_TOKEN_ADDRESS,
    abi: [...erc20abi, "function faucet(uint256 amount)"],
  },
  mgo: {
    address: REWARD_TOKEN_ADDRESS,
    abi: erc20abi,
  },
  multicall2: {
    address: MULTICALL2_ADDRESS,
    abi: multicallabi,
  },
};
