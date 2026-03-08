import { useEffect } from 'react';
import { useNegotiationStore } from '@/store/useNegotiationStore';
import { Header } from '@/components/Header';
import { BriefingStage } from '@/components/BriefingStage';
import { BattleStage } from '@/components/BattleStage';
import { DebriefStage } from '@/components/DebriefStage';

const Index = () => {
  const { stage, theme } = useNegotiationStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className="flex flex-col h-screen bg-background grid-bg">
      <Header />
      {stage === 'briefing' && <BriefingStage />}
      {stage === 'battle' && <BattleStage />}
      {stage === 'debrief' && <DebriefStage />}
    </div>
  );
};

export default Index;
