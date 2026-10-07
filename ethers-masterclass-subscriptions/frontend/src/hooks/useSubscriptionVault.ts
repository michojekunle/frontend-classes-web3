import { useState, useEffect } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseAbi } from "viem";
import {
  Contract,
  JsonRpcProvider,
  formatEther,
  parseEther,
  type Result,
} from "ethers";
import {
  SUBSCRIPTION_VAULT_ADDRESS,
  SUBSCRIPTION_VAULT_ABI,
} from "../contracts/subscriptionConfig";
import { SubscriptionPlan, SubscriptionEventLog } from "../types/subscription";

const contractAddress = SUBSCRIPTION_VAULT_ADDRESS;
const contractAbi = parseAbi(SUBSCRIPTION_VAULT_ABI);
const chainId = 11155111;
const provider = new JsonRpcProvider(
  "https://ethereum-sepolia-rpc.publicnode.com",
);

const contract = new Contract(
  contractAddress,
  SUBSCRIPTION_VAULT_ABI,
  provider,
);

export const useSubscriptionVault = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [events, setEvents] = useState<SubscriptionEventLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Wagmi Hook for initiating contract write transactions
  const { writeContractAsync } = useWriteContract();
  const { address } = useAccount();

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
  // - Listen to the vault contract on Sepolia with Ethers.js.
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
    if (!contract || !address) return;

    const currentAddress = address.toLowerCase();

    const handleSubscribed = (
      planId: bigint,
      subscriber: string,
      nextCharge: bigint,
      event: any,
    ) => {
      setEvents((prev) => [
        {
          id: `${event.log.transactionHash}-${event.log.index}`,
          type: "Subscribed",
          planId: Number(planId),
          subscriber,
          blockNumber: event.log.blockNumber,
          transactionHash: event.log.transactionHash,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);

      if (subscriber.toLowerCase() === currentAddress) {
        setPlans((prev) =>
          prev.map((p) =>
            p.id === Number(planId)
              ? {
                  ...p,
                  userIsSubscribed: true,
                  nextChargeTimestamp: Number(nextCharge),
                }
              : p,
          ),
        );
      }
    };

    const handleCancelled = (
      planId: bigint,
      subscriber: string,
      event: any,
    ) => {
      setEvents((prev) => [
        {
          id: `${event.log.transactionHash}-${event.log.index}`,
          type: "SubscriptionCancelled",
          planId: Number(planId),
          subscriber,
          blockNumber: event.log.blockNumber,
          transactionHash: event.log.transactionHash,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);

      if (subscriber.toLowerCase() === currentAddress) {
        setPlans((prev) =>
          prev.map((p) =>
            p.id === Number(planId)
              ? {
                  ...p,
                  userIsSubscribed: false,
                  nextChargeTimestamp: undefined,
                }
              : p,
          ),
        );
      }
    };

    const handlePayment = async (
      planId: bigint,
      subscriber: string,
      merchant: string,
      amount: bigint,
      event: any,
    ) => {
      setEvents((prev) => [
        {
          id: `${event.log.transactionHash}-${event.log.index}`,
          type: "PaymentExecuted",
          planId: Number(planId),
          subscriber,
          merchant,
          amount: formatEther(amount),
          blockNumber: event.log.blockNumber,
          transactionHash: event.log.transactionHash,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);

      if (subscriber.toLowerCase() === currentAddress) {
        try {
          const sub = await contract.subscriptions(planId, subscriber);
          setPlans((prev) =>
            prev.map((p) =>
              p.id === Number(planId)
                ? {
                    ...p,
                    userIsSubscribed: sub.active,
                    nextChargeTimestamp: sub.active
                      ? Number(sub.nextChargeTimestamp)
                      : undefined,
                  }
                : p,
            ),
          );
        } catch (err) {
          setError(String(err));
        }
      }
    };

    contract.on("Subscribed", handleSubscribed);
    contract.on("SubscriptionCancelled", handleCancelled);
    contract.on("PaymentExecuted", handlePayment);

    return () => {
      contract.off("Subscribed", handleSubscribed);
      contract.off("SubscriptionCancelled", handleCancelled);
      contract.off("PaymentExecuted", handlePayment);
    };
  }, [contract, address]);

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
    try {
      setIsLoading(true);
      setError(null);

      const plansFromContract: Result = await contract.getAllPlans();
      const formattedPlans = plansFromContract.map((plan) => ({
        id: Number(plan.id),
        merchant: plan.merchant,
        name: plan.name,
        amountPerInterval: formatEther(plan.amountPerInterval),
        intervalSeconds: Number(plan.intervalSeconds),
        active: plan.active,
      }));

      setPlans(formattedPlans);
    } catch (error) {
      setError(String(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

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
    try {
      setIsLoading(true);
      setError(null);

      const tx = await writeContractAsync({
        address: contractAddress,
        abi: contractAbi,
        chainId,
        functionName: "subscribe",
        args: [BigInt(_planId)],
        value: parseEther(_amountEth),
      });

      setPlans((prev) =>
        prev.map((plan) =>
          plan.id === _planId
            ? {
                ...plan,
                userIsSubscribed: true,
                nextChargeTimestamp:
                  Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
              }
            : plan,
        ),
      );

      const receipt = await provider.waitForTransaction(tx);
      if (!receipt || receipt.status !== 1)
        throw new Error("Transaction reverted");
    } catch (error) {
      setError(String(error));

      setPlans((prev) =>
        prev.map((plan) =>
          plan.id === _planId
            ? {
                ...plan,
                userIsSubscribed: false,
                nextChargeTimestamp: undefined,
              }
            : plan,
        ),
      );
    } finally {
      setIsLoading(false);
    }
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
    try {
      const tx = await writeContractAsync({
        address: contractAddress,
        abi: contractAbi,
        chainId,
        functionName: "cancelSubscription",
        args: [BigInt(_planId)],
      });

      setPlans((prev) =>
        prev.map((plan) =>
          plan.id === _planId
            ? {
                ...plan,
                userIsSubscribed: false,
                nextChargeTimestamp: undefined,
              }
            : plan,
        ),
      );

      const receipt = await provider.waitForTransaction(tx);
      if (!receipt || receipt.status !== 1)
        throw new Error("Transaction reverted");
    } catch (error) {
      setError(String(error));
      setPlans((prev) =>
        prev.map((plan) =>
          plan.id === _planId
            ? {
                ...plan,
                userIsSubscribed: false,
                nextChargeTimestamp: undefined,
              }
            : plan,
        ),
      );
    } finally {
      setIsLoading(false);
    }
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
