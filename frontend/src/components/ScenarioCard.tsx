import { motion } from 'framer-motion';
import { type Scenario, useNegotiationStore } from '@/store/useNegotiationStore';
import { Car, Home, Briefcase, CreditCard } from 'lucide-react';

const scenarios: { id: Scenario; icon: React.ElementType; label: string; template: string }[] = [
  { id: 'car', icon: Car, label: 'Car Dealership', template: 'I am negotiating the purchase of a used 2023 sedan. The listing price is $34,500. I want to pay no more than $31,000. Watch for hidden fees, inflated APR, and pressure tactics.' },
  { id: 'rental', icon: Home, label: 'Rental Lease', template: 'I am reviewing a 12-month lease renewal. Current rent is $2,100/mo. Landlord wants to raise to $2,450. Watch for illegal fee clauses, maintenance responsibility shifts, and early termination traps.' },
  { id: 'salary', icon: Briefcase, label: 'Salary Negotiation', template: 'I have a job offer at $95,000 base. Market rate for this role is $105-115K. Watch for lowball anchoring, vague equity promises, and benefits trade-off pressure.' },
  { id: 'debt', icon: CreditCard, label: 'Debt Recovery', template: 'A debt collector is contacting me about a $3,200 medical debt. Watch for FDCPA violations, statute of limitations issues, and unauthorized collection tactics.' },
];

export const ScenarioMatrix = () => {
  const { scenario, setScenario, setContext } = useNegotiationStore();

  return (
    <div className="grid grid-cols-2 gap-3">
      {scenarios.map((s, i) => {
        const active = scenario === s.id;
        const Icon = s.icon;
        return (
          <motion.button
            key={s.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            onClick={() => {
              setScenario(s.id);
              setContext(s.template);
            }}
            className={`group relative flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all duration-200 text-center
              ${active
                ? 'border-primary bg-primary/10 glow-green'
                : 'border-border bg-card hover:border-primary/40 hover:bg-primary/5'
              }`}
          >
            <div className={`p-3 rounded-xl transition-colors ${active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground group-hover:text-primary'}`}>
              <Icon size={24} />
            </div>
            <span className="text-sm font-semibold text-foreground">{s.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
