import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Radio, Clock, ShieldAlert, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { useNegotiationStore } from '@/store/useNegotiationStore';
import { TranscriptFeed } from './TranscriptFeed';
import { ActionCardComponent } from './ActionCardComponent';
import { useSession } from '@/hooks/useSession';
import { useTabCapture } from '@/hooks/useTabCapture';

export const BattleStage = () => {
  const {
    transcript,
    actionCards,
    sessionId,
  } = useNegotiationStore();

  const sortedCards = [...actionCards].sort((a, b) => b.timestamp - a.timestamp);

  // ─── Session timer ────────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ─── Session hook (WebSocket receive + HTTP send) ─────────────────────────
  const { sendFrame, sendAudio, endSession } = useSession(sessionId);

  // ─── Tab capture: tab audio → Gemini auto-diarizes → transcript via WS ───
  const handleAudioChunk = useCallback(
    (audioB64: string, mimeType: string) => { sendAudio(audioB64, mimeType); },
    [sendAudio]
  );

  const { start: startCapture, stop: stopCapture, isCapturing, error: captureError } = useTabCapture({
    onFrame: sendFrame,
    onAudioChunk: handleAudioChunk,
  });

  // Auto-start tab capture when the battle stage mounts
  useEffect(() => {
    if (sessionId && sessionId !== 'mock-session') {
      startCapture();
    }
    return () => stopCapture();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleEndSession = useCallback(async () => {
    stopCapture();
    if (timerRef.current) clearInterval(timerRef.current);
    await endSession();
  }, [stopCapture, endSession]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col overflow-hidden"
    >
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-4">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gotcha animate-pulse-glow" />
            <span className="text-[10px] font-mono font-bold text-gotcha tracking-wider">LIVE</span>
          </div>

          {/* Capture status */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Radio size={12} />
            <span className="text-[10px] font-mono">
              {isCapturing ? 'CAPTURING MEET TAB' : 'STANDBY'}
            </span>
          </div>

          {/* Vision status */}
          <div className={`flex items-center gap-1.5 ${isCapturing ? 'text-primary' : 'text-muted-foreground'}`}>
            {isCapturing ? <Eye size={12} /> : <EyeOff size={12} />}
            <span className="text-[10px] font-mono">VISION {isCapturing ? 'ON' : 'OFF'}</span>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock size={12} />
            <span className="text-[10px] font-mono">{formatTime(elapsed)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Alert count */}
          <div className="flex items-center gap-1.5 text-primary">
            <ShieldAlert size={12} />
            <span className="text-[10px] font-mono font-bold">{actionCards.length} ALERTS</span>
          </div>

          {/* End session */}
          <button
            onClick={handleEndSession}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-mono font-bold hover:bg-primary/90 transition-colors"
          >
            END SESSION
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Capture error banner */}
      {captureError && (
        <div className="px-4 py-2 bg-gotcha/10 border-b border-gotcha/20 text-gotcha text-[10px] font-mono">
          ⚠️ {captureError}
        </div>
      )}

      {/* Audio capture tip banner */}
      {isCapturing && transcript.length === 0 && (
        <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 text-primary text-[10px] font-mono">
          🎙️ Listening to Meet tab audio — both speakers detected automatically. Transcript appears every ~4s.
        </div>
      )}

      {/* Split Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Transcript - 60% */}
        <div className="w-[60%] flex flex-col border-r">
          <div className="px-4 py-2 border-b bg-card flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-muted-foreground tracking-wider">
              LIVE TRANSCRIPT
            </h3>
            <span className="text-[10px] font-mono text-muted-foreground">
              {transcript.length} entries
            </span>
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
            {sortedCards.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mb-3">
                  <ShieldAlert size={16} className="text-muted-foreground" />
                </div>
                <p className="text-xs font-mono text-muted-foreground">
                  Monitoring for tactics...
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  Cards appear when AI detects something
                </p>
              </div>
            )}
            {sortedCards.map((card, i) => (
              <ActionCardComponent key={card.id} card={card} index={i} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
