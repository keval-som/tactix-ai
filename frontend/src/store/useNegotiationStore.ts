import { create } from 'zustand';
import { startSession as apiStartSession } from '@/services/api';
import type { PostCallReport } from '@/services/api';

export type CardType = 'LEGAL_SHIELD' | 'MATH_CHECK' | 'PSYCH_CUE' | 'VISION_GOTCHA';

export interface ActionCard {
  id: string;
  type: CardType;
  title: string;
  description: string;
  timestamp: number;
  savings?: number | null;
}

export interface TranscriptEntry {
  id: string;
  speaker: 'you' | 'adversary';
  text: string;
  timestamp: number;
  highlights?: string[];
}

export type Stage = 'briefing' | 'battle' | 'debrief';
export type Scenario = 'car' | 'rental' | 'salary' | 'debt' | null;

interface ReadinessState {
  vision: 'idle' | 'ready';
  audio: 'idle' | 'listening';
  logic: 'idle' | 'active';
}

interface NegotiationState {
  stage: Stage;
  scenario: Scenario;
  context: string;
  userName: string;
  purpose: string;
  readiness: ReadinessState;
  transcript: TranscriptEntry[];
  actionCards: ActionCard[];
  theme: 'light' | 'dark';
  sessionId: string | null;
  postCallReport: PostCallReport | null;
  activeSpeaker: 'you' | 'adversary';
  isLaunching: boolean;

  setStage: (stage: Stage) => void;
  setScenario: (scenario: Scenario) => void;
  setContext: (context: string) => void;
  setUserName: (name: string) => void;
  setPurpose: (purpose: string) => void;
  setReadiness: (readiness: Partial<ReadinessState>) => void;
  addTranscript: (entry: TranscriptEntry) => void;
  addActionCard: (card: ActionCard) => void;
  toggleTheme: () => void;
  reset: () => void;
  launchSession: () => Promise<void>;
  setSessionId: (id: string | null) => void;
  setPostCallReport: (report: PostCallReport | null) => void;
  setActiveSpeaker: (speaker: 'you' | 'adversary') => void;
  loadMockData: () => void;   // dev shortcut
}

// ── Mock data kept for dev/testing ───────────────────────────────────────────
const MOCK_TRANSCRIPT: TranscriptEntry[] = [
  { id: '1', speaker: 'adversary', text: "So this vehicle is priced at $34,500 and that's actually below market value. We can't go any lower.", timestamp: Date.now() - 120000, highlights: ['$34,500', 'below market value'] },
  { id: '2', speaker: 'you', text: "I've done some research. KBB shows this model at about $31,000 for this mileage.", timestamp: Date.now() - 100000, highlights: ['$31,000'] },
  { id: '3', speaker: 'adversary', text: "Well, there's also the dealer prep fee of $995 and the documentation fee of $499. Those are standard.", timestamp: Date.now() - 80000, highlights: ['$995', '$499', 'dealer prep fee', 'documentation fee'] },
  { id: '4', speaker: 'you', text: "Can you break down what the dealer prep fee covers exactly?", timestamp: Date.now() - 60000 },
  { id: '5', speaker: 'adversary', text: "That covers our inspection, detailing, and getting the vehicle ready. It's non-negotiable. And honestly, I have two other buyers looking at this same car today.", timestamp: Date.now() - 40000, highlights: ['non-negotiable', 'two other buyers', 'today'] },
  { id: '6', speaker: 'you', text: "I'd like to see those fees itemized. Also, what's the APR on the financing you mentioned?", timestamp: Date.now() - 20000, highlights: ['APR'] },
  { id: '7', speaker: 'adversary', text: "We can get you a great monthly payment of just $489 for 72 months. Very affordable.", timestamp: Date.now(), highlights: ['$489', '72 months'] },
];

