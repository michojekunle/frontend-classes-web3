import { useState, useEffect } from 'react';
import { useWriteContract } from 'wagmi';
import { Contract, JsonRpcProvider, formatUnits, parseEther } from 'ethers';
import { SUBSCRIPTION_VAULT_ADDRESS, SUBSCRIPTION_VAULT_ABI } from '../contracts/subscriptionConfig';
import { SubscriptionPlan, SubscriptionEventLog } from '../types/subscription';

const SEPOLIA_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';

export const useSubscriptionVault = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [events, setEvents] = useState<SubscriptionEventLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Wagmi Hook for initiating contract write transactions
  const { writeContractAsync } = useWriteContract();

  // Reference markers to satisfy compiler checks until students implement their solutions
  void setPlans;
  void setEvents;
  void setIsLoading;
  void setError;
  void writeContractAsync;
  void parseEther;
  void Contract;
  void JsonRpcProvider;
  void formatUnits;
  void SUBSCRIPTION_VAULT_ADDRESS;
  void SUBSCRIPTION_VAULT_ABI;
  void SEPOLIA_RPC_URL;

  // =========================================================================
  // ⚡ CRITICAL ASSESSMENT RULE: EVENT-DRIVEN & OPTIMISTIC UI UPDATES
  // =========================================================================
  // ⚠️ DO NOT refetch all plans from the blockchain upon every transaction confirmation!
  // Refetching all plans over JSON-RPC is an expensive, slow, and wasteful anti-pattern.
  //
  // INSTEAD:
  // 1. Fetch all plans ONCE on initial page mount.
  // 2. Use real-time smart contract EVENT LISTENERS and/or OPTIMISTIC UPDATES
  //    to update ONLY the specific plan and event log concerned when a transaction confirms.
  // =========================================================================

  // =========================================================================
  // 🎯 EXERCISE 1: Real-time Event Subscription (Ethers.js v6)
  // =========================================================================
  // Objective:
  // - Establish an Ethers.js provider and contract instance connected to Sepolia.
  // - Listen for real-time events emitted by the vault contract:
  //     • `PaymentExecuted(planId, subscriber, merchant, amount)`
  //     • `Subscribed(planId, subscriber, nextCharge)`
  //     • `SubscriptionCancelled(planId, subscriber)`
  // - When an event fires, use the event payload to:
  //     a) Append/prepend to the `events` feed.
  //     b) Optimistically update the targeted plan's state in `plans` WITHOUT
  //        re-querying the whole contract!
  // - Ensure proper listener teardown when the component unmounts.
  // =========================================================================
  useEffect(() => {
    // TODO: Write your real-time event listener implementation here
  }, []);

  // =========================================================================
  // 🎯 EXERCISE 2: Read On-Chain Subscription Plans (Initial Load Only)
  // =========================================================================
  // Objective:
  // - Query the vault contract on initial mount to retrieve all registered subscription plans.
  // - Parse and format the returned blockchain data into the SubscriptionPlan interface.
  // - Store the resulting array in the `plans` state.
  // - Manage `isLoading` and `error` states gracefully.
  // =========================================================================
  const fetchPlans = async () => {
    // TODO: Write your initial contract query implementation here
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // =========================================================================
  // 🎯 EXERCISE 3: Subscribe to a Plan (Wagmi + AppKit)
  // =========================================================================
  // Objective:
  // - Prompt the connected wallet to execute the payable `subscribe` function on the vault.
  // - Pass the selected plan ID and forward the required cycle fee in ETH.
  // - ⚠️ DO NOT call fetchPlans() here! Rely on your event listener or apply an
  //   optimistic update to update the specific plan state immediately.
  // - Catch and propagate user rejection or execution errors.
  // =========================================================================
  const subscribeToPlan = async (_planId: number, _amountEth: string) => {
    // TODO: Write your transaction submission implementation here
  };

  // =========================================================================
  // 🎯 EXERCISE 4: Cancel a Subscription (Wagmi + AppKit)
  // =========================================================================
  // Objective:
  // - Prompt the connected wallet to execute `cancelSubscription` on the vault.
  // - Pass the target plan ID.
  // - ⚠️ DO NOT call fetchPlans() here! Rely on your event listener or apply an
  //   optimistic update to update the specific plan state immediately.
  // - Catch and handle any errors.
  // =========================================================================
  const cancelSubscription = async (_planId: number) => {
    // TODO: Write your transaction cancellation implementation here
  };

  return {
    plans,
    events,
    isLoading,
    error,
    subscribeToPlan,
    cancelSubscription,
    refetchPlans: fetchPlans,
  };
};
