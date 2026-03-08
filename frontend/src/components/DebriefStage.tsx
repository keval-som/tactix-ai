import { motion } from 'framer-motion';
import { TrendingUp, ShieldCheck, Brain, RotateCcw, Copy, Mail } from 'lucide-react';
import { useNegotiationStore } from '@/store/useNegotiationStore';
import { ActionCardComponent } from './ActionCardComponent';

export const DebriefStage = () => {
  const { actionCards, reset } = useNegotiationStore();
  const totalSavings = actionCards.reduce((sum, c) => sum + (c.savings || 0), 0);
  const trapsDeflected = actionCards.filter(c => c.type === 'PSYCH_CUE' || c.type === 'VISION_GOTCHA').length;
  const sortedCards = [...actionCards].sort((a, b) => a.timestamp - b.timestamp);

  const stats = [
    { label: 'Potential Savings', value: `$${totalSavings.toLocaleString()}`, icon: TrendingUp, color: 'text-check' },
    { label: 'Traps Deflected', value: trapsDeflected.toString(), icon: ShieldCheck, color: 'text-shield' },
    { label: 'Outcome Sentiment', value: 'Strong Position', icon: Brain, color: 'text-primary' },
  ];

  const draftEmail = `Subject: Follow-up on Our Discussion

Dear [Sales Representative],

Thank you for your time today. After reviewing the terms discussed, I'd like to address the following points:

1. The online listing price of $32,900 differs from the quoted price of $34,500. I'd like to proceed based on the listed price.

2. The "dealer prep fee" of $995 appears to cover services already included in the vehicle price. I request this be removed.

3. The documentation fee of $499 exceeds the state maximum of $200. Please adjust accordingly.

4. I'd like the APR stated explicitly in any financing offer rather than a monthly payment figure.

I look forward to reaching a fair agreement.

Best regards,
[Your Name]`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 overflow-y-auto"
    >
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-check/10 text-check text-xs font-mono font-semibold tracking-wider">
            <ShieldCheck size={14} />
            SESSION COMPLETE
          </div>
          <h2 className="text-3xl font-bold text-foreground">Victory Log</h2>
          <p className="text-sm text-muted-foreground">Your negotiation intelligence report</p>
        </motion.div>

        {/* Impact Score */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-5 rounded-xl border-2 border-border bg-card text-center space-y-2"
              >
                <Icon size={20} className={`mx-auto ${stat.color}`} />
                <p className="text-2xl font-bold text-foreground font-mono">{stat.value}</p>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Memory Timeline */}
        <div>
          <h3 className="text-xs font-mono font-bold text-muted-foreground tracking-wider uppercase mb-4">
            Memory Timeline
          </h3>
          <div className="relative pl-6 border-l-2 border-border space-y-4">
            {sortedCards.map((card, i) => (
              <div key={card.id} className="relative">
                <div className="absolute -left-[calc(1.5rem+5px)] w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                <ActionCardComponent card={card} index={i} />
              </div>
            ))}
          </div>
        </div>

        {/* Follow-up Draft */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono font-bold text-muted-foreground tracking-wider uppercase">
              Generated Follow-Up Draft
            </h3>
            <div className="flex gap-2">
              <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary text-secondary-foreground text-xs font-mono hover:bg-muted transition-colors">
                <Copy size={12} /> Copy
              </button>
              <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-mono hover:bg-primary/90 transition-colors">
                <Mail size={12} /> Send
              </button>
            </div>
          </div>
          <div className="p-4 rounded-xl border-2 border-border bg-card">
            <pre className="text-xs text-foreground font-mono whitespace-pre-wrap leading-relaxed">
              {draftEmail}
            </pre>
          </div>
        </div>

        {/* Reset */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={reset}
          className="w-full py-4 rounded-xl border-2 border-border bg-card text-foreground font-mono font-bold text-sm tracking-wider flex items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all"
        >
          <RotateCcw size={16} />
          CLEAR SESSION & START NEW BRIEFING
        </motion.button>
      </div>
    </motion.div>
  );
};
