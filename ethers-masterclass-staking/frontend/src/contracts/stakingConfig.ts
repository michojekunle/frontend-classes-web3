// MultiTokenStakingVault ABI & Addresses
export const VAULT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const REWARD_TOKEN_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
export const STAKING_TOKEN_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

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
  "event RewardClaimed(address indexed user, uint256 indexed poolId, uint256 amount)"
];

export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function faucet(uint256 amount)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];
