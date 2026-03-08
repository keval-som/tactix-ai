"""Quick end-to-end test of the pipeline: start session → connect WS → send audio → check."""
import asyncio, json, base64, struct, math
import websockets            # pip install websockets
import httpx                 # pip install httpx

BASE = "http://localhost:8000"

# Generate a tiny valid WAV with a beep so Gemini has real audio to chew on
def make_wav_beep(duration_s=2.0, freq=440, sample_rate=16000):
    n_samples = int(sample_rate * duration_s)
    data = b""
    for i in range(n_samples):
        sample = int(32767 * 0.8 * math.sin(2 * math.pi * freq * i / sample_rate))
        data += struct.pack("<h", sample)
    # WAV header
    header = b"RIFF"
    header += struct.pack("<I", 36 + len(data))
    header += b"WAVE"
    header += b"fmt "
    header += struct.pack("<IHHIIHH", 16, 1, 1, sample_rate, sample_rate * 2, 2, 16)
    header += b"data"
    header += struct.pack("<I", len(data))
    return header + data


async def main():
    async with httpx.AsyncClient(timeout=30) as http:
        # 1. Start session
        r = await http.post(f"{BASE}/api/session/start", json={
            "scenario": "car", "context": "Testing transcript", "user_name": "Test"
        })
        sid = r.json()["session_id"]
        print(f"[1] Session started: {sid}")

        # 2. Connect WebSocket
        ws_msgs = []
        async def ws_listener():
            async with websockets.connect(f"ws://localhost:8000/ws/{sid}") as ws:
                try:
                    while True:
                        msg = await asyncio.wait_for(ws.recv(), timeout=20)
                        parsed = json.loads(msg)
                        ws_msgs.append(parsed)
                        print(f"  [WS] type={parsed['type']}  data={json.dumps(parsed['data'])[:120]}")
                except asyncio.TimeoutError:
                    print("  [WS] No more messages (timeout)")

        ws_task = asyncio.create_task(ws_listener())
        await asyncio.sleep(0.5)  # let WS connect

        # 3. Send audio blob
        wav_bytes = make_wav_beep(2.0)
        audio_b64 = base64.b64encode(wav_bytes).decode()
        print(f"[2] Sending audio ({len(wav_bytes)} bytes, {len(audio_b64)} chars b64) ...")
        r = await http.post(f"{BASE}/api/session/{sid}/analyze/audio", json={
            "audio_b64": audio_b64, "mime_type": "audio/wav"
        })
        print(f"[3] Response: {r.json()}")

        # 4. Wait for WS messages (Gemini analysis takes a few seconds)
        await ws_task

        # 5. Summary
        print(f"\n[RESULT] Received {len(ws_msgs)} WebSocket messages:")
        for m in ws_msgs:
            print(f"  - {m['type']}: {json.dumps(m['data'])[:200]}")

        # 6. End session
        r = await http.post(f"{BASE}/api/session/{sid}/end")
        print(f"\n[4] Post-call report keys: {list(r.json().keys())}")

asyncio.run(main())
