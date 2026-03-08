import { motion } from 'framer-motion';
import { Shield, Calculator, Brain, Eye } from 'lucide-react';
import type { ActionCard, CardType } from '@/store/useNegotiationStore';

const cardConfig: Record<CardType, { icon: React.ElementType; colorClass: string; glowClass: string; bgClass: string; borderClass: string }> = {
  LEGAL_SHIELD: { icon: Shield, colorClass: 'text-shield', glowClass: 'glow-blue', bgClass: 'bg-shield/10', borderClass: 'border-shield/30' },
  MATH_CHECK: { icon: Calculator, colorClass: 'text-check', glowClass: 'glow-green', bgClass: 'bg-check/10', borderClass: 'border-check/30' },
  PSYCH_CUE: { icon: Brain, colorClass: 'text-psych', glowClass: 'glow-yellow', bgClass: 'bg-psych/10', borderClass: 'border-psych/30' },
  VISION_GOTCHA: { icon: Eye, colorClass: 'text-gotcha', glowClass: 'glow-red', bgClass: 'bg-gotcha/10', borderClass: 'border-gotcha/30' },
};

const typeLabels: Record<CardType, string> = {
  LEGAL_SHIELD: 'LEGAL SHIELD',
  MATH_CHECK: 'MATH CHECK',
  PSYCH_CUE: 'PSYCH CUE',
  VISION_GOTCHA: 'VISION GOTCHA',
};

export const ActionCardComponent = ({ card, index }: { card: ActionCard; index: number }) => {
  const config = cardConfig[card.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3, ease: 'easeOut' }}
      className={`p-4 rounded-xl border-2 ${config.borderClass} ${config.bgClass} space-y-2`}
    >
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${config.bgClass}`}>
          <Icon size={14} className={config.colorClass} />
        </div>
        {card.savings && (
          <span className="ml-auto text-[10px] font-mono font-bold text-check bg-check/10 px-2 py-0.5 rounded-full">
            Save ${card.savings.toLocaleString()}
          </span>
        )}
      </div>
      <h4 className="text-sm font-bold text-foreground">{card.title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed">{card.description}</p>
    </motion.div>
  );
};
