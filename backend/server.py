import os
import uuid
import asyncio
import json
from typing import Dict, List
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agents.services.orchestrator import analyze_multimodal
from agents.services.vision_gemini import analyze_facial_expression, analyze_document_frame
from agents.services.audio_gemini import transcribe_and_analyze_audio
from agents.services.postcall import generate_post_call_report

app = FastAPI(title="TactiX AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# In-memory session store
# ──────────────────────────────────────────────
sessions: Dict[str, dict] = {}
ws_connections: Dict[str, List[WebSocket]] = {}


# ──────────────────────────────────────────────
# Pydantic models
# ──────────────────────────────────────────────
class StartSessionRequest(BaseModel):
    scenario: str
    context: str = ""
    user_name: str = "User"


class TranscriptRequest(BaseModel):
    speaker: str   # "you" | "adversary"
    text: str


class FrameRequest(BaseModel):
    image_b64: str  # base64-encoded JPEG


class AudioRequest(BaseModel):
    audio_b64: str   # base64-encoded audio blob (webm/ogg)
    mime_type: str = "audio/webm"


# ──────────────────────────────────────────────
# Helper: broadcast to all WS clients
# ──────────────────────────────────────────────
async def broadcast(session_id: str, payload: dict):
    dead = []
    for ws in ws_connections.get(session_id, []):
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            dead.append(ws)
    for ws in dead:
        ws_connections[session_id].remove(ws)


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/session/start")
async def start_session(req: StartSessionRequest):
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "id": session_id,
        "scenario": req.scenario,
        "context": req.context,
        "user_name": req.user_name,
        "transcript": [],
        "conversation_history": [],  # keeps {role, content} pairs for orchestrator
        "action_cards": [],
    }
    ws_connections[session_id] = []
    return {"session_id": session_id}


# ── Transcript endpoint ───────────────────────────────────────────────────────
@app.post("/api/session/{session_id}/analyze/transcript")
async def analyze_transcript_endpoint(session_id: str, req: TranscriptRequest):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]
    role = "user" if req.speaker == "you" else "adversary"
    entry = {"speaker": req.speaker, "text": req.text}
    session["transcript"].append(entry)
    session["conversation_history"].append({"role": role, "content": req.text})

    # Echo transcript immediately
    await broadcast(session_id, {
        "type": "transcript",
        "data": {
            "id": str(uuid.uuid4()),
            "speaker": req.speaker,
            "text": req.text,
            "timestamp": int(asyncio.get_event_loop().time() * 1000),
            "highlights": [],
        }
    })

    asyncio.create_task(_run_transcript_analysis(session_id, req.speaker, req.text, session))
    return {"status": "processing"}


async def _run_transcript_analysis(session_id: str, speaker: str, text: str, session: dict):
    try:
        result = await asyncio.to_thread(
            analyze_multimodal, {
                "transcript": text,
                "sentiment": {},
                "dataset_info": "",
                "user_context": session.get("context", ""),
                "conversation_history": session["conversation_history"][-5:],
            }
        )

        # Map the orchestrator result → ActionCard(s) for the frontend
        cards = _result_to_cards(result, speaker)
        for card in cards:
            card["id"] = str(uuid.uuid4())
            card["timestamp"] = int(asyncio.get_event_loop().time() * 1000)
            session["action_cards"].append(card)
            await broadcast(session_id, {"type": "action_card", "data": card})
    except Exception as e:
        print(f"[transcript analysis error] {e}")


def _result_to_cards(result: dict, speaker: str) -> list:
    """Convert the orchestrator output to ActionCard format for the frontend."""
    cards = []
    risk = result.get("risk_level", "Low")
    tactic = result.get("tactic_detected", "none")

    # Only surface cards when the adversary is speaking and something is detected
    if speaker != "adversary" or tactic in ("none", ""):
        return cards

    card_type = "PSYCH_CUE"
    if risk == "High":
        card_type = "LEGAL_SHIELD"
    elif tactic in ("urgency", "pressure"):
        card_type = "PSYCH_CUE"

    title_map = {
        "urgency": "False Urgency Detected",
        "pressure": "Pressure Tactic Detected",
        "other": "Manipulation Cue Detected",
    }

    cards.append({
        "type": card_type,
        "title": title_map.get(tactic, "Tactic Detected"),
        "description": result.get("recommended_response", ""),
        "savings": None,
    })
    return cards


