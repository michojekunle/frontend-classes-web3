// import { useEffect, useState } from 'react';
// import { useAccount, useReadContract, useWriteContract } from 'wagmi';
// import { Contract, JsonRpcProvider, formatUnits, parseEther } from 'ethers';
// import { SUBSCRIPTION_VAULT_ADDRESS, SUBSCRIPTION_VAULT_ABI } from '../contracts/subscriptionConfig';
// import { SubscriptionEventLog, SubscriptionPlan } from '../types/subscription';

// const SEPOLIA_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';

// type VaultPlanTuple = {
//   id: bigint;
//   merchant: `0x${string}`;
//   name: string;
//   amountPerInterval: bigint;
//   intervalSeconds: bigint;
//   active: boolean;
// };

// export const useSubscriptionVault = () => {
//   const { address, isConnected } = useAccount();

//   const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
//   const [events, setEvents] = useState<SubscriptionEventLog[]>([]);
//   const [isLoading, setIsLoading] = useState<boolean>(false);
//   const [error, setError] = useState<string | null>(null);

//   const { writeContractAsync } = useWriteContract();
//   const { data: plansData, isLoading: isPlansLoading, error: plansError, refetch } = useReadContract({
//     address: SUBSCRIPTION_VAULT_ADDRESS as `0x${string}`,
//     abi: SUBSCRIPTION_VAULT_ABI as any,
//     functionName: 'getAllPlans',
//   });

//   void setEvents;
//   void Contract;
//   void JsonRpcProvider;
//   void SEPOLIA_RPC_URL;

//   useEffect(() => {
//     setIsLoading(isPlansLoading);
//   }, [isPlansLoading]);

//   useEffect(() => {
//     if (plansError) {
//       setError(plansError.message);
//       return;
//     }

//     if (!plansData) {
//       setPlans([]);
//       setError(null);
//       return;
//     }

//     const nextPlans = (Array.isArray(plansData) ? plansData : []) as VaultPlanTuple[];

//     setPlans(
//       nextPlans.map((plan) => ({
//         id: Number(plan.id),
//         merchant: plan.merchant,
//         name: plan.name,
//         amountPerInterval: formatUnits(plan.amountPerInterval, 18),
//         intervalSeconds: Number(plan.intervalSeconds),
//         active: Boolean(plan.active),
//       })),
//     );
//     setError(null);
//   }, [plansData, plansError]);

//   const fetchPlans = async () => {
//     try {
//       setIsLoading(true);
//       await refetch();
//     } catch (readError) {
//       setError(readError instanceof Error ? readError.message : 'Failed to fetch subscription plans.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     void fetchPlans();
//   }, [address]);

//   const subscribeToPlan = async (_planId: number, _amountEth: string) => {
//     if (!isConnected || !address) {
//       setError('Connect your wallet before subscribing.');
//       return;
//     }

//     try {
//       setError(null);
//       await writeContractAsync({
//         address: SUBSCRIPTION_VAULT_ADDRESS as `0x${string}`,
//         abi: SUBSCRIPTION_VAULT_ABI as any,
//         functionName: 'subscribe',
//         args: [_planId],
//         value: parseEther(_amountEth),
//       });
//     } catch (submitError) {
//       setError(submitError instanceof Error ? submitError.message : 'Subscription failed.');
//     }
//   };

//   const cancelSubscription = async (_planId: number) => {
//     if (!isConnected || !address) {
//       setError('Connect your wallet before canceling a subscription.');
//       return;
//     }

//     try {
//       setError(null);
//       await writeContractAsync({
//         address: SUBSCRIPTION_VAULT_ADDRESS as `0x${string}`,
//         abi: SUBSCRIPTION_VAULT_ABI as any,
//         functionName: 'cancelSubscription',
//         args: [_planId],
//       });
//     } catch (cancelError) {
//       setError(cancelError instanceof Error ? cancelError.message : 'Cancellation failed.');
//     }
//   };

//   return {
//     plans,
//     events,
//     isLoading,
//     error,
//     subscribeToPlan,
//     cancelSubscription,
//     refetchPlans: fetchPlans,
//   };
// };



import { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { Contract, EventLog, JsonRpcProvider, formatUnits, parseEther } from 'ethers';
import { SUBSCRIPTION_VAULT_ADDRESS, SUBSCRIPTION_VAULT_ABI } from '../contracts/subscriptionConfig';
import { SubscriptionEventLog, SubscriptionPlan } from '../types/subscription';

const SEPOLIA_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';

type VaultPlanTuple = {
  id: bigint;
  merchant: `0x${string}`;
  name: string;
  amountPerInterval: bigint;
  intervalSeconds: bigint;
  active: boolean;
};

export const useSubscriptionVault = () => {
  const { address, isConnected } = useAccount();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [events, setEvents] = useState<SubscriptionEventLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();
  const {
    data: plansData,
    isLoading: isPlansLoading,
    error: plansError,
    refetch,
  } = useReadContract({
    address: SUBSCRIPTION_VAULT_ADDRESS as `0x${string}`,
    abi: SUBSCRIPTION_VAULT_ABI as any,
    functionName: 'getAllPlans',
  });

  useEffect(() => {
    setIsLoading(isPlansLoading);
  }, [isPlansLoading]);

  useEffect(() => {
    if (plansError) {
      setError(plansError.message);
      return;
    }

    if (!plansData) {
      setPlans([]);
      setError(null);
      return;
    }

    const nextPlans = (Array.isArray(plansData) ? plansData : []) as VaultPlanTuple[];

    setPlans(
      nextPlans.map((plan) => ({
        id: Number(plan.id),
        merchant: plan.merchant,
        name: plan.name,
        amountPerInterval: formatUnits(plan.amountPerInterval, 18),
        intervalSeconds: Number(plan.intervalSeconds),
        active: Boolean(plan.active),
      })),
    );
    setError(null);
  }, [plansData, plansError]);

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      await refetch();
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : 'Failed to fetch subscription plans.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const provider = new JsonRpcProvider(SEPOLIA_RPC_URL);
    const vaultContract = new Contract(
      SUBSCRIPTION_VAULT_ADDRESS,
      SUBSCRIPTION_VAULT_ABI,
      provider,
    );

    const appendEvent = async (
      type: SubscriptionEventLog['type'],
      planId: bigint,
      event: EventLog,
      details: Pick<SubscriptionEventLog, 'subscriber' | 'merchant' | 'amount'> = {},
    ) => {
      const block = await provider.getBlock(event.blockNumber);
      const subscriptionEvent: SubscriptionEventLog = {
        id: `${event.transactionHash}-${event.index}`,
        type,
        planId: Number(planId),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        timestamp: new Date(Number(block?.timestamp ?? Date.now() / 1000) * 1000).toLocaleTimeString(),
        ...details,
      };

      setEvents((currentEvents) => [subscriptionEvent, ...currentEvents].slice(0, 50));
    };

    const planCreatedListener = (
      planId: bigint,
      merchant: string,
      name: string,
      amount: bigint,
      interval: bigint,
      event: EventLog,
    ) => {
      setPlans((currentPlans) => {
        const nextPlan: SubscriptionPlan = {
          id: Number(planId),
          merchant,
          name,
          amountPerInterval: formatUnits(amount, 18),
          intervalSeconds: Number(interval),
          active: true,
        };
        return currentPlans.some((plan) => plan.id === nextPlan.id)
          ? currentPlans
          : [...currentPlans, nextPlan].sort((left, right) => left.id - right.id);
      });
      void appendEvent('PlanCreated', planId, event, {
        merchant,
        amount: formatUnits(amount, 18),
      });
    };

    const subscribedListener = (
      planId: bigint,
      subscriber: string,
      nextCharge: bigint,
      event: EventLog,
    ) => {
      if (address?.toLowerCase() === subscriber.toLowerCase()) {
        setPlans((currentPlans) => currentPlans.map((plan) =>
          plan.id === Number(planId)
            ? { ...plan, userIsSubscribed: true, nextChargeTimestamp: Number(nextCharge) }
            : plan,
        ));
      }
      void appendEvent('Subscribed', planId, event, { subscriber });
    };

    const paymentExecutedListener = (
      planId: bigint,
      subscriber: string,
      merchant: string,
      amount: bigint,
      event: EventLog,
    ) => {
      void appendEvent('PaymentExecuted', planId, event, {
        subscriber,
        merchant,
        amount: formatUnits(amount, 18),
      });
    };

    const subscriptionCancelledListener = (
      planId: bigint,
      subscriber: string,
      event: EventLog,
    ) => {
      if (address?.toLowerCase() === subscriber.toLowerCase()) {
        setPlans((currentPlans) => currentPlans.map((plan) =>
          plan.id === Number(planId)
            ? { ...plan, userIsSubscribed: false, nextChargeTimestamp: undefined }
            : plan,
        ));
      }
      void appendEvent('SubscriptionCancelled', planId, event, { subscriber });
    };

    vaultContract.on('PlanCreated', planCreatedListener);
    vaultContract.on('Subscribed', subscribedListener);
    vaultContract.on('PaymentExecuted', paymentExecutedListener);
    vaultContract.on('SubscriptionCancelled', subscriptionCancelledListener);

    return () => {
      void vaultContract.removeAllListeners();
      provider.destroy();
    };
  }, [address]);

  const subscribeToPlan = async (_planId: number, _amountEth: string) => {
    if (!address || !isConnected) {
      setError('Connect your wallet before subscribing.');
      return;
    }

    try {
      setError(null);
      await writeContractAsync({
        address: SUBSCRIPTION_VAULT_ADDRESS as `0x${string}`,
        abi: SUBSCRIPTION_VAULT_ABI as any,
        functionName: 'subscribe',
        args: [_planId],
        value: parseEther(_amountEth),
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Subscription failed.');
    }
  };

  const cancelSubscription = async (_planId: number) => {
    if (!address || !isConnected) {
      setError('Connect your wallet before canceling a subscription.');
      return;
    }

    try {
      setError(null);
      await writeContractAsync({
        address: SUBSCRIPTION_VAULT_ADDRESS as `0x${string}`,
        abi: SUBSCRIPTION_VAULT_ABI as any,
        functionName: 'cancelSubscription',
        args: [_planId],
      });
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'Cancellation failed.');
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