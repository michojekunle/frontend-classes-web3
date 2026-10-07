import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { parseAbi } from 'viem';
import {
  Contract,
  JsonRpcProvider,
  formatUnits,
  parseEther,
  type ContractEventPayload,
} from 'ethers';
import { SUBSCRIPTION_VAULT_ADDRESS, SUBSCRIPTION_VAULT_ABI } from '../contracts/subscriptionConfig';
import { SubscriptionPlan, SubscriptionEventLog } from '../types/subscription';

const SEPOLIA_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';

// One shared provider + contract for the whole app (reads and event listening).
const provider = new JsonRpcProvider(SEPOLIA_RPC_URL, sepolia.id, { staticNetwork: true });
const vault = new Contract(SUBSCRIPTION_VAULT_ADDRESS, SUBSCRIPTION_VAULT_ABI, provider);

// viem-format ABI for the two wagmi write calls.
const WRITE_ABI = parseAbi([
  'function subscribe(uint256 _planId) payable',
  'function cancelSubscription(uint256 _planId)',
]);

interface RawPlan {
  id: bigint;
  merchant: string;
  name: string;
  amountPerInterval: bigint;
  intervalSeconds: bigint;
  active: boolean;
}

const sameAddress = (a?: string, b?: string) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();

const errorMessage = (e: unknown): string => {
  const err = e as { shortMessage?: string; message?: string; name?: string };
  if (err?.name === 'UserRejectedRequestError' || /user rejected|user denied/i.test(err?.message ?? '')) {
    return 'Transaction was rejected in your wallet.';
  }
  return err?.shortMessage ?? err?.message ?? 'Something went wrong.';
};

const logMeta = (payload: ContractEventPayload) => ({
  id: `${payload.log.transactionHash}-${payload.log.index}`,
  blockNumber: payload.log.blockNumber,
  transactionHash: payload.log.transactionHash,
  timestamp: new Date().toLocaleTimeString(),
});

