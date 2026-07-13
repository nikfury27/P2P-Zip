import { useState, useCallback, useEffect, useRef } from "react";
import type { Role, RtcState, ServerMessage } from "./types";
import { getShareLink } from "./lib/constants";
import { useWebSocket } from "./hooks/useWebSocket";
import { useWebRTC } from "./hooks/useWebRTC";
import { useFileTransfer } from "./hooks/useFileTransfer";
import { HomeScreen } from "./components/HomeScreen";
import { SenderPanel } from "./components/SenderPanel";
import { ReceiverPanel } from "./components/ReceiverPanel";

function parseUrlParams(): { room: string; role: Role | null } {
  const params = new URLSearchParams(window.location.search);
  const room = params.get("room") || "";
  const rawRole = params.get("role");
  const role = rawRole === "sender" || rawRole === "receiver" ? rawRole : null;
  return { room, role };
}

export default function App() {
  const { room: urlRoom, role: urlRole } = parseUrlParams();

  const [role, setRole] = useState<Role | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [peerPresent, setPeerPresent] = useState(false);
  const [rtcState, setRtcState] = useState<RtcState>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [appError, setAppError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inRoom, setInRoom] = useState(false);

  // Track whether we've already auto-joined from URL params
  const autoJoinedRef = useRef(false);

  const ws = useWebSocket();
  const transfer = useFileTransfer();

  // Data channel ref for file transfer access
  const activeDcRef = useRef<RTCDataChannel | null>(null);
  
  // Current role ref so callbacks always see the latest value
  const roleRef = useRef<Role | null>(null);
  roleRef.current = role;

  const handleDataChannel = useCallback(
    (dc: RTCDataChannel) => {
      activeDcRef.current = dc;

      dc.onopen = () => {
        setRtcState("connected");
      };

      dc.onclose = () => {
        activeDcRef.current = null;
      };

      dc.onerror = () => {
        setRtcState("failed");
      };

      // If receiver, set up receive handlers
      if (roleRef.current === "receiver") {
        transfer.setupReceiver(dc);
      }
    },
    [transfer]
  );

  const rtc = useWebRTC({
    role: role || "sender",
    roomCode,
    sendSignal: ws.sendSignal,
    onDataChannel: handleDataChannel,
  });

  // Sync RTC state from the hook
  useEffect(() => {
    setRtcState(rtc.rtcState);
  }, [rtc.rtcState]);

  // ── WebSocket message handler ──

  useEffect(() => {
    const unsub = ws.onMessage((msg: ServerMessage) => {
      switch (msg.type) {
        case "room-joined":
          setRoomCode(msg.roomCode);
          setInRoom(true);
          setRtcState("waiting");
          if (msg.role === "sender") {
            setShareLink(getShareLink(msg.roomCode));
          }
          break;

        case "peer-ready":
          setPeerPresent(true);
          // Sender initiates WebRTC offer
          if (roleRef.current === "sender") {
            rtc.startAsOfferer();
          }
          break;

        case "signal":
          rtc.handleSignal(msg.payload as { type: string; sdp?: string; candidate?: RTCIceCandidateInit });
          break;

        case "peer-left":
          setPeerPresent(false);
          setRtcState("disconnected");
          activeDcRef.current = null;
          rtc.cleanup();

          if (msg.role === "sender") {
            setAppError("Sender disconnected. The room has been closed.");
            setInRoom(false);
          } else {
            setAppError("Receiver disconnected. Waiting for a new receiver…");
            transfer.resetStats();
            setSelectedFile(null);
            setRtcState("waiting");
          }
          break;

        case "error":
          setAppError(msg.message);
          setLoading(false);
          break;
      }
    });
    return unsub;
  }, [ws, rtc, transfer]);

  // ── Actions ──

  const handleCreateRoom = useCallback(async () => {
    setLoading(true);
    setAppError(null);
    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create room");
      const data = await res.json();
      
      setRole("sender");
      roleRef.current = "sender";
      setRoomCode(data.roomCode);
      setShareLink(getShareLink(data.roomCode));

      // Connect WebSocket, then join room
      await ws.connect();
      ws.joinRoom(data.roomCode, "sender");
      setLoading(false);
    } catch (err) {
      setAppError(err instanceof Error ? err.message : "Failed to create room");
      setLoading(false);
    }
  }, [ws]);

  const handleJoinRoom = useCallback(
    async (code: string) => {
      setLoading(true);
      setAppError(null);
      try {
        // Check room exists
        const res = await fetch(`/api/rooms/${code}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Room not found" }));
          throw new Error(data.error || "Room not found");
        }
        const roomInfo = await res.json();
        if (roomInfo.hasReceiver) {
          throw new Error("Room is full — a receiver is already connected.");
        }

        setRole("receiver");
        roleRef.current = "receiver";
        setRoomCode(code);

        // Connect WebSocket, then join room
        await ws.connect();
        ws.joinRoom(code, "receiver");
        setLoading(false);
      } catch (err) {
        setAppError(err instanceof Error ? err.message : "Failed to join room");
        setLoading(false);
      }
    },
    [ws]
  );

  const handleStartTransfer = useCallback(() => {
    if (!selectedFile || !activeDcRef.current) return;
    if (activeDcRef.current.readyState !== "open") {
      setAppError("Data channel is not open yet. Please wait.");
      return;
    }
    transfer.sendFile(selectedFile, activeDcRef.current);
  }, [selectedFile, transfer]);

  const handleSendAnother = useCallback(() => {
    transfer.resetStats();
    setSelectedFile(null);
  }, [transfer]);

  // ── Auto-join from URL params ──

  useEffect(() => {
    if (urlRoom && urlRole === "receiver" && !autoJoinedRef.current && !inRoom) {
      autoJoinedRef.current = true;
      handleJoinRoom(urlRoom.toUpperCase());
    }
  }, [urlRoom, urlRole, handleJoinRoom, inRoom]);

  // ── Back to home ──

  const handleBackToHome = useCallback(() => {
    ws.disconnect();
    rtc.cleanup();
    transfer.resetStats();
    setRole(null);
    roleRef.current = null;
    setRoomCode("");
    setShareLink("");
    setPeerPresent(false);
    setRtcState("idle");
    setSelectedFile(null);
    setAppError(null);
    setInRoom(false);
    activeDcRef.current = null;
    autoJoinedRef.current = false;
    // Clean URL params
    window.history.replaceState({}, "", window.location.pathname);
  }, [ws, rtc, transfer]);

  // ── Render ──

  const combinedError = appError || transfer.error;

  return (
    <div className="min-h-screen flex flex-col font-body-md overflow-x-hidden bg-background text-on-background selection:bg-primary/30">
      {/* Top Status Bar (Only if connecting or disconnected) */}
      {!ws.connected && inRoom && (
        <div className="w-full flex justify-center pt-6 z-50 animate-fade-up">
          <div className="backdrop-blur-md px-5 py-2 rounded-full flex items-center gap-4 border border-white/10 bg-surface-container-highest/50 text-primary shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]">
            <span className="material-symbols-outlined text-[16px]">wifi_tethering</span>
            <span className="font-mono-label text-mono-label tracking-[0.1em] text-on-surface-variant">
              Connecting to signaling server...
            </span>
            <div className="flex gap-1.5 ml-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-pulse"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-pulse" style={{ animationDelay: "150ms" }}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-pulse" style={{ animationDelay: "300ms" }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Canvas */}
      <main className="flex-grow flex items-center justify-center p-gutter relative z-10 w-full max-w-container-max mx-auto min-h-[80vh]">
        {/* App Container */}
        <div className="w-full max-w-[500px] animate-fade-up flex flex-col gap-10">
          {/* Logo Header */}
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-2xl backdrop-blur-xl bg-surface-container-highest/30 border border-white/10 flex items-center justify-center text-primary shadow-[0_8px_32px_-12px_rgba(192,193,255,0.2)]">
              <span className="material-symbols-outlined text-[32px]">sync_alt</span>
            </div>
            <div className="text-center">
              <h1 className="font-headline-md text-headline-md text-on-surface mb-1 font-semibold tracking-tight">
                P2P-Zip
              </h1>
              <p className="font-mono-label text-mono-label text-on-surface-variant uppercase tracking-[0.15em] text-[10px]">
                End-to-end encrypted transfer
              </p>
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && !inRoom && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="inline-block w-8 h-8 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
              <div className="font-mono-label text-[11px] text-on-surface-variant uppercase tracking-wider">
                Connecting to Room...
              </div>
            </div>
          )}

          {/* Error message if generic error outside panels */}
          {appError && !inRoom && !loading && (
            <div className="backdrop-blur-xl bg-error/5 border border-error/20 rounded-xl p-5 flex items-start gap-4 shadow-lg shadow-error/5">
              <span className="material-symbols-outlined text-error text-[20px] mt-0.5">error</span>
              <div>
                <h4 className="font-body-md text-[14px] text-error font-medium mb-1">Error</h4>
                <p className="font-body-sm text-[13px] text-error/70 leading-relaxed">{appError}</p>
              </div>
            </div>
          )}

          {/* Conditional View Rendering */}
          {!inRoom && !loading ? (
            <HomeScreen
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
              initialCode={urlRoom}
              initialRole={urlRole}
              loading={loading}
              error={appError}
            />
          ) : inRoom ? (
            <div className="flex flex-col gap-6">
              {/* Back / Cancel Button */}
              <button
                onClick={handleBackToHome}
                className="text-on-surface-variant hover:text-on-surface font-mono-label text-[11px] uppercase tracking-wider flex items-center gap-2 mb-2 transition-colors self-start"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                {role === "sender" ? "Back" : "Cancel"}
              </button>

              {role === "sender" && (
                <SenderPanel
                  roomCode={roomCode}
                  shareLink={shareLink}
                  peerPresent={peerPresent}
                  rtcState={rtcState}
                  selectedFile={selectedFile}
                  stats={transfer.stats}
                  error={combinedError}
                  onSelectFile={setSelectedFile}
                  onStartTransfer={handleStartTransfer}
                  onSendAnother={handleSendAnother}
                />
              )}

              {role === "receiver" && (
                <ReceiverPanel
                  roomCode={roomCode}
                  peerPresent={peerPresent}
                  rtcState={rtcState}
                  incomingMeta={transfer.incomingMeta}
                  stats={transfer.stats}
                  downloadUrl={transfer.downloadUrl}
                  error={combinedError}
                  saveReady={transfer.saveReady}
                  onPromptSave={transfer.promptSaveLocation}
                />
              )}
            </div>
          ) : null}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-container-max mx-auto px-gutter py-8 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-white/10 relative z-10 opacity-70 hover:opacity-100 transition-opacity mt-auto">
        <p className="font-mono-label text-[10px] text-on-surface-variant uppercase tracking-[0.15em]">
          © 2026 P2P-Zip Protocol. End-to-end encrypted.
        </p>
        <div className="flex gap-6 font-mono-label text-[11px] uppercase tracking-wider">
          <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">
            Documentation
          </a>
          <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">
            Privacy
          </a>
          <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="https://github.com/nikfury27/P2P-Zip" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
