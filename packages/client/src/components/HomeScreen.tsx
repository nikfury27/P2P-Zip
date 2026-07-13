import { useState } from "react";
import type { Role } from "../types";
import { formatBytes, MAX_FILE_SIZE } from "../lib/constants";

interface HomeScreenProps {
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  initialCode: string;
  initialRole: Role | null;
  loading: boolean;
  error: string | null;
}

export function HomeScreen({
  onCreateRoom,
  onJoinRoom,
  initialCode,
  loading,
}: HomeScreenProps) {
  const [joinCode, setJoinCode] = useState(initialCode);

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    onJoinRoom(code);
  };

  return (
    <div className="grid gap-6 transition-all duration-300 block" id="view-home">
      {/* Send Card */}
      <button
        disabled={loading}
        className="w-full backdrop-blur-xl bg-surface-container-low/40 border border-white/10 rounded-2xl flex flex-col items-start text-left group hover:scale-[1.01] hover:bg-surface-container-low/60 hover:border-white/20 transition-all duration-300 p-8 shadow-lg disabled:opacity-50"
        onClick={onCreateRoom}
      >
        <div className="flex justify-between items-start w-full mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/5 flex items-center justify-center text-primary group-hover:from-indigo-500/30 group-hover:to-violet-500/30 transition-colors">
            <span className="material-symbols-outlined text-[24px]">upload_file</span>
          </div>
          <span className="font-mono-label text-[10px] px-2.5 py-1 bg-surface-container-highest/50 border border-white/10 rounded-md text-primary tracking-wider uppercase">
            Direct WebRTC Stream
          </span>
        </div>
        <div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-2 font-medium">
            {loading ? "Creating Room..." : "Send a File"}
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            Generate a secure room code to share files directly from your browser (max {formatBytes(MAX_FILE_SIZE)}).
          </p>
        </div>
      </button>

      {/* Receive Card */}
      <div className="w-full backdrop-blur-xl bg-surface-container-low/40 border border-white/10 rounded-2xl flex flex-col items-start relative overflow-hidden group p-8 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 relative z-10">
          <span className="material-symbols-outlined text-[24px]">download_for_offline</span>
        </div>
        <div className="w-full relative z-10">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4 font-medium">
            Receive a File
          </h2>
          <div className="flex w-full gap-3 items-stretch">
            <input
              id="join-code-input"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="Enter Room Code"
              maxLength={8}
              type="text"
              disabled={loading}
              className="flex-grow bg-surface-container-lowest/80 border border-white/10 rounded-xl px-5 py-3.5 font-mono-data text-mono-data text-on-surface focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 placeholder:text-on-surface-variant/50 transition-all uppercase tracking-widest text-[15px] disabled:opacity-50"
            />
            <button
              id="join-room-btn"
              onClick={handleJoin}
              disabled={loading || !joinCode.trim()}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-on-secondary px-6 py-3.5 rounded-xl font-mono-label text-mono-label uppercase hover:brightness-110 transition-all flex items-center justify-center shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
