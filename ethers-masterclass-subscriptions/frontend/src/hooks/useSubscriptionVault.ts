import { useState, useEffect } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { Contract, JsonRpcProvider, formatUnits, parseEther } from "ethers";

import {
  SUBSCRIPTION_VAULT_ADDRESS,
  SUBSCRIPTION_VAULT_ABI,
  SUBSCRIPTION_VAULT_WAGMI_ABI,
} from "../contracts/subscriptionConfig";

import { SubscriptionPlan, SubscriptionEventLog } from "../types/subscription";

const SEPOLIA_RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";

const SEPOLIA_CHAIN_ID = 11155111;

export const useSubscriptionVault = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [events, setEvents] = useState<SubscriptionEventLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { address } = useAccount();

  const { writeContractAsync } = useWriteContract();

  // ============================================================
  // EXERCISE 1
  // Ethers.js REAL-TIME EVENT LISTENERS
  // ============================================================

  useEffect(() => {
    const provider = new JsonRpcProvider(SEPOLIA_RPC_URL);

    const vaultContract = new Contract(
      SUBSCRIPTION_VAULT_ADDRESS,
      SUBSCRIPTION_VAULT_ABI,
      provider,
    );

    const addEvent = async (
      type: SubscriptionEventLog["type"],
      planId: bigint,
      data: {
        subscriber?: string;
        merchant?: string;
        amount?: bigint;
      },
      event: any,
    ) => {
      try {
        const blockNumber = Number(event.log.blockNumber);

        const block = await provider.getBlock(blockNumber);

        const newEvent: SubscriptionEventLog = {
          id: `${event.transactionHash}-${
            event.index ?? event.logIndex ?? Date.now()
          }`,

          type,

          planId: Number(planId),

          subscriber: data.subscriber,

          merchant: data.merchant,

          amount:
            data.amount !== undefined
              ? formatUnits(data.amount, 18)
              : undefined,

          blockNumber,

          transactionHash: event.transactionHash,

          timestamp: block
            ? new Date(Number(block.timestamp) * 1000).toLocaleString()
            : new Date().toLocaleString(),
        };

        setEvents((previous) => {
          if (previous.some((item) => item.id === newEvent.id)) {
            return previous;
          }

          return [newEvent, ...previous].slice(0, 50);
        });
      } catch (err) {
        console.error("Failed to process contract event:", err);
      }
    };

    // ------------------------------------------------------------
    // PlanCreated
    // ------------------------------------------------------------

    const planCreatedListener = (
      planId: bigint,
      merchant: string,
      name: string,
      amount: bigint,
      interval: bigint,
      event: any,
    ) => {
      void addEvent(
        "PlanCreated",
        planId,
        {
          merchant,
          amount,
        },
        event,
      );

      setPlans((previous) => {
        if (previous.some((plan) => plan.id === Number(planId))) {
          return previous;
        }

        return [
          ...previous,
          {
            id: Number(planId),
            merchant,
            name,
            amountPerInterval: formatUnits(amount, 18),
            intervalSeconds: Number(interval),
            active: true,
          },
        ];
      });
    };

    // ------------------------------------------------------------
    // Subscribed
    // ------------------------------------------------------------

    const subscribedListener = (
      planId: bigint,
      subscriber: string,
      nextCharge: bigint,
      event: any,
    ) => {
      void addEvent(
        "Subscribed",
        planId,
        {
          subscriber,
        },
        event,
      );

      setPlans((previous) =>
        previous.map((plan) => {
          if (
            plan.id === Number(planId) &&
            address &&
            subscriber.toLowerCase() === address.toLowerCase()
          ) {
            return {
              ...plan,
              userIsSubscribed: true,
              nextChargeTimestamp: Number(nextCharge),
            };
          }

          return plan;
        }),
      );
    };

    // ------------------------------------------------------------
    // SubscriptionCancelled
    // ------------------------------------------------------------

    const cancelledListener = (
      planId: bigint,
      subscriber: string,
      event: any,
    ) => {
      void addEvent(
        "SubscriptionCancelled",
        planId,
        {
          subscriber,
        },
        event,
      );

      setPlans((previous) =>
        previous.map((plan) => {
          if (
            plan.id === Number(planId) &&
            address &&
            subscriber.toLowerCase() === address.toLowerCase()
          ) {
            return {
              ...plan,
              userIsSubscribed: false,
              nextChargeTimestamp: undefined,
            };
          }

          return plan;
        }),
      );
    };

    // ------------------------------------------------------------
    // PaymentExecuted
    // ------------------------------------------------------------

    const paymentListener = (
      planId: bigint,
      subscriber: string,
      merchant: string,
      amount: bigint,
      event: any,
    ) => {
      void addEvent(
        "PaymentExecuted",
        planId,
        {
          subscriber,
          merchant,
          amount,
        },
        event,
      );
    };

    // Register listeners

    vaultContract.on("PlanCreated", planCreatedListener);

    vaultContract.on("Subscribed", subscribedListener);

    vaultContract.on("SubscriptionCancelled", cancelledListener);

    vaultContract.on("PaymentExecuted", paymentListener);

    // Cleanup

    return () => {
      vaultContract.off("PlanCreated", planCreatedListener);

      vaultContract.off("Subscribed", subscribedListener);

      vaultContract.off("SubscriptionCancelled", cancelledListener);

      vaultContract.off("PaymentExecuted", paymentListener);

      void provider.destroy();
    };
  }, [address]);

  // ============================================================
  // EXERCISE 2
  // INITIAL PLAN FETCH
  // ============================================================

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const provider = new JsonRpcProvider(SEPOLIA_RPC_URL);

      const vaultContract = new Contract(
        SUBSCRIPTION_VAULT_ADDRESS,
        SUBSCRIPTION_VAULT_ABI,
        provider,
      );

      const allPlans = await vaultContract.getAllPlans();

      const formattedPlans: SubscriptionPlan[] = allPlans.map((plan: any) => ({
        id: Number(plan.id),

        merchant: plan.merchant,

        name: plan.name,

        amountPerInterval: formatUnits(plan.amountPerInterval, 18),

        intervalSeconds: Number(plan.intervalSeconds),

        active: plan.active,
      }));

      setPlans(formattedPlans);

      await provider.destroy();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch plans";

      setError(message);

      console.error("Failed to fetch subscription plans:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch plans once when component mounts

  useEffect(() => {
    void fetchPlans();
  }, []);

  // ============================================================
  // EXERCISE 3
  // SUBSCRIBE
  // ============================================================

  const subscribeToPlan = async (planId: number, amountEth: string) => {
    try {
      setError(null);

      await writeContractAsync({
        address: SUBSCRIPTION_VAULT_ADDRESS as `0x${string}`,

        abi: SUBSCRIPTION_VAULT_WAGMI_ABI,

        functionName: "subscribe",

        args: [BigInt(planId)],

        value: parseEther(amountEth),

        chainId: SEPOLIA_CHAIN_ID,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to subscribe to plan";

      setError(message);

      throw err;
    }
  };

  // ============================================================
  // EXERCISE 4
  // CANCEL SUBSCRIPTION
  // ============================================================

  const cancelSubscription = async (planId: number) => {
    try {
      setError(null);

      await writeContractAsync({
        address: SUBSCRIPTION_VAULT_ADDRESS as `0x${string}`,

        abi: SUBSCRIPTION_VAULT_WAGMI_ABI,

        functionName: "cancelSubscription",

        args: [BigInt(planId)],

        chainId: SEPOLIA_CHAIN_ID,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to cancel subscription";

      setError(message);

      throw err;
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
