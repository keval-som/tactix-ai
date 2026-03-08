const BASE_URL = "http://localhost:8000";

export interface ActionCard {
  id: string;
  type: "LEGAL_SHIELD" | "MATH_CHECK" | "PSYCH_CUE" | "VISION_GOTCHA";
  title: string;
  description: string;
  timestamp: number;
  savings?: number | null;
}

export interface TranscriptEntry {
  id: string;
  speaker: "you" | "adversary";
  text: string;
  timestamp: number;
  highlights?: string[];
}

export interface PostCallReport {
  stats: {
    savings: number;
    traps_deflected: number;
    outcome_sentiment: string;
  };
  follow_up_email: string;
}

export interface StartSessionResponse {
  session_id: string;
}

// ─── Session Lifecycle ────────────────────────────────────────────────────────

export async function startSession(
  scenario: string,
  context: string,
  userName: string
): Promise<StartSessionResponse> {
  const res = await fetch(`${BASE_URL}/api/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario, context, user_name: userName }),
  });
  if (!res.ok) throw new Error(`startSession failed: ${res.statusText}`);
  return res.json();
}

export async function endSession(sessionId: string): Promise<PostCallReport> {
  const res = await fetch(`${BASE_URL}/api/session/${sessionId}/end`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`endSession failed: ${res.statusText}`);
  return res.json();
}

// ─── Analysis Triggers ────────────────────────────────────────────────────────

export async function analyzeTranscript(
  sessionId: string,
  speaker: "you" | "adversary",
  text: string
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/session/${sessionId}/analyze/transcript`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speaker, text }),
    }
  );
  if (!res.ok) throw new Error(`analyzeTranscript failed: ${res.statusText}`);
}

export async function analyzeFrame(
  sessionId: string,
  imageB64: string
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/session/${sessionId}/analyze/frame`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_b64: imageB64 }),
    }
  );
  if (!res.ok) throw new Error(`analyzeFrame failed: ${res.statusText}`);
}

export async function analyzeAudio(
  sessionId: string,
  audioB64: string,
  mimeType: string
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/session/${sessionId}/analyze/audio`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio_b64: audioB64, mime_type: mimeType }),
    }
  );
  if (!res.ok) throw new Error(`analyzeAudio failed: ${res.statusText}`);
}