const MOCK_CARDS: ActionCard[] = [
  { id: 'c1', type: 'MATH_CHECK', title: 'Hidden APR Detected', description: '$489/mo × 72 months = $35,208 total. On a $34,500 vehicle, that\'s a hidden 7.2% APR. Ask for the actual interest rate.', timestamp: Date.now() - 35000, savings: 3200 },
  { id: 'c2', type: 'PSYCH_CUE', title: 'Scarcity Tactic Detected', description: '"Two other buyers today" is a classic pressure tactic. 73% of dealers use this line. Remain calm — you have leverage.', timestamp: Date.now() - 38000 },
  { id: 'c3', type: 'LEGAL_SHIELD', title: 'Junk Fee Alert', description: '"Dealer prep fee" is not legally required in most states. This $995 charge covers work already included in the vehicle price. You can refuse.', timestamp: Date.now() - 75000, savings: 995 },
  { id: 'c4', type: 'VISION_GOTCHA', title: 'Price Discrepancy Found', description: 'Online listing showed $32,900 but verbal quote is $34,500. Screenshot captured. Use this as leverage.', timestamp: Date.now() - 110000, savings: 1600 },
  { id: 'c5', type: 'PSYCH_CUE', title: 'Anchoring Bias Alert', description: 'Seller opened with a high anchor price. Counter-anchor with KBB fair market value of $31,000 to reframe negotiation.', timestamp: Date.now() - 115000 },
  { id: 'c6', type: 'LEGAL_SHIELD', title: 'Doc Fee Exceeds State Cap', description: 'Documentation fee of $499 exceeds your state\'s legal maximum of $200. Cite state statute to negotiate down.', timestamp: Date.now() - 70000, savings: 299 },
];

export const useNegotiationStore = create<NegotiationState>((set, get) => ({
  stage: 'briefing',
  scenario: null,
  context: '',
  userName: '',
  purpose: '',
  readiness: { vision: 'idle', audio: 'idle', logic: 'idle' },
  transcript: [],
  actionCards: [],
  theme: 'dark',
  sessionId: null,
  postCallReport: null,
  activeSpeaker: 'adversary',
  isLaunching: false,

  setStage: (stage) => set({ stage }),
  setScenario: (scenario) => set({ scenario }),
  setContext: (context) => set({ context }),
  setUserName: (name) => set({ userName: name }),
  setPurpose: (purpose) => set({ purpose }),
  setReadiness: (partial) => set((s) => ({ readiness: { ...s.readiness, ...partial } })),
  addTranscript: (entry) => set((s) => ({ transcript: [...s.transcript, entry] })),
  addActionCard: (card) => set((s) => ({ actionCards: [...s.actionCards, card] })),
  setSessionId: (id) => set({ sessionId: id }),
  setPostCallReport: (report) => set({ postCallReport: report }),
  setActiveSpeaker: (speaker) => set({ activeSpeaker: speaker }),

  toggleTheme: () => set((s) => {
    const next = s.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    return { theme: next };
  }),

  reset: () => set({
    stage: 'briefing',
    scenario: null,
    context: '',
    readiness: { vision: 'idle', audio: 'idle', logic: 'idle' },
    transcript: [],
    actionCards: [],
    sessionId: null,
    postCallReport: null,
    activeSpeaker: 'adversary',
    isLaunching: false,
  }),

  launchSession: async () => {
    const { scenario, context, userName } = get();
    set({ isLaunching: true });
    try {
      const { session_id } = await apiStartSession(
        scenario ?? 'general',
        context,
        userName
      );
      set({
        sessionId: session_id,
        stage: 'battle',
        readiness: { vision: 'ready', audio: 'listening', logic: 'active' },
        transcript: [],
        actionCards: [],
        isLaunching: false,
      });
    } catch (e) {
      console.error('[launchSession] failed to start session:', e);
      set({ isLaunching: false });
    }
  },

  // Keep mock data for development testing
  loadMockData: () => set({
    stage: 'battle',
    readiness: { vision: 'ready', audio: 'listening', logic: 'active' },
    transcript: MOCK_TRANSCRIPT,
    actionCards: MOCK_CARDS,
    sessionId: 'mock-session',
  }),
}));
