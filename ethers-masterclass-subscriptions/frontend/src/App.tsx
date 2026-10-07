import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useSubscriptionVault } from './hooks/useSubscriptionVault';
import { Header } from './components/Header';
import { PlanCard } from './components/PlanCard';
import { EventFeed } from './components/EventFeed';
import { SUBSCRIPTION_VAULT_ADDRESS } from './contracts/subscriptionConfig';
import { 
  Layers, 
  RefreshCw, 
  AlertTriangle,
  Loader2,
  Code2,
  Sparkles
} from 'lucide-react';

export const App: React.FC = () => {
  const { isConnected } = useAccount();
  const { 
    plans, 
    events, 
    isLoading, 
    error, 
    subscribeToPlan, 
    cancelSubscription,
    refetchPlans
  } = useSubscriptionVault();

  const [filter, setFilter] = useState<'all' | 'active'>('all');

  const filteredPlans = plans.filter((p) => {
    if (filter === 'active') return p.active;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#121316] text-slate-100 font-sans antialiased selection:bg-orange-500 selection:text-white">
      
      {/* Top Header Navigation */}
      <Header />

      {/* Main Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">
        
        {/* Hero Section */}
        <div className="bg-paper-card rounded-3xl border border-paper-border p-6 sm:p-10 shadow-card relative overflow-hidden group">
          
          {/* Ambient Orange Glow Blur */}
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-96 h-96 bg-gradient-to-bl from-orange-500/20 via-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none opacity-80" />

          <div className="relative z-10 max-w-3xl">
            
            {/* Masterclass Badge Pill */}
            <div className="inline-flex items-center space-x-2 bg-orange-500/10 border border-orange-500/25 px-3.5 py-1.5 rounded-full text-orange-400 text-xs font-bold mb-5 shadow-subtle">
              <Sparkles className="h-3.5 w-3.5 text-orange-400" />
              <span>Master Challenge #4 — Ethers.js + AppKit + Wagmi</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-4">
              Automated Web3 Subscriptions & Recurring Stream Vault
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8 font-normal">
              Empower decentralized SaaS products, Web3 streaming media, and automated payroll with non-custodial recurring payment vaults. Built with <strong className="text-white font-semibold">Reown AppKit & Wagmi v2</strong> for wallet connection and transaction signatures, combined with <strong className="text-white font-semibold">Ethers.js v6</strong> for low-latency RPC event listening.
            </p>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-paper-border">
              <div className="p-3.5 rounded-2xl bg-paper-elevated border border-paper-border">
                <span className="text-xs text-paper-muted font-medium block mb-0.5">Vault Plans</span>
                <span className="text-xl font-extrabold text-white">{plans.length} Registered</span>
              </div>
              
              <div className="p-3.5 rounded-2xl bg-paper-elevated border border-paper-border">
                <span className="text-xs text-paper-muted font-medium block mb-0.5">Network</span>
                <span className="text-xl font-extrabold text-orange-400">Sepolia EVM</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-paper-elevated border border-paper-border">
                <span className="text-xs text-paper-muted font-medium block mb-0.5">Event Stream</span>
                <span className="text-xl font-extrabold text-emerald-400 flex items-center">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
                  Ethers v6
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-paper-elevated border border-paper-border">
                <span className="text-xs text-paper-muted font-medium block mb-0.5">Wallet Connection</span>
                <span className="text-xl font-extrabold text-amber-400">AppKit Modal</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Notification Alert Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-500/30 text-rose-200 text-xs flex items-start space-x-3 shadow-subtle">
            <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block text-sm text-white">Transaction Warning / Error</span>
              <p className="mt-0.5 text-rose-300 leading-normal">{error}</p>
            </div>
          </div>
        )}

        {/* Subscription Plans Section */}
        <section className="space-y-6">
          
          {/* Section Controls & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Available Subscription Plans</h2>
              <p className="text-xs text-paper-muted font-medium mt-0.5">
                Select a recurring plan to authorize automated Web3 streaming payment approvals into the vault contract.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {/* Category Filter Pills */}
              <div className="flex items-center bg-paper-card p-1 rounded-xl border border-paper-border shadow-subtle">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    filter === 'all'
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Plans
                </button>
                <button
                  onClick={() => setFilter('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    filter === 'active'
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Active Only
                </button>
              </div>

              {/* Refresh Button */}
              <button
                onClick={refetchPlans}
                disabled={isLoading}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-300 hover:text-white px-3.5 py-2 rounded-xl border border-paper-border bg-paper-card hover:bg-paper-elevated transition shadow-subtle"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-orange-400' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Cards Grid / Loading State */}
          {isLoading && plans.length === 0 ? (
            <div className="text-center py-20 bg-paper-card rounded-3xl border border-paper-border shadow-card">
              <Loader2 className="h-10 w-10 text-orange-400 animate-spin mx-auto mb-4" />
              <p className="text-base font-bold text-slate-200">Fetching Subscription Vault Plans...</p>
              <p className="text-xs text-paper-muted mt-1">Reading contract state from Sepolia via Ethers.js v6 provider</p>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="text-center py-16 bg-paper-card rounded-3xl border border-paper-border shadow-card">
              <Layers className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-200">No Active Subscription Plans Found</p>
              <p className="text-xs text-paper-muted max-w-sm mx-auto mt-1">
                No plans match your current filter criteria or no plans have been registered on the smart contract yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isConnected={isConnected}
                  onSubscribe={subscribeToPlan}
                  onCancel={cancelSubscription}
                />
              ))}
            </div>
          )}
        </section>

        {/* Real-time Ethers Event Stream Section */}
        <section>
          <EventFeed events={events} />
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-paper-card border-t border-paper-border py-8 mt-16 text-center text-xs text-paper-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Code2 className="h-4 w-4 text-orange-400" />
            <span className="font-extrabold text-white">Frontend Web3 Masterclass</span>
            <span>—</span>
            <span>Ethers.js + AppKit + Wagmi Subscriptions</span>
          </div>

          <div className="flex items-center space-x-4 font-mono text-[11px]">
            <a
              href={`https://sepolia.etherscan.io/address/${SUBSCRIPTION_VAULT_ADDRESS}#code`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition flex items-center font-medium"
            >
              <span>Contract: {SUBSCRIPTION_VAULT_ADDRESS.slice(0, 6)}...{SUBSCRIPTION_VAULT_ADDRESS.slice(-4)}</span>
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default App;
