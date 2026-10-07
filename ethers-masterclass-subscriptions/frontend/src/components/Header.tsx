import React, { useState } from 'react';
import { RefreshCw, ShieldCheck, ExternalLink, Copy, Check } from 'lucide-react';
import { SUBSCRIPTION_VAULT_ADDRESS } from '../contracts/subscriptionConfig';

export const Header: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SUBSCRIPTION_VAULT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#16171B]/90 backdrop-blur-xl border-b border-paper-border transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        
        {/* Brand Identity & Orange Glowing Logo */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 rounded-2xl blur-md opacity-40 group-hover:opacity-75 transition duration-300"></div>
            <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-tr from-stone-950 via-paper-card to-orange-600 border border-orange-500/30 flex items-center justify-center text-white shadow-md">
              <RefreshCw className="h-5 w-5 text-orange-400 animate-spin-slow" />
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-white tracking-tight text-lg sm:text-xl">
                StreamPay
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/25 shadow-sm">
                Vault v1.0
              </span>
            </div>
            <p className="text-xs text-paper-muted font-medium hidden sm:block">
              Automated Web3 Subscriptions & Non-Custodial Stream Vault
            </p>
          </div>
        </div>

        {/* Center / Right Badges & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          
          {/* Address Copy Pill */}
          <button
            onClick={handleCopy}
            title="Click to copy contract address"
            className="hidden md:flex items-center space-x-1.5 text-xs font-mono font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-xl border border-paper-border bg-paper-card hover:bg-paper-elevated transition shadow-subtle"
          >
            <span className="text-paper-muted">Vault:</span>
            <span>{SUBSCRIPTION_VAULT_ADDRESS.slice(0, 6)}...{SUBSCRIPTION_VAULT_ADDRESS.slice(-4)}</span>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400 ml-1" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-paper-muted ml-1 hover:text-white" />
            )}
          </button>

          {/* Verified Etherscan Button */}
          <a
            href={`https://sepolia.etherscan.io/address/${SUBSCRIPTION_VAULT_ADDRESS}#code`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center space-x-1.5 text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-1.5 rounded-xl border border-paper-border bg-paper-card hover:bg-paper-elevated transition shadow-subtle"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Verified</span>
            <ExternalLink className="h-3 w-3 text-paper-muted ml-0.5" />
          </a>

          {/* AppKit Modal Connect Button */}
          {/* @ts-ignore */}
          <w3m-button balance="show" size="sm" label="Connect Wallet" />
        </div>
      </div>
    </header>
  );
};
