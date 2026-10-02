import React, { useState } from 'react';
import { Wallet, ShieldCheck, ChevronDown, Copy, ExternalLink, LogOut, Check, Sparkles } from 'lucide-react';
import { WalletState } from '../types/prediction';

interface HeaderProps {
  wallet: WalletState;
  onConnect: () => void;
  onDisconnect?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ wallet, onConnect, onDisconnect }) => {
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="w-full bg-white/85 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-50 px-4 sm:px-8 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Bespoke Oracle Hub Logo & Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 rounded-xl blur-xs opacity-50 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative w-10 h-10 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shadow-xs">
              {/* Custom SVG Geometric Logo combining Greek Omega Ω and Forecast Trendline */}
              <svg className="w-6 h-6 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19h4a7 7 0 1 1 8 0h4" />
                <polyline points="8 14 11 11 13 13 17 8" />
                <polyline points="13 8 17 8 17 12" />
              </svg>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
                Oracle Hub
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 rounded-full font-mono shadow-2xs">
                <Sparkles className="w-3 h-3 text-indigo-500" /> PROT_V2
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Decentralized Forecast & Oracle Engine</p>
          </div>
        </div>

        {/* Account & Wallet Controls */}
        <div className="flex items-center gap-3">
          
          {/* Network Indicator */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-100/90 border border-slate-200/80 text-slate-700 text-xs px-3 py-1.5 rounded-xl font-mono shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="font-semibold">Sepolia 11155111</span>
          </div>

          {!wallet.isConnected ? (
            <button
              onClick={onConnect}
              disabled={wallet.isConnecting}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs sm:text-sm px-4.5 py-2.5 rounded-xl shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Wallet className="w-4 h-4" />
              <span>{wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowWalletMenu(!showWalletMenu)}
                className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs p-1.5 pl-3 rounded-xl text-left transition-all cursor-pointer hover:border-slate-300"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900 font-mono">
                    {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                  </span>
                  <span className="text-[10px] text-indigo-600 font-semibold font-mono">
                    {wallet.balance} ETH
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </button>

              {/* Wallet Menu Popover */}
              {showWalletMenu && (
                <div className="absolute right-0 mt-2.5 w-72 bg-white border border-slate-200/90 rounded-2xl shadow-2xl shadow-slate-900/10 p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-500">Connected Wallet</span>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-mono">
                      Sepolia Testnet
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center justify-between">
                    <span className="text-xs font-mono font-medium text-slate-800 truncate mr-2">
                      {wallet.address}
                    </span>
                    <button
                      onClick={copyAddress}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white border hover:border-slate-200 rounded-lg transition-all cursor-pointer"
                      title="Copy Address"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <a
                    href={`https://sepolia.etherscan.io/address/${wallet.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between text-xs font-medium text-slate-600 hover:text-indigo-600 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/60 transition-all"
                  >
                    <span>View on Etherscan</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {onDisconnect && (
                    <button
                      onClick={() => {
                        onDisconnect();
                        setShowWalletMenu(false);
                      }}
                      className="w-full flex items-center justify-between text-xs font-semibold text-rose-600 hover:bg-rose-50 p-2.5 rounded-xl transition-all cursor-pointer"
                    >
                      <span>Disconnect Wallet</span>
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
