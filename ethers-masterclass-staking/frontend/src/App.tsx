import React, { useState } from 'react';
import { Header } from './components/Header';
import { PoolCard } from './components/PoolCard';
import { EventFeed } from './components/EventFeed';
import { useWeb3Wallet, useStakingVault } from './hooks/useWeb3Staking';
import { PoolData, StakingEventLog } from './types/staking';
import { AlertTriangle, Terminal } from 'lucide-react';

export function App() {
  const { wallet, connectWallet, switchNetwork } = useWeb3Wallet();
  const { pools, isLoading, error, stakeTokens, withdrawTokens, claimRewards, mintTestTokens } =
    useStakingVault(wallet.address);

  const [events] = useState<StakingEventLog[]>([]);

  const mockPools: PoolData[] = [
    {
      poolId: 0,
      stakingTokenAddress: '0x0000000000000000000000000000000000000000',
      rewardRatePerSecond: '100000000000000000',
      lastRewardTime: Math.floor(Date.now() / 1000),
      accRewardPerShare: '0',
      totalStaked: '12.50',
      isEthPool: true,
      tokenSymbol: 'ETH',
      tokenDecimals: 18,
      userStakedAmount: '0.00',
      userPendingReward: '0.00',
      userAllowance: '999999999',
      userTokenBalance: wallet.balance || '0.00',
    },
    {
      poolId: 1,
      stakingTokenAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      rewardRatePerSecond: '100000000000000000',
      lastRewardTime: Math.floor(Date.now() / 1000),
      accRewardPerShare: '0',
      totalStaked: '5000',
      isEthPool: false,
      tokenSymbol: 'STK',
      tokenDecimals: 18,
      userStakedAmount: '0.00',
      userPendingReward: '0.00',
      userAllowance: '0',
      userTokenBalance: '500',
    },
  ];

  const displayPools = pools.length > 0 ? pools : mockPools;

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
                Implement <code className="text-[#00FFA3]">useWeb3Staking.ts</code> to connect contract hooks & manage state.
              </p>
            </div>

            {!wallet.isConnected && (
              <button
                onClick={connectWallet}
                className="bg-[#00FFA3] hover:bg-[#00E592] text-[#050608] font-mono font-bold text-xs px-4 py-2 rounded-lg shadow-[0_0_15px_rgba(0,255,163,0.2)] transition-all uppercase"
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

        {/* Pools Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between font-mono">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              STAKING_POOLS ({displayPools.length})
            </h3>
            {pools.length === 0 && (
              <span className="text-[10px] text-[#00FFA3] bg-[#00FFA3]/10 border border-[#00FFA3]/30 px-2 py-0.5 rounded">
                PREVIEW_MODE
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {displayPools.map((pool) => (
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
