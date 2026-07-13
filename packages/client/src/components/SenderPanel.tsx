import React, { useRef } from "react";
import type { RtcState, TransferStats } from "../types";
import { StatusBadge } from "./StatusBadge";
import { formatBytes, formatSpeed, MAX_FILE_SIZE } from "../lib/constants";

interface SenderPanelProps {
  roomCode: string;
  shareLink: string;
  peerPresent: boolean;
  rtcState: RtcState;
  selectedFile: File | null;
  stats: TransferStats;
  error: string | null;
  onSelectFile: (file: File) => void;
  onStartTransfer: () => void;
  onSendAnother: () => void;
}

function calculateETA(stats: TransferStats): string {
  if (stats.speed === 0) return "--s";
  const remainingBytes = stats.totalBytes - stats.bytesTransferred;
  const sec = Math.ceil(remainingBytes / stats.speed);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return `${min}m ${remSec}s`;
}

export function SenderPanel({
  roomCode,
  shareLink,
  peerPresent,
  rtcState,
  selectedFile,
  stats,
  error,
  onSelectFile,
  onStartTransfer,
  onSendAnother,
}: SenderPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      const icon = document.getElementById("copy-icon");
      if (icon) {
        icon.textContent = "check";
        icon.classList.add("text-emerald-400");
        setTimeout(() => {
          icon.textContent = "content_copy";
          icon.classList.remove("text-emerald-400");
        }, 1500);
      }
    } catch (e) {
      console.error("Failed to copy", e);
    }
  };

  const handleFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      alert(`File exceeds the ${formatBytes(MAX_FILE_SIZE)} limit.`);
      return;
    }
    onSelectFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const canSend =
    peerPresent &&
    selectedFile &&
    (rtcState === "connected" || rtcState === "idle" || rtcState === "waiting") &&
    !stats.completed &&
    stats.bytesTransferred === 0;

  return (
    <div className="space-y-6">
      {/* Room code display */}
      <div className="backdrop-blur-xl bg-surface-container-low/40 border border-white/10 rounded-2xl p-8 text-center relative overflow-hidden shadow-lg">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/10 blur-[60px] rounded-full pointer-events-none"></div>
        <p className="font-mono-label text-mono-label text-on-surface-variant uppercase mb-3 tracking-[0.2em] text-[10px]">
          Room Code
        </p>
        <div className="font-mono-data text-[40px] leading-none text-primary font-bold tracking-[0.15em] mb-6 drop-shadow-md">
          {roomCode}
        </div>
        <div className="flex items-center bg-surface-container-lowest/80 rounded-xl border border-white/10 p-1.5 w-full transition-colors focus-within:border-primary/40">
          <input
            className="bg-transparent border-none w-full font-mono-data text-[13px] text-on-surface-variant focus:ring-0 px-4 cursor-text truncate outline-none"
            readOnly
            type="text"
            value={shareLink}
          />
          <button
            onClick={() => handleCopy(shareLink)}
            className="p-2.5 rounded-lg hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors flex items-center justify-center shrink-0"
            title="Copy share link"
          >
            <span id="copy-icon" className="material-symbols-outlined text-[18px]">
              content_copy
            </span>
          </button>
        </div>
      </div>

      {/* Connection status */}
      <div className="flex items-center justify-between">
        <StatusBadge state={rtcState} />
        <span className="font-mono-label text-[11px] text-on-surface-variant uppercase tracking-wider">
          {peerPresent ? "Receiver connected" : "Waiting for receiver…"}
        </span>
      </div>

      {/* File selection / Drag and Drop */}
      {peerPresent && !selectedFile && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add("border-primary/50", "bg-primary/5");
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove("border-primary/50", "bg-primary/5");
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove("border-primary/50", "bg-primary/5");
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className="border border-dashed border-white/20 bg-surface-container-lowest/30 rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer h-56 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant group-hover:text-primary transition-colors mb-4 relative z-10">
            cloud_upload
          </span>
          <p className="font-body-md text-body-md text-on-surface mb-2 font-medium relative z-10">
            Drag & drop files here
          </p>
          <p className="font-mono-label text-mono-label text-on-surface-variant relative z-10 tracking-wider text-[11px]">
            or click to browse (max {formatBytes(MAX_FILE_SIZE)})
          </p>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            id="file-input"
          />
        </div>
      )}

      {/* Selected File Card & Transfer details */}
      {selectedFile && (
        <div className="backdrop-blur-xl bg-surface-container-low/40 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 shadow-lg">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-primary/10 rounded-lg text-primary border border-primary/20 shrink-0">
                <span className="material-symbols-outlined text-[20px]">description</span>
              </div>
              <div className="min-w-0">
                <span className="font-mono-data text-[14px] text-on-surface font-medium truncate block max-w-[220px]">
                  {selectedFile.name}
                </span>
                <span className="font-mono-label text-[11px] text-on-surface-variant tracking-wider">
                  {formatBytes(selectedFile.size)}
                </span>
              </div>
            </div>

            {/* Change file option if not started */}
            {!stats.completed && stats.bytesTransferred === 0 && (
              <button
                onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.value = "";
                  onSelectFile(null as unknown as File);
                }}
                className="text-xs text-on-surface-variant hover:text-white hover:underline transition-colors shrink-0"
              >
                Change
              </button>
            )}
          </div>

          {/* Action button to initiate send */}
          {!stats.completed && stats.bytesTransferred === 0 && (
            <button
              onClick={onStartTransfer}
              disabled={!canSend}
              className="w-full bg-white text-black font-mono-label text-[13px] uppercase tracking-wider font-semibold py-3.5 rounded-xl hover:bg-neutral-200 transition-all flex justify-center items-center gap-3 shadow-lg shadow-white/5 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
              Send File
            </button>
          )}

          {/* Real-time progress details */}
          {stats.totalBytes > 0 && !stats.completed && (
            <div className="flex flex-col gap-3 mt-2">
              <div className="flex justify-between items-center">
                <span className="font-mono-label text-[11px] text-on-surface-variant tracking-wider">
                  {stats.progress}% Transferred
                </span>
                <span className="font-mono-label text-[11px] text-on-surface-variant tracking-wider">
                  {formatSpeed(stats.speed)} • ~{calculateETA(stats)} left
                </span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-300 ease-out"
                  style={{ width: `${stats.progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[11px] font-mono-data text-on-surface-variant">
                <span>{formatBytes(stats.bytesTransferred)}</span>
                <span>{formatBytes(stats.totalBytes)}</span>
              </div>
            </div>
          )}

          {/* Success screen inside file card */}
          {stats.completed && (
            <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-xl p-5 flex flex-col gap-4 text-center mt-2 shadow-lg">
              <div className="flex items-center justify-center gap-2 text-emerald-400">
                <span className="material-symbols-outlined text-[24px]">check_circle</span>
                <span className="font-body-md font-semibold">Transfer complete!</span>
              </div>
              <p className="font-body-sm text-[13px] text-on-surface-variant">
                The receiver has successfully saved the zip file.
              </p>
              <button
                onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.value = "";
                  onSendAnother();
                }}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-on-secondary font-mono-label text-[13px] uppercase tracking-wider font-semibold py-3 rounded-xl hover:brightness-110 transition-all flex justify-center items-center gap-3 shadow-lg shadow-emerald-500/20"
              >
                Send Another File
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error alert banner */}
      {error && (
        <div className="backdrop-blur-xl bg-error/5 border border-error/20 rounded-xl p-5 flex items-start gap-4 shadow-lg shadow-error/5">
          <span className="material-symbols-outlined text-error text-[20px] mt-0.5">error</span>
          <div>
            <h4 className="font-body-md text-[14px] text-error font-medium mb-1">Transfer Error</h4>
            <p className="font-body-sm text-[13px] text-error/70 leading-relaxed">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
