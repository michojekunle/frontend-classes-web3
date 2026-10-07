// DecentralizedSubscriptionVault ABI & Addresses
export const SUBSCRIPTION_VAULT_ADDRESS = "0x683C2a1cd368803361A63ABc342AB35690D2B3dB";

export const SUBSCRIPTION_VAULT_ABI = [
  "function nextPlanId() view returns (uint256)",
  "function plans(uint256) view returns (uint256 id, address merchant, string name, uint256 amountPerInterval, uint256 intervalSeconds, bool active)",
  "function subscriptions(uint256, address) view returns (uint256 planId, address subscriber, uint256 lastChargedTimestamp, uint256 nextChargeTimestamp, bool active)",
  "function getAllPlans() view returns ((uint256 id, address merchant, string name, uint256 amountPerInterval, uint256 intervalSeconds, bool active)[])",
  "function createPlan(string _name, uint256 _amountPerInterval, uint256 _intervalSeconds) returns (uint256)",
  "function subscribe(uint256 _planId) payable",
  "function executeRecurrentCharge(uint256 _planId, address _subscriber) payable",
  "function cancelSubscription(uint256 _planId)",
  "event PlanCreated(uint256 indexed planId, address indexed merchant, string name, uint256 amount, uint256 interval)",
  "event Subscribed(uint256 indexed planId, address indexed subscriber, uint256 nextCharge)",
  "event SubscriptionCancelled(uint256 indexed planId, address indexed subscriber)",
  "event PaymentExecuted(uint256 indexed planId, address indexed subscriber, address indexed merchant, uint256 amount)"
] as const;
