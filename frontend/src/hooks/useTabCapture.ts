/**
 * useTabCapture — captures BOTH speakers from the Google Meet tab automatically.
 *
 * Pipeline A — Audio (MediaRecorder, timeslice):
 *   Tab audio track → chunks every 4 seconds → onAudioChunk()
 *   → Backend sends to Gemini which auto-detects "you" vs "adversary" speaker
 *   → Transcript appears in live feed WITHOUT any manual toggle
 *
 * Pipeline B — Video (Canvas):
 *   Tab video track → JPEG frame every 3 seconds → onFrame()
 *   → Backend Gemini Vision analyzes facial expressions + shared documents
 *
 * Both pipelines reuse the stream captured in BriefingStage (capturedStream singleton)
 * so the browser never shows a second getDisplayMedia() prompt.
 *
 * NOTE: The user MUST check "Share tab audio" in Chrome's screen-share dialog,
 * otherwise only video is captured and audio will be silent.
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { getTabStream } from "@/services/capturedStream";

const FRAME_INTERVAL_MS = 3000;
const AUDIO_CHUNK_MS = 4000;  // 4-second chunks → lower latency than 5s
const JPEG_QUALITY = 0.7;

interface UseTabCaptureOptions {
    onFrame: (imageB64: string) => void;
    onAudioChunk: (audioB64: string, mimeType: string) => void;
}

export function useTabCapture({ onFrame, onAudioChunk }: UseTabCaptureOptions) {
    const [isCapturing, setIsCapturing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<BlobPart[]>([]);
    const chunkFlushRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ─── Video frame grab ────────────────────────────────────────────────────
    const captureFrame = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const b64 = canvas.toDataURL("image/jpeg", JPEG_QUALITY).split(",")[1];
        if (b64) onFrame(b64);
    }, [onFrame]);

    // ─── Start ───────────────────────────────────────────────────────────────
    const start = useCallback(async () => {
        try {
            setError(null);

            const stream = getTabStream();
            if (!stream) {
                setError("No tab stream available. Please grant Screen Share in Briefing first.");
                return;
            }

            // ── A. Audio: MediaRecorder with timeslice ─────────────────────────
            const audioTracks = stream.getAudioTracks();
            console.log("[useTabCapture] Found audio tracks:", audioTracks.map(t => ({
                label: t.label,
                kind: t.kind,
                settings: t.getSettings()
            })));

            if (audioTracks.length === 0) {
                setError(
                    "No audio track found in captured tab. " +
                    "When you pick a tab in the screen-share dialog, make sure to tick ✅ 'Share tab audio'."
                );
            } else {
                const audioStream = new MediaStream([audioTracks[0]]);
                const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"]
                    .find((m) => MediaRecorder.isTypeSupported(m)) ?? "";

                const recorder = new MediaRecorder(audioStream, mimeType ? { mimeType } : {});
                mediaRecorderRef.current = recorder;

                recorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 200) {  // skip tiny/silent blobs
                        audioChunksRef.current.push(e.data);
                    }
                };

                // Flush accumulated chunks every AUDIO_CHUNK_MS as a single blob
                chunkFlushRef.current = setInterval(() => {
                    const chunks = audioChunksRef.current.splice(0);
                    console.log(`[useTabCapture] Flushing ${chunks.length} audio chunks...`);
                    if (chunks.length === 0) return;
                    const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
                    console.log(`[useTabCapture] Blob size: ${blob.size} bytes`);
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const b64 = (reader.result as string).split(",")[1];
                        if (b64) onAudioChunk(b64, blob.type);
                    };
                    reader.readAsDataURL(blob);
                }, AUDIO_CHUNK_MS);

                // timeslice=1000 → ondataavailable fires every second into our buffer
                recorder.start(1000);
            }

            // ── B. Video: Canvas frame capture ────────────────────────────────
            const videoTracks = stream.getVideoTracks();
            if (videoTracks.length > 0) {
                const video = document.createElement("video");
                video.srcObject = new MediaStream([videoTracks[0]]);
                video.muted = true;
                video.autoplay = true;
                video.playsInline = true;
                try { await video.play(); } catch { /* autoplay ok */ }
                videoRef.current = video;
                canvasRef.current = document.createElement("canvas");

                // Small delay so video has a chance to paint first frame
                setTimeout(() => {
                    frameTimerRef.current = setInterval(captureFrame, FRAME_INTERVAL_MS);
                }, 1500);
            }

            // Handle user stopping the share from the browser chrome
            stream.getVideoTracks()[0]?.addEventListener("ended", () => stop());
            stream.getAudioTracks()[0]?.addEventListener("ended", () => stop());

            setIsCapturing(true);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            setError(msg);
            console.error("[useTabCapture] start error:", e);
        }
    }, [captureFrame, onAudioChunk]);

    // ─── Stop ────────────────────────────────────────────────────────────────
    const stop = useCallback(() => {
        if (chunkFlushRef.current) { clearInterval(chunkFlushRef.current); chunkFlushRef.current = null; }
        if (frameTimerRef.current) { clearInterval(frameTimerRef.current); frameTimerRef.current = null; }
        if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        videoRef.current = null;
        canvasRef.current = null;
        setIsCapturing(false);
    }, []);

    useEffect(() => () => stop(), [stop]);

    return { start, stop, isCapturing, error };
}
