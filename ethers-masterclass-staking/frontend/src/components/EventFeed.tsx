import React from "react";
import { Terminal } from "lucide-react";
import { StakingEventLog } from "../types/staking";

interface EventFeedProps {
  events: StakingEventLog[];
}

export const EventFeed: React.FC<EventFeedProps> = ({ events }) => {
  return (
    <div className="bg-[#0A0D14] border border-[#161D27] rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] font-mono">
      <div className="flex items-center justify-between mb-4 border-b border-[#141A21] pb-3">
        <h3 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
          <Terminal className="w-4 h-4 text-[#00FFA3]" />
          LIVE_EVENT_TERMINAL
        </h3>
        <div className="flex items-center gap-1.5 bg-[#00FFA3]/10 border border-[#00FFA3]/30 text-[#00FFA3] text-[10px] px-2.5 py-0.5 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FFA3] animate-ping" />
          ETHERS.ON_ACTIVE
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-6 bg-[#050608] rounded-lg border border-[#141A21] text-xs text-[#526071]">
          <span>
            [SYSTEM] Listening for contract events... Execute stake or claim to
            populate terminal.
          </span>
        </div>
      ) : (
        <div className="space-y-2 max-h-65 overflow-y-auto pr-1 text-xs">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-[#050608] p-2.5 rounded border border-[#141A21] flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-[#00FFA3] font-bold">
                  [{event.type.toUpperCase()}]
                </span>
                <span className="text-[#8A99AD]">
                  {event.user.slice(0, 6)}...{event.user.slice(-4)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white font-bold">{event.amount}</span>
                <span className="text-[#526071] text-[10px]">
                  {event.timestamp}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
