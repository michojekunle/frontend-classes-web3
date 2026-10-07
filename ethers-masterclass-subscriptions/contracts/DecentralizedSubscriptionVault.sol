// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DecentralizedSubscriptionVault
 * @notice Real-world SaaS & Web3 Payroll streaming recurrent payment vault.
 * Allows subscribers to authorize automated stream deposits that service providers can execute at fixed intervals.
 */
contract DecentralizedSubscriptionVault is ReentrancyGuard, Ownable {
    struct Plan {
        uint256 id;
        address merchant;
        string name;
        uint256 amountPerInterval;
        uint256 intervalSeconds; // e.g. 2592000 for 30 days
        bool active;
    }

    struct Subscription {
        uint256 planId;
        address subscriber;
        uint256 lastChargedTimestamp;
        uint256 nextChargeTimestamp;
        bool active;
    }

    uint256 public nextPlanId;
    mapping(uint256 => Plan) public plans;
    // planId => subscriberAddress => Subscription
    mapping(uint256 => mapping(address => Subscription)) public subscriptions;

    event PlanCreated(uint256 indexed planId, address indexed merchant, string name, uint256 amount, uint256 interval);
    event Subscribed(uint256 indexed planId, address indexed subscriber, uint256 nextCharge);
    event SubscriptionCancelled(uint256 indexed planId, address indexed subscriber);
    event PaymentExecuted(uint256 indexed planId, address indexed subscriber, address indexed merchant, uint256 amount);

    constructor() Ownable(msg.sender) {}

    function createPlan(string memory _name, uint256 _amountPerInterval, uint256 _intervalSeconds) external returns (uint256) {
        require(_amountPerInterval > 0, "Amount must be > 0");
        require(_intervalSeconds > 0, "Interval must be > 0");

        uint256 planId = nextPlanId++;
        plans[planId] = Plan({
            id: planId,
            merchant: msg.sender,
            name: _name,
            amountPerInterval: _amountPerInterval,
            intervalSeconds: _intervalSeconds,
            active: true
        });

        emit PlanCreated(planId, msg.sender, _name, _amountPerInterval, _intervalSeconds);
        return planId;
    }

    function subscribe(uint256 _planId) external payable nonReentrant {
        Plan storage plan = plans[_planId];
        require(plan.active, "Plan not active");
        require(msg.value == plan.amountPerInterval, "Incorrect initial ETH payment");

        Subscription storage sub = subscriptions[_planId][msg.sender];
        sub.planId = _planId;
        sub.subscriber = msg.sender;
        sub.lastChargedTimestamp = block.timestamp;
        sub.nextChargeTimestamp = block.timestamp + plan.intervalSeconds;
        sub.active = true;

        // Transfer initial payment to merchant
        (bool success, ) = payable(plan.merchant).call{value: msg.value}("");
        require(success, "ETH transfer failed");

        emit Subscribed(_planId, msg.sender, sub.nextChargeTimestamp);
        emit PaymentExecuted(_planId, msg.sender, plan.merchant, msg.value);
    }

    function executeRecurrentCharge(uint256 _planId, address _subscriber) external payable nonReentrant {
        Plan storage plan = plans[_planId];
        Subscription storage sub = subscriptions[_planId][_subscriber];

        require(sub.active, "Subscription not active");
        require(block.timestamp >= sub.nextChargeTimestamp, "Payment not due yet");
        require(msg.value == plan.amountPerInterval, "Incorrect ETH charge amount");

        sub.lastChargedTimestamp = block.timestamp;
        sub.nextChargeTimestamp = block.timestamp + plan.intervalSeconds;

        (bool success, ) = payable(plan.merchant).call{value: msg.value}("");
        require(success, "Payment transfer failed");

        emit PaymentExecuted(_planId, _subscriber, plan.merchant, msg.value);
    }

    function cancelSubscription(uint256 _planId) external {
        Subscription storage sub = subscriptions[_planId][msg.sender];
        require(sub.active, "Subscription not active");
        sub.active = false;

        emit SubscriptionCancelled(_planId, msg.sender);
    }

    function getAllPlans() external view returns (Plan[] memory) {
        Plan[] memory allPlans = new Plan[](nextPlanId);
        for (uint256 i = 0; i < nextPlanId; i++) {
            allPlans[i] = plans[i];
        }
        return allPlans;
    }
}