# ── Frame (vision) endpoint ───────────────────────────────────────────────────
@app.post("/api/session/{session_id}/analyze/frame")
async def analyze_frame_endpoint(session_id: str, req: FrameRequest):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    asyncio.create_task(_run_frame_analysis(session_id, req.image_b64, sessions[session_id]))
    return {"status": "processing"}


async def _run_frame_analysis(session_id: str, image_b64: str, session: dict):
    try:
        facial_task = asyncio.to_thread(analyze_facial_expression, image_b64)
        doc_task    = asyncio.to_thread(analyze_document_frame, image_b64)
        facial_cards, doc_cards = await asyncio.gather(facial_task, doc_task, return_exceptions=True)

        all_cards = []
        if not isinstance(facial_cards, Exception): all_cards.extend(facial_cards)
        if not isinstance(doc_cards, Exception):    all_cards.extend(doc_cards)

        for card in all_cards:
            card["id"] = str(uuid.uuid4())
            card["timestamp"] = int(asyncio.get_event_loop().time() * 1000)
            session["action_cards"].append(card)
            await broadcast(session_id, {"type": "action_card", "data": card})
    except Exception as e:
        print(f"[frame analysis error] {e}")


# ── Audio endpoint ────────────────────────────────────────────────────────────
@app.post("/api/session/{session_id}/analyze/audio")
async def analyze_audio_endpoint(session_id: str, req: AudioRequest):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    asyncio.create_task(
        _run_audio_analysis(session_id, req.audio_b64, req.mime_type, sessions[session_id])
    )
    return {"status": "processing"}


async def _run_audio_analysis(session_id: str, audio_b64: str, mime_type: str, session: dict):
    try:
        result = await asyncio.to_thread(
            transcribe_and_analyze_audio, audio_b64, mime_type,
            session.get("scenario", ""), session.get("context", ""),
            session["transcript"][-10:]
        )

        for segment in result.get("segments", []):
            speaker = segment.get("speaker", "adversary")
            text    = segment.get("text", "").strip()
            if not text:
                continue
            session["transcript"].append({"speaker": speaker, "text": text})
            session["conversation_history"].append({"role": speaker, "content": text})

            await broadcast(session_id, {
                "type": "transcript",
                "data": {
                    "id": str(uuid.uuid4()),
                    "speaker": speaker,
                    "text": text,
                    "timestamp": int(asyncio.get_event_loop().time() * 1000),
                    "highlights": segment.get("highlights", []),
                }
            })

        for card in result.get("action_cards", []):
            card["id"] = str(uuid.uuid4())
            card["timestamp"] = int(asyncio.get_event_loop().time() * 1000)
            session["action_cards"].append(card)
            await broadcast(session_id, {"type": "action_card", "data": card})

    except Exception as e:
        print(f"[audio analysis error] {e}")


# ── Session end ───────────────────────────────────────────────────────────────
@app.post("/api/session/{session_id}/end")
async def end_session(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]
    full_transcript = "\n".join(
        f"{e['speaker'].upper()}: {e['text']}" for e in session["transcript"]
    )
    report = await asyncio.to_thread(
        generate_post_call_report, full_transcript, session["action_cards"]
    )

    ws_connections.pop(session_id, None)
    sessions.pop(session_id, None)
    return report


# ── WebSocket ──────────────────────────────────────────────────────────────────
@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    if session_id not in ws_connections:
        ws_connections[session_id] = []
    ws_connections[session_id].append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if session_id in ws_connections:
            try: ws_connections[session_id].remove(websocket)
            except ValueError: pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
