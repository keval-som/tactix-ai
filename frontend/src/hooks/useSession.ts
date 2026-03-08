/**
 * useSession — manages the WebSocket connection to the backend and
 * exposes helpers to send transcript chunks and video frames.
 */

import { useEffect, useRef, useCallback } from "react";
import { useNegotiationStore } from "@/store/useNegotiationStore";
import { analyzeTranscript, analyzeFrame, analyzeAudio, endSession as apiEndSession } from "@/services/api";

const WS_URL = "ws://localhost:8000";

export function useSession(sessionId: string | null) {
    const wsRef = useRef<WebSocket | null>(null);
    const addTranscript = useNegotiationStore((s) => s.addTranscript);
    const addActionCard = useNegotiationStore((s) => s.addActionCard);
    const setPostCallReport = useNegotiationStore((s) => s.setPostCallReport);
    const setStage = useNegotiationStore((s) => s.setStage);

    // Open WebSocket when sessionId becomes available
    useEffect(() => {
        if (!sessionId) return;

        const ws = new WebSocket(`${WS_URL}/ws/${sessionId}`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data) as { type: string; data: unknown };

                if (msg.type === "transcript") {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    addTranscript(msg.data as any);
                } else if (msg.type === "action_card") {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    addActionCard(msg.data as any);
                }
            } catch {
                // ignore malformed messages
            }
        };

        ws.onerror = (e) => console.warn("[useSession] WebSocket error", e);

        return () => {
            ws.close();
            wsRef.current = null;
        };
    }, [sessionId, addTranscript, addActionCard]);

    /** Send a transcript chunk to the backend for analysis. */
    const sendTranscript = useCallback(
        async (speaker: "you" | "adversary", text: string) => {
            if (!sessionId || !text.trim()) return;
            try {
                await analyzeTranscript(sessionId, speaker, text);
            } catch (e) {
                console.error("[useSession] sendTranscript error", e);
            }
        },
        [sessionId]
    );

    /** Send a base64 JPEG video frame to the backend for vision analysis. */
    const sendFrame = useCallback(
        async (imageB64: string) => {
            if (!sessionId) return;
            try {
                await analyzeFrame(sessionId, imageB64);
            } catch (e) {
                console.error("[useSession] sendFrame error", e);
            }
        },
        [sessionId]
    );

    /** Send a base64 audio blob for Gemini transcription + analysis. */
    const sendAudio = useCallback(
        async (audioB64: string, mimeType: string) => {
            if (!sessionId) return;
            try {
                await analyzeAudio(sessionId, audioB64, mimeType);
            } catch (e) {
                console.error("[useSession] sendAudio error", e);
            }
        },
        [sessionId]
    );

    /** End the session, fetch the post-call report, and transition to debrief. */
    const endSession = useCallback(async () => {
        if (!sessionId) return;
        try {
            wsRef.current?.close();
            const report = await apiEndSession(sessionId);
            setPostCallReport(report);
        } catch (e) {
            console.error("[useSession] endSession error", e);
        } finally {
            setStage("debrief");
        }
    }, [sessionId, setPostCallReport, setStage]);

    return { sendTranscript, sendFrame, sendAudio, endSession };
}
