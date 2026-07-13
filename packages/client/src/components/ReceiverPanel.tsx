import { useCallback, useState } from "react";
import type { RtcState, TransferStats, FileMeta } from "../types";
import { StatusBadge } from "./StatusBadge";
import { formatBytes, formatSpeed } from "../lib/constants";

interface ReceiverPanelProps {
  roomCode: string;
  peerPresent: boolean;
  rtcState: RtcState;
  incomingMeta: FileMeta | null;
  stats: TransferStats;
  downloadUrl: string | null;
  error: string | null;
  saveReady: boolean;
  onPromptSave: (meta: FileMeta) => Promise<boolean>;
}

export function ReceiverPanel({
  roomCode,
  peerPresent,
  rtcState,
  incomingMeta,
  stats,
  downloadUrl,
  error,
  saveReady,
  onPromptSave,
}: ReceiverPanelProps) {
  const [picking, setPicking] = useState(false);
  const [streamMode, setStreamMode] = useState(false);

  const handleChooseSaveLocation = useCallback(async () => {
    if (!incomingMeta) return;
    setPicking(true);
    try {
      const isStreaming = await onPromptSave(incomingMeta);
      setStreamMode(isStreaming);
    } catch (e) {
      console.error("Save location selection canceled or failed", e);
    } finally {
      setPicking(false);
    }
  }, [incomingMeta, onPromptSave]);

  const savedToDisk = downloadUrl === "saved-to-disk";

  return (
    <div className="space-y-6">
      {/* Room info */}
      <div className="backdrop-blur-xl bg-surface-container-low/40 border border-white/10 rounded-2xl p-6 text-center relative overflow-hidden shadow-lg">
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-primary/10 blur-[60px] rounded-full pointer-events-none"></div>
        <p className="font-mono-label text-mono-label text-on-surface-variant uppercase mb-2 tracking-[0.2em] text-[10px]">
          Joined Room
        </p>
        <div className="font-mono-data text-[36px] leading-none text-primary font-bold tracking-[0.15em] mb-2 drop-shadow-md">
          {roomCode}
        </div>
      </div>

      {/* Connection status */}
      <div className="flex items-center justify-between">
        <StatusBadge state={rtcState} />
        <span className="font-mono-label text-[11px] text-on-surface-variant uppercase tracking-wider">
          {peerPresent ? "Sender connected" : "Waiting for sender…"}
        </span>
      </div>

      {/* Incoming file metadata and save location selection */}
      {incomingMeta && (
        <div className="backdrop-blur-xl bg-surface-container-low/40 border border-white/10 rounded-2xl p-8 relative overflow-hidden shadow-lg border-t-emerald-500/30 flex flex-col gap-6">
          <div className="absolute -top-16 -left-16 w-48 h-48 bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none"></div>

          <div className="flex flex-col items-center text-center gap-4 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-surface-container-lowest/80 flex items-center justify-center text-emerald-400 border border-white/10 shadow-inner">
              <span className="material-symbols-outlined text-[32px]">folder_zip</span>
            </div>
            <div>
              <p className="font-mono-label text-[10px] text-emerald-400 uppercase mb-2 tracking-[0.2em]">
                Incoming Transfer
              </p>
              <h3
                className="font-mono-data text-[16px] text-on-surface font-medium truncate w-64 mx-auto mb-2"
                title={incomingMeta.fileName}
              >
                {incomingMeta.fileName}
              </h3>
              <p className="font-mono-label text-[11px] text-on-surface-variant tracking-wider">
                {formatBytes(incomingMeta.fileSize)}
              </p>
            </div>
          </div>

          {/* Directory Picker Trigger */}
          {!saveReady && !stats.completed && stats.bytesTransferred === 0 && (
            <button
              id="choose-save-btn"
              onClick={handleChooseSaveLocation}
              disabled={picking}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-on-secondary font-mono-label text-[13px] uppercase tracking-wider font-semibold py-4 rounded-xl hover:brightness-110 transition-all flex justify-center items-center gap-3 relative z-10 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">save_alt</span>
              {picking ? "Choosing location…" : "Choose Save Location & Start"}
            </button>
          )}

          {/* Browser lack of streaming capability warning */}
          {saveReady && !streamMode && !stats.completed && stats.bytesTransferred === 0 && (
            <div className="backdrop-blur-xl bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3 shadow-lg text-left">
              <span className="material-symbols-outlined text-amber-500 text-[20px] mt-0.5">
                warning
              </span>
              <div>
                <h4 className="font-body-md text-[13px] text-amber-500 font-medium mb-1">
                  In-Memory Mode Active
                </h4>
                <p className="font-body-sm text-[12px] text-amber-500/70 leading-relaxed">
                  Your browser does not support direct disk streaming. The file will download to
                  memory first.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Download statistics */}
      {stats.totalBytes > 0 && !stats.completed && (
        <div className="backdrop-blur-xl bg-surface-container-low/40 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 shadow-lg">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 border border-emerald-500/20">
                <span className="material-symbols-outlined text-[20px]">download</span>
              </div>
              <span className="font-mono-data text-[14px] text-on-surface font-medium">
                Downloading...
              </span>
            </div>
            <span className="font-mono-data text-[16px] text-emerald-500 font-bold">
              {stats.progress}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${stats.progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="font-mono-label text-[11px] text-on-surface-variant tracking-wider">
              {formatBytes(stats.bytesTransferred)} / {formatBytes(stats.totalBytes)}
            </span>
            <span className="font-mono-label text-[11px] text-on-surface-variant tracking-wider">
              {formatSpeed(stats.speed)}
            </span>
          </div>
        </div>
      )}

      {/* Completion - saved directly to disk */}
      {stats.completed && savedToDisk && (
        <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-xl p-5 flex flex-col gap-3 text-center shadow-lg">
          <div className="flex items-center justify-center gap-2 text-emerald-400">
            <span className="material-symbols-outlined text-[24px]">check_circle</span>
            <span className="font-body-md font-semibold">Transfer complete!</span>
          </div>
          <p className="font-body-sm text-[13px] text-on-surface-variant">
            File has been saved directly to your disk.
          </p>
        </div>
      )}

      {/* Completion - fallback memory download */}
      {stats.completed && downloadUrl && !savedToDisk && incomingMeta && (
        <div className="backdrop-blur-xl bg-surface-container-low/40 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 shadow-lg">
          <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-xl p-4 flex items-center justify-center gap-2 text-emerald-400">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span className="font-body-md font-semibold">Transfer complete!</span>
          </div>
          <a
            id="download-btn"
            href={downloadUrl}
            download={incomingMeta.fileName}
            className="w-full bg-white text-black font-mono-label text-[13px] uppercase tracking-wider font-semibold py-3.5 rounded-xl hover:bg-neutral-200 transition-all flex justify-center items-center gap-3 shadow-lg shadow-white/5 text-center"
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
            Download {incomingMeta.fileName}
          </a>
        </div>
      )}

      {/* Waiting panel */}
      {!incomingMeta && peerPresent && rtcState !== "failed" && rtcState !== "disconnected" && (
        <div className="text-center font-mono-label text-[12px] text-on-surface-variant uppercase tracking-wider py-8">
          Waiting for sender to select a file…
        </div>
      )}

      {!peerPresent && (
        <div className="text-center font-mono-label text-[12px] text-on-surface-variant uppercase tracking-wider py-8 flex items-center justify-center gap-3">
          <div className="w-4 h-4 border-2 border-neutral-600 border-t-white rounded-full animate-spin shrink-0" />
          Waiting for sender to connect…
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
