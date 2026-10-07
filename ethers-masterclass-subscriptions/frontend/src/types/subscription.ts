// Types for Subscription Stream Vault dApp

export interface SubscriptionPlan {
  id: number;
  merchant: string;
  name: string;
  amountPerInterval: string;
  intervalSeconds: number;
  active: boolean;
  userIsSubscribed?: boolean;
  nextChargeTimestamp?: number;
}

export interface SubscriptionEventLog {
  id: string;
  type: 'PlanCreated' | 'Subscribed' | 'PaymentExecuted' | 'SubscriptionCancelled';
  planId: number;
  subscriber?: string;
  merchant?: string;
  amount?: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: string;
}
