import { motion } from 'framer-motion';
import { Radio, Clock, ShieldAlert, ChevronRight } from 'lucide-react';
import { useNegotiationStore } from '@/store/useNegotiationStore';
import { TranscriptFeed } from './TranscriptFeed';
import { ActionCardComponent } from './ActionCardComponent';

export const BattleStage = () => {
  const { transcript, actionCards, setStage } = useNegotiationStore();
  const sortedCards = [...actionCards].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col overflow-hidden"
    >
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gotcha animate-pulse-glow" />
            <span className="text-[10px] font-mono font-bold text-gotcha tracking-wider">LIVE</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Radio size={12} />
            <span className="text-[10px] font-mono">RECORDING</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock size={12} />
            <span className="text-[10px] font-mono">04:32</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-primary">
            <ShieldAlert size={12} />
            <span className="text-[10px] font-mono font-bold">{actionCards.length} ALERTS</span>
          </div>
          <button
            onClick={() => setStage('debrief')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-mono font-bold hover:bg-primary/90 transition-colors"
          >
            END SESSION
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Split Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Transcript - 60% */}
        <div className="w-[60%] flex flex-col border-r">
          <div className="px-4 py-2 border-b bg-card">
            <h3 className="text-xs font-mono font-bold text-muted-foreground tracking-wider">
              LIVE TRANSCRIPT
            </h3>
          </div>
          <TranscriptFeed entries={transcript} />
        </div>

        {/* Action Cards - 40% */}
        <div className="w-[40%] flex flex-col">
          <div className="px-4 py-2 border-b bg-card">
            <h3 className="text-xs font-mono font-bold text-muted-foreground tracking-wider">
              ACTION CARDS
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {sortedCards.map((card, i) => (
              <ActionCardComponent key={card.id} card={card} index={i} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
