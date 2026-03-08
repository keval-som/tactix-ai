import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Camera, Mic, Monitor, CheckCircle2, Loader2 } from 'lucide-react';
import { useNegotiationStore } from '@/store/useNegotiationStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScenarioMatrix } from './ScenarioCard';
import { setTabStream } from '@/services/capturedStream';

const SUGGESTIONS = [
  'Big Purchase (Car/Home)',
  'Debt/Bills (Collectors/Hospital)',
  'Career (Salary/Promotion)',
  'Lease/Rent (Landlord)',
];

interface PermissionItemProps {
  icon: React.ElementType;
  label: string;
  description: string;
  granted: boolean;
  onRequest: () => void;
}

const PermissionItem = ({ icon: Icon, label, description, granted, onRequest }: PermissionItemProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onRequest}
    className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all flex-1 cursor-pointer ${granted ? 'border-check/40 bg-check/10' : 'border-border bg-card hover:border-muted-foreground/40'
      }`}
  >
    <div className={`p-1.5 rounded-lg mb-2 transition-colors ${granted ? 'bg-check/20 text-check' : 'bg-secondary text-muted-foreground'}`}>
      <Icon size={16} />
    </div>
    <p className={`text-xs font-semibold transition-colors ${granted ? 'text-check' : 'text-foreground'}`}>{label}</p>
    <p className="text-[10px] text-muted-foreground line-clamp-1">{description}</p>
    {granted && <CheckCircle2 size={12} className="text-check mt-1" />}
  </motion.div>
);

export const BriefingStage = () => {
  const { userName, setUserName, purpose, setPurpose, scenario, setScenario, setContext, launchSession, isLaunching } = useNegotiationStore();
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [permissions, setPermissions] = useState({ camera: false, audio: false, screen: false });

  // Hold real browser streams so they remain open when Battle stage mounts
  const micStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const handleNameSubmit = () => {
    if (!userName.trim()) return;
    setNameSubmitted(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPurpose(suggestion);
    if (suggestion.includes('Car') || suggestion.includes('Home')) setScenario('car');
    else if (suggestion.includes('Debt') || suggestion.includes('Bills')) setScenario('debt');
    else if (suggestion.includes('Career') || suggestion.includes('Salary')) setScenario('salary');
    else if (suggestion.includes('Lease') || suggestion.includes('Rent')) setScenario('rental');
  };

  const requestCamera = useCallback(async () => {
    if (permissions.camera) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraStreamRef.current = stream;
      setPermissions((p) => ({ ...p, camera: true }));
    } catch (e) {
      console.error('[BriefingStage] camera permission denied', e);
      alert('Camera permission denied. Please allow camera access and try again.');
    }
  }, [permissions.camera]);

  const requestAudio = useCallback(async () => {
    if (permissions.audio) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setPermissions((p) => ({ ...p, audio: true }));
    } catch (e) {
      console.error('[BriefingStage] mic permission denied', e);
      alert('Microphone permission denied. Please allow microphone access and try again.');
    }
  }, [permissions.audio]);

  const requestScreen = useCallback(async () => {
    if (permissions.screen) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 5 },
        audio: true,
      });
      screenStreamRef.current = stream;
      // Save to singleton — BattleStage reuses this, no second prompt
      setTabStream(stream);
      setPermissions((p) => ({ ...p, screen: true }));
      // If user stops sharing from the browser bar, reset permission
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        setTabStream(null);
        setPermissions((p) => ({ ...p, screen: false }));
        screenStreamRef.current = null;
      });
    } catch (e) {
      console.error('[BriefingStage] screen share denied', e);
      alert('Screen share permission denied or cancelled. Please try again.');
    }
  }, [permissions.screen]);

  const allGranted = permissions.camera && permissions.audio && permissions.screen;

  const handleLaunch = useCallback(async () => {
    if (!allGranted || isLaunching) return;
    // Set the context from purpose field before launching
    setContext(purpose);
    await launchSession();
  }, [allGranted, isLaunching, purpose, setContext, launchSession]);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <AnimatePresence mode="wait">
        {!nameSubmitted ? (
          <motion.div
            key="name-entry"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md space-y-8 text-center"
          >
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground tracking-tight">
                Welcome to Tactix
              </h2>
              <p className="text-sm text-muted-foreground">
                Your AI-powered negotiation wingman. Let's get started.
              </p>
            </div>

            <div className="space-y-4">
              <div className="text-left">
                <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2 block">
                  What's your name?
                </label>
                <Input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                  placeholder="Enter your name..."
                  className="h-12 rounded-xl border-2 border-border bg-card text-foreground text-sm focus:border-primary"
                  autoFocus
                />
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={handleNameSubmit}
                  disabled={!userName.trim()}
                  className="w-full h-12 rounded-xl font-bold text-sm tracking-wider gap-2"
                >
                  CONTINUE
                  <ArrowRight size={16} />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="main-briefing"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-xl space-y-8"
          >
            {/* Greeting */}
            <div className="text-center space-y-1">
              <h2 className="text-3xl font-bold text-foreground tracking-tight">
                Hi, {userName}
              </h2>
              <p className="text-sm text-muted-foreground">
                What are you negotiating today?
              </p>
            </div>

            {/* Search-style text box */}
            <div className="space-y-4">
              <Input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Describe your situation (optional)..."
                className="h-12 rounded-full border-2 border-border bg-card text-foreground text-sm px-5 focus:border-primary shadow-sm"
              />

              {/* Horizontal suggestions */}
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <motion.button
                    key={s}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSuggestionClick(s)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${purpose === s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                      }`}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase block">
                Permissions Required
              </label>
              <div className="flex gap-2">
                <PermissionItem
                  icon={Camera}
                  label="Camera"
                  description="Used to scan documents & contracts"
                  granted={permissions.camera}
                  onRequest={requestCamera}
                />
                <PermissionItem
                  icon={Mic}
                  label="Microphone"
                  description="Captures live conversation for analysis"
                  granted={permissions.audio}
                  onRequest={requestAudio}
                />
                <PermissionItem
                  icon={Monitor}
                  label="Screen Share"
                  description="Captures Meet tab audio + video"
                  granted={permissions.screen}
                  onRequest={requestScreen}
                />
              </div>
              {!permissions.screen && (
                <p className="text-[10px] text-muted-foreground text-center mt-1">
                  💡 For Screen Share: select your Google Meet tab and enable "Share tab audio"
                </p>
              )}
            </div>

            {/* Launch */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLaunch}
              disabled={!allGranted || isLaunching}
              className={`w-full py-4 rounded-xl font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-all duration-300
                ${allGranted && !isLaunching
                  ? 'bg-primary text-primary-foreground glow-green cursor-pointer'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
            >
              {isLaunching ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  BRIEFING AI...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  {allGranted ? 'LAUNCH TACTIX' : 'GRANT ALL PERMISSIONS TO CONTINUE'}
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
