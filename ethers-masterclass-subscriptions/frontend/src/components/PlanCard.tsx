import React, { useState } from 'react';
import { SubscriptionPlan } from '../types/subscription';
import { CheckCircle2, Clock, Zap, Loader2, AlertCircle } from 'lucide-react';

interface PlanCardProps {
  plan: SubscriptionPlan;
  isConnected: boolean;
  onSubscribe: (planId: number, amount: string) => Promise<void>;
  onCancel: (planId: number) => Promise<void>;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isConnected,
  onSubscribe,
  onCancel,
}) => {
  const [subscribing, setSubscribing] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const formatInterval = (seconds: number) => {
    if (seconds >= 86400) {
      const days = Math.floor(seconds / 86400);
      return `${days} Day${days > 1 ? 's' : ''}`;
    } else if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      return `${hours} Hour${hours > 1 ? 's' : ''}`;
    }
    return `${Math.floor(seconds / 60)} Mins`;
  };

  const handleSubscribe = async () => {
    try {
      setSubscribing(true);
      await onSubscribe(plan.id, plan.amountPerInterval);
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancel = async () => {
    try {
      setCanceling(true);
      await onCancel(plan.id);
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="bg-paper-card rounded-2xl border border-paper-border p-6 shadow-card hover:shadow-elevated hover:border-orange-500/40 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1">
      
      {/* Top Accent Orange Gradient Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-400 opacity-80 group-hover:opacity-100 group-hover:h-1.5 transition-all" />

      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-mono font-bold text-slate-300 bg-paper-elevated px-2.5 py-1 rounded-lg border border-paper-border">
            PLAN #{plan.id}
          </span>
          
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-500/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span>Active Vault</span>
          </div>
        </div>

        {/* Plan Title & Merchant */}
        <h3 className="text-xl font-extrabold text-white tracking-tight group-hover:text-orange-400 transition mb-1">
          {plan.name}
        </h3>
        <p className="text-xs text-paper-muted font-mono mb-5 flex items-center">
          <span className="text-slate-400 mr-1">Merchant:</span>
          <span className="font-medium text-slate-300">{plan.merchant.slice(0, 6)}...{plan.merchant.slice(-4)}</span>
        </p>

        {/* Pricing Box */}
        <div className="my-4 p-4 rounded-xl bg-paper-elevated border border-paper-border flex items-baseline justify-between shadow-subtle">
          <div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-black text-white tracking-tight">
                {plan.amountPerInterval}
              </span>
              <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                ETH
              </span>
            </div>
            <span className="text-[11px] text-paper-muted font-medium">per billing cycle</span>
          </div>

          <div className="text-right">
            <div className="flex items-center text-xs text-slate-300 font-bold justify-end">
              <Clock className="h-3.5 w-3.5 mr-1 text-orange-400" />
              {formatInterval(plan.intervalSeconds)}
            </div>
            <span className="text-[10px] text-paper-muted font-medium">Automated Stream</span>
          </div>
        </div>

        {/* Feature List */}
        <ul className="space-y-2.5 my-5 text-xs text-slate-300">
          <li className="flex items-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 mr-2 flex-shrink-0" />
            <span>Low-latency Ethers v6 event stream</span>
          </li>
          <li className="flex items-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 mr-2 flex-shrink-0" />
            <span>AppKit & Wagmi non-custodial signing</span>
          </li>
          <li className="flex items-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 mr-2 flex-shrink-0" />
            <span>Cancel anytime without lock-up penalty</span>
          </li>
        </ul>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-paper-border">
        {!isConnected ? (
          <button
            disabled
            className="w-full py-2.5 px-4 rounded-xl bg-paper-elevated text-slate-500 font-semibold text-xs flex items-center justify-center cursor-not-allowed border border-paper-border"
          >
            <AlertCircle className="h-4 w-4 mr-2 text-slate-500" />
            Connect Wallet to Subscribe
          </button>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={handleSubscribe}
              disabled={subscribing || canceling}
              className="py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center shadow-lg shadow-orange-600/25 hover:shadow-orange-500/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {subscribing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5 mr-1.5 text-amber-200" />
                  Subscribe
                </>
              )}
            </button>

            <button
              onClick={handleCancel}
              disabled={subscribing || canceling}
              className="py-2.5 px-4 rounded-xl bg-paper-elevated hover:bg-rose-950/40 text-rose-400 border border-paper-border hover:border-rose-500/40 font-semibold text-xs flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {canceling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin text-rose-400" />
                  Canceling...
                </>
              ) : (
                'Cancel Sub'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
