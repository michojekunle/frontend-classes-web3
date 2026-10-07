// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PredictionMarketOracleHub
 * @notice Real-time Prediction Market with Oracle Resolution & Automated Payout Pool.
 * Demonstrates: Ether betting pools, proportional payout math, oracle signatures/resolutions, events, error handling.
 */
contract PredictionMarketOracleHub is ReentrancyGuard, Ownable {
    enum Outcome { PENDING, YES, NO, CANCELED }

    struct Market {
        uint256 id;
        string title;
        string category;
        uint256 endTime;
        Outcome outcome;
        uint256 totalYesPool;
        uint256 totalNoPool;
        bool resolved;
    }

    struct UserBet {
        uint256 yesAmount;
        uint256 noAmount;
        bool claimed;
    }

    uint256 public nextMarketId;
    mapping(uint256 => Market) public markets;
    // marketId => userAddress => UserBet
    mapping(uint256 => mapping(address => UserBet)) public userBets;

    event MarketCreated(uint256 indexed marketId, string title, string category, uint256 endTime);
    event BetPlaced(uint256 indexed marketId, address indexed user, bool isYes, uint256 amount);
    event MarketResolved(uint256 indexed marketId, Outcome outcome);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);

    constructor() Ownable(msg.sender) {}

    function createMarket(string memory _title, string memory _category, uint256 _durationSeconds) external onlyOwner returns (uint256) {
        require(_durationSeconds > 0, "Duration must be > 0");

        uint256 marketId = nextMarketId++;
        markets[marketId] = Market({
            id: marketId,
            title: _title,
            category: _category,
            endTime: block.timestamp + _durationSeconds,
            outcome: Outcome.PENDING,
            totalYesPool: 0,
            totalNoPool: 0,
            resolved: false
        });

        emit MarketCreated(marketId, _title, _category, block.timestamp + _durationSeconds);
        return marketId;
    }

    function placeBet(uint256 _marketId, bool _isYes) external payable nonReentrant {
        Market storage market = markets[_marketId];
        require(block.timestamp < market.endTime, "Market betting has closed");
        require(!market.resolved, "Market already resolved");
        require(msg.value > 0, "Bet amount must be > 0");

        UserBet storage bet = userBets[_marketId][msg.sender];

        if (_isYes) {
            market.totalYesPool += msg.value;
            bet.yesAmount += msg.value;
        } else {
            market.totalNoPool += msg.value;
            bet.noAmount += msg.value;
        }

        emit BetPlaced(_marketId, msg.sender, _isYes, msg.value);
    }

    function resolveMarket(uint256 _marketId, Outcome _outcome) external onlyOwner {
        Market storage market = markets[_marketId];
        require(block.timestamp >= market.endTime, "Market betting has not ended yet");
        require(!market.resolved, "Market already resolved");
        require(_outcome == Outcome.YES || _outcome == Outcome.NO || _outcome == Outcome.CANCELED, "Invalid outcome");

        market.outcome = _outcome;
        market.resolved = true;

        emit MarketResolved(_marketId, _outcome);
    }

    function calculateWinnings(uint256 _marketId, address _user) public view returns (uint256) {
        Market storage market = markets[_marketId];
        if (!market.resolved) return 0;

        UserBet storage bet = userBets[_marketId][_user];
        if (bet.claimed) return 0;

        if (market.outcome == Outcome.CANCELED) {
            return bet.yesAmount + bet.noAmount;
        }

        uint256 totalPool = market.totalYesPool + market.totalNoPool;

        if (market.outcome == Outcome.YES) {
            if (market.totalYesPool == 0) return 0;
            return (bet.yesAmount * totalPool) / market.totalYesPool;
        } else if (market.outcome == Outcome.NO) {
            if (market.totalNoPool == 0) return 0;
            return (bet.noAmount * totalPool) / market.totalNoPool;
        }

        return 0;
    }

    function claimWinnings(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.resolved, "Market not resolved yet");

        UserBet storage bet = userBets[_marketId][msg.sender];
        require(!bet.claimed, "Winnings already claimed");

        uint256 payout = calculateWinnings(_marketId, msg.sender);
        require(payout > 0, "No payout available");

        bet.claimed = true;

        (bool success, ) = payable(msg.sender).call{value: payout}("");
        require(success, "Transfer failed");

        emit WinningsClaimed(_marketId, msg.sender, payout);
    }

    function getAllMarkets() external view returns (Market[] memory) {
        Market[] memory all = new Market[](nextMarketId);
        for (uint256 i = 0; i < nextMarketId; i++) {
            all[i] = markets[i];
        }
        return all;
    }
}
