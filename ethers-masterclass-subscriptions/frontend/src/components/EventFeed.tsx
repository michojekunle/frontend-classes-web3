import React from 'react';
import { SubscriptionEventLog } from '../types/subscription';
import { ShieldAlert, ArrowUpRight, Radio } from 'lucide-react';

interface EventFeedProps {
  events: SubscriptionEventLog[];
}

export const EventFeed: React.FC<EventFeedProps> = ({ events }) => {
  return (
    <div className="bg-paper-card rounded-3xl border border-paper-border p-6 sm:p-8 shadow-card">
      
      {/* Feed Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-paper-border gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-subtle">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-extrabold text-white tracking-tight">Live Contract Event Stream</h2>
              <span className="text-[10px] font-mono font-bold bg-paper-elevated text-orange-400 px-2 py-0.5 rounded border border-orange-500/20">
                Ethers.js v6
              </span>
            </div>
            <p className="text-xs text-paper-muted font-medium">
              Real-time JSON-RPC provider event listener capturing <code className="text-orange-400 font-semibold font-mono">PaymentExecuted</code> EVM events.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-paper-elevated border border-paper-border px-3.5 py-1.5 rounded-full shadow-subtle self-start sm:self-auto">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
          </span>
          <span className="text-xs font-bold text-slate-300 font-mono">WebSocket Active</span>
        </div>
      </div>

      {/* Events Table */}
      {events.length === 0 ? (
        <div className="text-center py-12 px-4 bg-paper-elevated/40 rounded-2xl border border-dashed border-paper-border">
          <ShieldAlert className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-base font-bold text-slate-300">No Payment Events Broadcasted Yet</p>
          <p className="text-xs text-paper-muted max-w-md mx-auto mt-1">
            Subscribe to a vault plan or trigger an automated charge to see low-latency EVM events stream live without refreshing the page.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-paper-muted font-bold uppercase tracking-wider border-b border-paper-border bg-paper-elevated">
                <th className="py-3 px-4 rounded-l-xl">Event Type</th>
                <th className="py-3 px-4">Subscriber</th>
                <th className="py-3 px-4">Vault Plan</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Block / Time</th>
                <th className="py-3 px-4 text-right rounded-r-xl">Tx Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-border">
              {events.map((evt) => {
                const sub = evt.subscriber || '';
                return (
                  <tr key={evt.id} className="hover:bg-paper-elevated/80 transition text-slate-300">
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-500/30 font-mono shadow-subtle">
                        {evt.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-white font-semibold">
                      {sub.length > 10 ? `${sub.slice(0, 6)}...${sub.slice(-4)}` : sub}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-orange-400">
                      Plan #{evt.planId}
                    </td>
                    <td className="py-3.5 px-4 font-black text-white">
                      {evt.amount} ETH
                    </td>
                    <td className="py-3.5 px-4 text-paper-muted font-mono text-[11px]">
                      <div>Block #{evt.blockNumber}</div>
                      <div className="text-[10px] text-slate-500">{evt.timestamp}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${evt.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-orange-400 hover:text-orange-300 font-mono font-semibold hover:underline"
                      >
                        <span>{evt.transactionHash ? `${evt.transactionHash.slice(0, 8)}...` : 'View Tx'}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
