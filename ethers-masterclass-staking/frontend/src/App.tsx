import React from 'react';
import { Header } from './components/Header';
import { PoolCard } from './components/PoolCard';
import { EventFeed } from './components/EventFeed';
import { useWalletConnection } from './hooks/useWalletConnection';
import { useStakingVault } from './hooks/useWeb3Staking';
import { AlertTriangle, Terminal, Loader2 } from 'lucide-react';

export function App() {
  const { wallet, connectWallet, switchNetwork } = useWalletConnection();
  const { pools, events, isLoading, error, stakeTokens, withdrawTokens, claimRewards, mintTestTokens } =
    useStakingVault(wallet.address);

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 flex flex-col font-sans selection:bg-[#00FFA3] selection:text-[#050608]">
      <Header wallet={wallet} onConnect={connectWallet} onSwitchNetwork={switchNetwork} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        
        {/* Banner */}
        <div className="bg-[#0A0D14] border border-[#161D27] rounded-xl p-5 shadow-[0_4px_25px_rgba(0,0,0,0.6)] relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#00FFA3]/10 border border-[#00FFA3]/30 text-[#00FFA3] text-xs px-2.5 py-0.5 rounded mb-2">
                <Terminal className="w-3.5 h-3.5" /> LIVE_CLASS_MODULE: ETHERS.JS_STAKING
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide uppercase">
                MULTI_TOKEN_VAULT_PROTOCOL
              </h2>
              <p className="text-xs text-[#8A99AD] max-w-2xl mt-1">
                Connected via Ethers.js v6 with live pool aggregation & contract event streaming.
              </p>
            </div>

            {!wallet.isConnected && (
              <button
                onClick={connectWallet}
                className="bg-[#00FFA3] hover:bg-[#00E592] text-[#050608] font-mono font-bold text-xs px-4 py-2 rounded-lg shadow-[0_0_15px_rgba(0,255,163,0.2)] transition-all uppercase cursor-pointer"
              >
                CONNECT_WALLET
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-[#1A0A0E] border border-rose-500/30 text-rose-400 px-4 py-3 rounded-lg flex items-center gap-3 text-xs font-mono">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <span className="font-bold">[ERROR]:</span> {error}
            </div>
          </div>
        )}

        {/* Pools Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between font-mono">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              STAKING_POOLS ({isLoading ? "..." : pools.length})
            </h3>
          </div>

          {/* Full Centered Loading Spinner when pools are loading */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-[#0A0D14] border border-[#161D27] rounded-xl shadow-inner font-mono">
              <Loader2 className="w-12 h-12 text-[#00FFA3] animate-spin mb-4" />
              <p className="text-sm font-bold text-white tracking-wider uppercase">LOADING_STAKING_POOLS...</p>
              <p className="text-xs text-[#526071] mt-1">Querying contract data via Multicall</p>
            </div>
          ) : pools.length === 0 ? (
            /* Empty State if no pools found on contract */
            <div className="text-center py-16 bg-[#0A0D14] border border-[#161D27] rounded-xl font-mono">
              <p className="text-sm font-bold text-[#8A99AD]">NO_POOLS_AVAILABLE</p>
              <p className="text-xs text-[#526071] mt-1">Please ensure smart contracts are deployed to target network</p>
            </div>
          ) : (
            /* Real Contract Pools Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {pools.map((pool) => (
                <PoolCard
                  key={pool.poolId}
                  pool={pool}
                  isConnected={wallet.isConnected}
                  onStake={stakeTokens}
                  onWithdraw={withdrawTokens}
                  onClaim={claimRewards}
                  onMintTokens={mintTestTokens}
                />
              ))}
            </div>
          )}
        </section>

        <EventFeed events={events} />

      </main>

      <footer className="border-t border-[#141A21] py-4 text-center text-[11px] font-mono text-[#526071]">
        NEON_VAULT // SOLANA_CYBER_DARK_THEME // ETHERS.JS_MASTERCLASS
      </footer>
    </div>
  );
}

export default App;
