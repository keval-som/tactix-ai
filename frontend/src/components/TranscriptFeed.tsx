import { motion } from 'framer-motion';
import { User, UserX } from 'lucide-react';
import type { TranscriptEntry } from '@/store/useNegotiationStore';

const HIGHLIGHT_WORDS = ['fee', 'contract', 'today', 'non-negotiable', 'apr', 'monthly', 'payment', 'buyers'];

const highlightText = (text: string) => {
  const regex = new RegExp(`(\\$[\\d,]+|${HIGHLIGHT_WORDS.join('|')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) => {
    if (regex.test(part) || /^\$[\d,]+$/.test(part)) {
      return (
        <span key={i} className="px-1 py-0.5 rounded bg-primary/15 text-primary font-semibold">
          {part}
        </span>
      );
    }
    return part;
  });
};

export const TranscriptFeed = ({ entries }: { entries: TranscriptEntry[] }) => {
  return (
    <div className="flex-1 overflow-y-auto space-y-3 p-4">
      {entries.map((entry, i) => {
        const isYou = entry.speaker === 'you';
        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex gap-3 ${isYou ? 'flex-row-reverse' : ''}`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isYou ? 'bg-primary/15' : 'bg-gotcha/15'}`}>
              {isYou ? <User size={14} className="text-primary" /> : <UserX size={14} className="text-gotcha" />}
            </div>
            <div className={`max-w-[80%] p-3 rounded-xl text-sm leading-relaxed ${isYou ? 'bg-primary/10 text-foreground' : 'bg-secondary text-foreground'}`}>
              <p className={`text-[10px] font-mono font-bold mb-1 ${isYou ? 'text-primary' : 'text-gotcha'}`}>
                {isYou ? 'YOU' : 'ADVERSARY'}
              </p>
              <p>{highlightText(entry.text)}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
