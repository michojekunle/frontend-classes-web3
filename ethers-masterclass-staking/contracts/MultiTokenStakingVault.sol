// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MultiTokenStakingVault
 * @notice Allows users to stake ERC20 tokens or native ETH to earn reward tokens over time.
 * Demonstrates: Ether transfers, ERC20 approvals/transfers, compound rewards, events, and complex views.
 */
contract MultiTokenStakingVault is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct PoolInfo {
        IERC20 stakingToken; // Address of token (address(0) for native ETH)
        uint256 rewardRatePerSecond; // Reward tokens distributed per second
        uint256 lastRewardTime; // Last time reward variables were updated
        uint256 accRewardPerShare; // Accumulated rewards per share, scaled by 1e12
        uint256 totalStaked; // Total amount staked in this pool
        bool isEthPool; // Flag to identify native ETH pool
    }

    struct UserInfo {
        uint256 amount; // Staked amount
        uint256 rewardDebt; // Reward debt for precision accounting
        uint256 pendingRewards; // Unclaimed accumulated rewards
    }

    IERC20 public immutable rewardToken;

    PoolInfo[] public poolInfo;
    // poolId => user => UserInfo
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    // Events for Ethers.js Event Listening
    event PoolAdded(uint256 indexed poolId, address indexed stakingToken, uint256 rewardRatePerSecond, bool isEthPool);
    event Staked(address indexed user, uint256 indexed poolId, uint256 amount);
    event Withdrawn(address indexed user, uint256 indexed poolId, uint256 amount);
    event RewardClaimed(address indexed user, uint256 indexed poolId, uint256 amount);
    event EmergencyWithdrawn(address indexed user, uint256 indexed poolId, uint256 amount);

    constructor(address _rewardToken) Ownable(msg.sender) {
        require(_rewardToken != address(0), "Invalid reward token");
        rewardToken = IERC20(_rewardToken);
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    function addPool(address _stakingToken, uint256 _rewardRatePerSecond, bool _isEthPool) external onlyOwner {
        if (!_isEthPool) {
            require(_stakingToken != address(0), "Invalid token address");
        }
        poolInfo.push(
            PoolInfo({
                stakingToken: IERC20(_stakingToken),
                rewardRatePerSecond: _rewardRatePerSecond,
                lastRewardTime: block.timestamp,
                accRewardPerShare: 0,
                totalStaked: 0,
                isEthPool: _isEthPool
            })
        );

        emit PoolAdded(poolInfo.length - 1, _stakingToken, _rewardRatePerSecond, _isEthPool);
    }

    function updatePool(uint256 _poolId) public {
        PoolInfo storage pool = poolInfo[_poolId];
        if (block.timestamp <= pool.lastRewardTime) {
            return;
        }

        if (pool.totalStaked == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }

        uint256 multiplier = block.timestamp - pool.lastRewardTime;
        uint256 reward = multiplier * pool.rewardRatePerSecond;

        pool.accRewardPerShare += (reward * 1e12) / pool.totalStaked;
        pool.lastRewardTime = block.timestamp;
    }

    function pendingReward(uint256 _poolId, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_poolId];
        UserInfo storage user = userInfo[_poolId][_user];
        uint256 accRewardPerShare = pool.accRewardPerShare;
        uint256 totalStaked = pool.totalStaked;

        if (block.timestamp > pool.lastRewardTime && totalStaked != 0) {
            uint256 multiplier = block.timestamp - pool.lastRewardTime;
            uint256 reward = multiplier * pool.rewardRatePerSecond;
            accRewardPerShare += (reward * 1e12) / totalStaked;
        }

        return user.pendingRewards + ((user.amount * accRewardPerShare) / 1e12) - user.rewardDebt;
    }

    function stake(uint256 _poolId, uint256 _amount) external payable nonReentrant {
        PoolInfo storage pool = poolInfo[_poolId];
        UserInfo storage user = userInfo[_poolId][msg.sender];

        updatePool(_poolId);

        if (user.amount > 0) {
            uint256 pending = ((user.amount * pool.accRewardPerShare) / 1e12) - user.rewardDebt;
            user.pendingRewards += pending;
        }

        if (pool.isEthPool) {
            require(msg.value > 0, "Must stake > 0 ETH");
            _amount = msg.value;
        } else {
            require(_amount > 0, "Must stake > 0 tokens");
            pool.stakingToken.safeTransferFrom(msg.sender, address(this), _amount);
        }

        user.amount += _amount;
        pool.totalStaked += _amount;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e12;

        emit Staked(msg.sender, _poolId, _amount);
    }

    function withdraw(uint256 _poolId, uint256 _amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[_poolId];
        UserInfo storage user = userInfo[_poolId][msg.sender];
        require(user.amount >= _amount, "Withdraw amount exceeds balance");

        updatePool(_poolId);

        uint256 pending = ((user.amount * pool.accRewardPerShare) / 1e12) - user.rewardDebt;
        user.pendingRewards += pending;

        user.amount -= _amount;
        pool.totalStaked -= _amount;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e12;

        if (pool.isEthPool) {
            (bool success, ) = payable(msg.sender).call{value: _amount}("");
            require(success, "ETH transfer failed");
        } else {
            pool.stakingToken.safeTransfer(msg.sender, _amount);
        }

        emit Withdrawn(msg.sender, _poolId, _amount);
    }

    function claimReward(uint256 _poolId) external nonReentrant {
        PoolInfo storage pool = poolInfo[_poolId];
        UserInfo storage user = userInfo[_poolId][msg.sender];

        updatePool(_poolId);

        uint256 pending = user.pendingRewards + ((user.amount * pool.accRewardPerShare) / 1e12) - user.rewardDebt;
        require(pending > 0, "No rewards to claim");

        user.pendingRewards = 0;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e12;

        rewardToken.safeTransfer(msg.sender, pending);

        emit RewardClaimed(msg.sender, _poolId, pending);
    }

    // Fund reward pool
    function fundRewardPool(uint256 _amount) external onlyOwner {
        rewardToken.safeTransferFrom(msg.sender, address(this), _amount);
    }
}