export const useSubscriptionVault = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [events, setEvents] = useState<SubscriptionEventLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { address, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

  // Refs so long-lived event listeners always see the latest values.
  const addressRef = useRef(address);
  addressRef.current = address;
  const plansRef = useRef(plans);
  plansRef.current = plans;
  const didInitialFetch = useRef(false);

  // Targeted state updates: touch ONLY the plan / feed entry concerned.
  const patchPlan = useCallback((planId: number, patch: Partial<SubscriptionPlan>) => {
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, ...patch } : p)));
  }, []);

  const pushEvent = useCallback((evt: SubscriptionEventLog) => {
    setEvents((prev) => (prev.some((e) => e.id === evt.id) ? prev : [evt, ...prev].slice(0, 50)));
  }, []);

  // ===== EXERCISE 2: read plans ONCE =====
  const fetchPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const raw = (await vault.getAllPlans()) as RawPlan[];
      const fresh: SubscriptionPlan[] = raw.map((p) => ({
        id: Number(p.id),
        merchant: p.merchant,
        name: p.name,
        amountPerInterval: formatUnits(p.amountPerInterval, 18),
        intervalSeconds: Number(p.intervalSeconds),
        active: p.active,
      }));
      // Keep any per-user info we already know when a manual refresh happens.
      setPlans((prev) =>
        fresh.map((p) => {
          const old = prev.find((o) => o.id === p.id);
          return old
            ? { ...p, userIsSubscribed: old.userIsSubscribed, nextChargeTimestamp: old.nextChargeTimestamp }
            : p;
        }),
      );
    } catch (e) {
      setError(`Failed to load plans: ${errorMessage(e)}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (didInitialFetch.current) return; // guards React StrictMode's double-mount in dev
    didInitialFetch.current = true;
    fetchPlans();
  }, [fetchPlans]);

  // One-time read of the connected wallet's subscription status per plan.
  const hasPlans = plans.length > 0;
  useEffect(() => {
    if (!address || !hasPlans) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        plansRef.current.map(async (p) => {
          try {
            const s = await vault.subscriptions(p.id, address);
            return { id: p.id, active: Boolean(s.active), next: Number(s.nextChargeTimestamp) };
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      setPlans((prev) =>
        prev.map((p) => {
          const r = results.find((x) => x && x.id === p.id);
          return r
            ? { ...p, userIsSubscribed: r.active, nextChargeTimestamp: r.active ? r.next : undefined }
            : p;
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [address, hasPlans]);

  // ===== EXERCISE 1: real-time Ethers event listeners =====
  useEffect(() => {
    const onPlanCreated = (
      planId: bigint, merchant: string, name: string, amount: bigint, interval: bigint,
      payload: ContractEventPayload,
    ) => {
      const id = Number(planId);
      const amountEth = formatUnits(amount, 18);
      pushEvent({ ...logMeta(payload), type: 'PlanCreated', planId: id, merchant, amount: amountEth });
      setPlans((prev) =>
        prev.some((p) => p.id === id)
          ? prev
          : [...prev, {
              id, merchant, name,
              amountPerInterval: amountEth,
              intervalSeconds: Number(interval),
              active: true,
            }],
      );
    };

    const onSubscribed = (
      planId: bigint, subscriber: string, nextCharge: bigint, payload: ContractEventPayload,
    ) => {
      const id = Number(planId);
      const plan = plansRef.current.find((p) => p.id === id);
      pushEvent({
        ...logMeta(payload), type: 'Subscribed', planId: id, subscriber,
        amount: plan?.amountPerInterval ?? '0',
      });
      if (sameAddress(subscriber, addressRef.current)) {
        patchPlan(id, { userIsSubscribed: true, nextChargeTimestamp: Number(nextCharge) });
      }
    };

    const onPaymentExecuted = (
      planId: bigint, subscriber: string, merchant: string, amount: bigint,
      payload: ContractEventPayload,
    ) => {
      const id = Number(planId);
      pushEvent({
        ...logMeta(payload), type: 'PaymentExecuted', planId: id, subscriber, merchant,
        amount: formatUnits(amount, 18),
      });
      const plan = plansRef.current.find((p) => p.id === id);
      if (plan && sameAddress(subscriber, addressRef.current)) {
        patchPlan(id, { nextChargeTimestamp: Math.floor(Date.now() / 1000) + plan.intervalSeconds });
      }
    };

    const onCancelled = (planId: bigint, subscriber: string, payload: ContractEventPayload) => {
      const id = Number(planId);
      pushEvent({ ...logMeta(payload), type: 'SubscriptionCancelled', planId: id, subscriber, amount: '0' });
      if (sameAddress(subscriber, addressRef.current)) {
        patchPlan(id, { userIsSubscribed: false, nextChargeTimestamp: undefined });
      }
    };

    vault.on('PlanCreated', onPlanCreated);
    vault.on('Subscribed', onSubscribed);
    vault.on('PaymentExecuted', onPaymentExecuted);
    vault.on('SubscriptionCancelled', onCancelled);

    // Teardown on unmount
    return () => {
      void vault.removeAllListeners();
    };
  }, [patchPlan, pushEvent]);

  // ---- helpers for writes ----
  const ensureSepolia = async () => {
    if (chainId !== sepolia.id) await switchChainAsync({ chainId: sepolia.id });
  };

  const waitForConfirmation = async (hash: string) => {
    const receipt = await provider.waitForTransaction(hash);
    if (!receipt || receipt.status !== 1) throw new Error('Transaction reverted on-chain.');
  };

  // ===== EXERCISE 3: subscribe (wagmi) =====
    const subscribeToPlan = async (planId: number, amountEth: string) => {
    try {
      setError(null);
      if (!address) throw new Error('Connect your wallet first.');
      await ensureSepolia();

      const value = parseEther(amountEth);

      // 1. Balance check (price + gas)
      const balance = await provider.getBalance(address);
      if (balance <= value) {
        throw new Error(
          `Not enough Sepolia ETH. This plan costs ${amountEth} ETH plus gas, but your wallet has ${Number(formatUnits(balance, 18)).toFixed(4)} ETH.`,
        );
      }

      // 2. Dry run: surfaces contract reverts before the wallet prompt
      try {
        await provider.estimateGas({
          from: address,
          to: SUBSCRIPTION_VAULT_ADDRESS,
          data: vault.interface.encodeFunctionData('subscribe', [planId]),
          value,
        });
      } catch (e) {
        throw new Error(`This transaction would fail: ${errorMessage(e)}`);
      }

      const hash = await writeContractAsync({
        address: SUBSCRIPTION_VAULT_ADDRESS as `0x${string}`,
        abi: WRITE_ABI,
        functionName: 'subscribe',
        args: [BigInt(planId)],
        value,
      });
      await waitForConfirmation(hash);
      patchPlan(planId, { userIsSubscribed: true }); // optimistic; the event adds the details
    } catch (e) {
      setError(errorMessage(e));
    }
  };
    // ===== EXERCISE 4: cancel (wagmi) =====
  const cancelSubscription = async (planId: number) => {
    try {
      setError(null);
      await ensureSepolia();
      const hash = await writeContractAsync({
        address: SUBSCRIPTION_VAULT_ADDRESS as `0x${string}`,
        abi: WRITE_ABI,
        functionName: 'cancelSubscription',
        args: [BigInt(planId)],
      });
      await waitForConfirmation(hash);
      patchPlan(planId, { userIsSubscribed: false, nextChargeTimestamp: undefined });
    } catch (e) {
      setError(errorMessage(e));
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