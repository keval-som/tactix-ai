import { Shield } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useNegotiationStore } from '@/store/useNegotiationStore';

const stageLabels = {
  briefing: 'STRATEGIC BRIEFING',
  battle: 'LIVE ENGAGEMENT',
  debrief: 'VICTORY LOG',
};

export const Header = () => {
  const { stage } = useNegotiationStore();

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b bg-card">
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Shield className="text-primary" size={22} />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-wider text-foreground">
            TACTIX<span className="text-primary"> AI</span>
          </h1>
          <p className="text-[10px] text-muted-foreground tracking-widest">
            {stageLabels[stage]}
          </p>
        </div>
      </div>
      <ThemeToggle />
    </header>
  );
};
