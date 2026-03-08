import { Eye, Mic, Brain } from 'lucide-react';
import { useNegotiationStore } from '@/store/useNegotiationStore';

const indicators = [
  { key: 'vision' as const, icon: Eye, idle: 'Idle', ready: 'Ready' },
  { key: 'audio' as const, icon: Mic, idle: 'Idle', ready: 'Listening' },
  { key: 'logic' as const, icon: Brain, idle: 'Idle', ready: 'Shield Active' },
];

export const ReadinessHUD = () => {
  const { readiness } = useNegotiationStore();

  return (
    <div className="flex gap-4">
      {indicators.map(({ key, icon: Icon, idle, ready }) => {
        const isActive = readiness[key] !== 'idle';
        return (
          <div key={key} className="flex items-center gap-2">
            <div className={`relative p-2 rounded-lg ${isActive ? 'bg-primary/15' : 'bg-secondary'}`}>
              <Icon size={16} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
              {isActive && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary animate-pulse-glow" />
              )}
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">{key}</p>
              <p className={`text-xs font-semibold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {isActive ? ready : idle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
