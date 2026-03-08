/**
 * capturedStream.ts — module-level singleton holding the tab MediaStream.
 *
 * BriefingStage stores the stream here after the user grants permission.
 * BattleStage / useTabCapture reads from here — no second getDisplayMedia() prompt.
 */

let _tabStream: MediaStream | null = null;

export function setTabStream(stream: MediaStream | null) {
    _tabStream = stream;
}

export function getTabStream(): MediaStream | null {
    return _tabStream;
}
