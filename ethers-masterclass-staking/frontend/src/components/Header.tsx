import React from "react";
import { Wallet, ShieldAlert, Cpu, CheckCircle, RefreshCw } from "lucide-react";
import { WalletState } from "../types/staking";

interface HeaderProps {
  wallet: WalletState;
  onConnect: () => void;
  onSwitchNetwork: (chainId: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  wallet,
  onConnect,
  onSwitchNetwork,
}) => {
  const isSepolia = wallet.chainId === 11155111;
  const isLocalhost = wallet.chainId === 31337;
  const isCorrectNetwork = isSepolia || isLocalhost;

  return (
    <header className="w-full bg-[#07090E] border-b border-[#1A2332] sticky top-0 z-50 px-4 sm:px-8 py-3.5 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#00FFA3]/10 border border-[#00FFA3]/30 flex items-center justify-center text-[#00FFA3] shadow-[0_0_12px_rgba(0,255,163,0.2)] shrink-0">
            <Cpu className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-sm sm:text-base font-bold text-white tracking-wider uppercase font-mono flex items-center gap-2">
              NEON_VAULT
              <span className="text-[10px] bg-[#00FFA3]/10 text-[#00FFA3] border border-[#00FFA3]/30 px-2 py-0.5 rounded font-mono font-normal">
                v1.0.0
              </span>
            </h1>
            <span
              className="text-xs text-[#3B485A] hidden md:inline"
              aria-hidden="true"
            >
              |
            </span>
            <span className="text-xs text-[#94A3B8] hidden md:inline font-mono">
              Ethers.js Staking Protocol
            </span>
          </div>
        </div>

        {/* Network & Wallet Action Bar */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Network Indicator */}
          {wallet.isConnected && (
            <div>
              {isCorrectNetwork ? (
                <div className="flex items-center gap-2 bg-[#0E1420] border border-[#1A2332] text-[#CBD5E1] text-xs px-3 py-1.5 rounded-lg font-mono">
                  <span className="w-2 h-2 rounded-full bg-[#00FFA3] shadow-[0_0_8px_#00FFA3]" />
                  <span>{isSepolia ? "SEPOLIA" : "LOCALHOST:31337"}</span>
                </div>
              ) : (
                <button
                  onClick={() => onSwitchNetwork(11155111)}
                  className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs px-3 py-1.5 rounded-lg font-mono hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-[#00FFA3] transition-all"
                  aria-label="Switch network to Sepolia"
                >
                  <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>SWITCH_NETWORK</span>
                </button>
              )}
            </div>
          )}

          {/* Wallet Connect / Account Badge */}
          {!wallet.isConnected ? (
            <button
              onClick={onConnect}
              disabled={wallet.isConnecting}
              className="flex items-center gap-2 bg-[#00FFA3] hover:bg-[#00E592] active:scale-[0.98] text-[#07090E] font-mono font-bold text-xs px-4 py-2 rounded-lg shadow-[0_0_20px_rgba(0,255,163,0.3)] focus-visible:outline-2 focus-visible:outline-white transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Connect Web3 Wallet"
            >
              {wallet.isConnecting ? (
                <RefreshCw
                  className="w-4 h-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Wallet className="w-4 h-4" aria-hidden="true" />
              )}
              <span>
                {wallet.isConnecting ? "CONNECTING..." : "CONNECT_WALLET"}
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-[#0E1420] border border-[#00FFA3]/40 p-1 pl-3.5 rounded-lg">
              <div className="flex flex-col text-right font-mono">
                <span className="text-xs font-bold text-[#00FFA3]">
                  {wallet.balance} ETH
                </span>
                <span className="text-[10px] text-[#64748B]">
                  {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                </span>
              </div>
              <div className="w-7 h-7 rounded bg-[#00FFA3]/10 text-[#00FFA3] flex items-center justify-center font-mono text-xs font-bold border border-[#00FFA3]/30 shrink-0">
                0x
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
