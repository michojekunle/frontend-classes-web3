import React, { useState } from "react";
import { Coins, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PoolData } from "../types/staking";

interface PoolCardProps {
  pool: PoolData;
  isConnected: boolean;
  onStake: (poolId: number, amount: string, isEth: boolean) => Promise<void>;
  onWithdraw: (poolId: number, amount: string) => Promise<void>;
  onClaim: (poolId: number) => Promise<void>;
  onMintTokens?: () => Promise<void>;
}

export const PoolCard: React.FC<PoolCardProps> = ({
  pool,
  isConnected,
  onStake,
  onWithdraw,
  onClaim,
  onMintTokens,
}) => {
  const [activeTab, setActiveTab] = useState<"stake" | "withdraw">("stake");
  const [amount, setAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleAction = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setIsSubmitting(true);
    try {
      if (activeTab === "stake") {
        await onStake(pool.poolId, amount, pool.isEthPool);
      } else {
        await onWithdraw(pool.poolId, amount);
      }
      setAmount("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isClaimDisabled =
    !isConnected || parseFloat(pool.userPendingReward || "0") <= 0;

  return (
    <div className="bg-[#0E1420] border border-[#1A2332] hover:border-[#00FFA3]/50 rounded-xl p-5 transition-all shadow-lg flex flex-col justify-between relative group">
      {/* Subtle Accent Glow Header */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00FFA3]/50 to-transparent opacity-0 group-hover:opacity-100 transition-all rounded-t-xl" />

      {/* Pool Metadata */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#07090E] border border-[#1A2332] flex items-center justify-center font-mono font-bold text-sm text-[#00FFA3] shrink-0">
              {pool.isEthPool ? "ETH" : pool.tokenSymbol || "STK"}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide flex items-center gap-2">
                {pool.isEthPool ? "ETH_VAULT" : `${pool.tokenSymbol}_VAULT`}
                <span className="text-[10px] bg-[#1A2332] text-[#94A3B8] border border-[#2A3649] px-2 py-0.5 rounded font-mono">
                  POOL_0{pool.poolId}
                </span>
              </h3>
              <p className="text-[11px] text-[#94A3B8] font-mono">
                RATE: {pool.rewardRatePerSecond} MGO/SEC
              </p>
            </div>
          </div>

          <div className="text-right font-mono">
            <span className="text-[10px] text-[#94A3B8] uppercase block">
              TOTAL_STAKED
            </span>
            <p className="text-sm font-bold text-white">
              {pool.totalStaked} {pool.tokenSymbol}
            </p>
          </div>
        </div>

        {/* User Stats Box - High Contrast (#CBD5E1 text) */}
        <div className="grid grid-cols-2 gap-2 bg-[#07090E] p-3 rounded-lg border border-[#1A2332] font-mono mb-4">
          <div>
            <span className="text-[10px] text-[#94A3B8] block mb-0.5 uppercase">
              MY_POSITION
            </span>
            <span className="text-xs font-bold text-white">
              {isConnected ? pool.userStakedAmount : "0.00"} {pool.tokenSymbol}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#94A3B8] block mb-0.5 uppercase">
              UNCLAIMED_MGO
            </span>
            <span className="text-xs font-bold text-[#00FFA3]">
              {isConnected ? pool.userPendingReward : "0.00"}
            </span>
          </div>
        </div>

        {/* Claim Rewards Banner */}
        <div className="flex items-center justify-between bg-[#0B1A14] border border-[#00FFA3]/30 p-2.5 rounded-lg mb-4 font-mono">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#00FFA3]" aria-hidden="true" />
            <span className="text-xs text-[#CBD5E1]">EARNED_YIELD</span>
          </div>
          <button
            onClick={() => onClaim(pool.poolId)}
            disabled={isClaimDisabled}
            className="text-xs bg-[#00FFA3] hover:bg-[#00E592] text-[#07090E] font-bold px-3 py-1.5 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
            aria-label={`Claim ${pool.userPendingReward || "0"} MGO rewards`}
          >
            CLAIM_MGO
          </button>
        </div>
      </div>

      {/* Interactive Tabs & Form */}
      <div>
        <div
          className="flex bg-[#07090E] p-1 rounded-lg mb-3 border border-[#1A2332] font-mono"
          role="tablist"
        >
          <button
            role="tab"
            aria-selected={activeTab === "stake"}
            onClick={() => setActiveTab("stake")}
            className={`flex-1 py-1.5 text-xs font-bold rounded transition-all cursor-pointer ${
              activeTab === "stake"
                ? "bg-[#1A2332] text-[#00FFA3] border border-[#00FFA3]/40"
                : "text-[#94A3B8] hover:text-white"
            }`}
          >
            STAKE
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "withdraw"}
            onClick={() => setActiveTab("withdraw")}
            className={`flex-1 py-1.5 text-xs font-bold rounded transition-all cursor-pointer ${
              activeTab === "withdraw"
                ? "bg-[#1A2332] text-[#00FFA3] border border-[#00FFA3]/40"
                : "text-[#94A3B8] hover:text-white"
            }`}
          >
            UNSTAKE
          </button>
        </div>

        <div className="relative mb-3">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={!isConnected}
            aria-label={`Amount of ${pool.tokenSymbol} to ${activeTab}`}
            className="w-full bg-[#07090E] border border-[#1A2332] text-white text-xs rounded-lg px-3 py-2.5 outline-none focus:border-[#00FFA3] focus-visible:ring-1 focus-visible:ring-[#00FFA3] font-mono disabled:opacity-40"
          />
          <button
            type="button"
            onClick={() =>
              setAmount(
                activeTab === "stake"
                  ? pool.userTokenBalance
                  : pool.userStakedAmount
              )
            }
            disabled={!isConnected}
            className="absolute right-2.5 top-2 text-[10px] font-bold font-mono text-[#00FFA3] hover:text-white bg-[#00FFA3]/10 px-2 py-0.5 rounded border border-[#00FFA3]/30 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            MAX
          </button>
        </div>

        <button
          onClick={handleAction}
          disabled={!isConnected || !amount || isSubmitting}
          className="w-full bg-[#1A2332] hover:bg-[#253247] border border-[#00FFA3]/50 text-[#00FFA3] font-mono font-bold text-xs py-2.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
        >
          {isSubmitting
            ? "EXECUTING..."
            : activeTab === "stake"
            ? `CONFIRM_STAKE_${pool.tokenSymbol}`
            : `CONFIRM_WITHDRAW_${pool.tokenSymbol}`}
        </button>

        {!pool.isEthPool && onMintTokens && (
          <button
            type="button"
            onClick={onMintTokens}
            disabled={!isConnected}
            className="w-full mt-2 text-[10px] text-[#94A3B8] hover:text-[#00FFA3] font-mono flex items-center justify-center gap-1 py-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Coins className="w-3 h-3 text-[#00FFA3]" aria-hidden="true" />{" "}
            FAUCET: MINT 100 STK
          </button>
        )}
      </div>
    </div>
  );
};
