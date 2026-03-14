import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Download,
  InboxIcon,
  Trash2,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import {
  FileIcon,
  formatFileSize,
  formatTimestamp,
} from "../components/FileIcon";
import { useGetTransferHistory } from "../hooks/useLocalFiles";

const RECEIVED_FILES_KEY = "ofs_received_files";

interface ReceivedFile {
  id: string;
  name: string;
  size: string;
  url?: string;
  timestamp: number;
  sender?: string;
}

function loadReceivedFiles(): ReceivedFile[] {
  try {
    const raw = localStorage.getItem(RECEIVED_FILES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveReceivedFiles(files: ReceivedFile[]) {
  try {
    localStorage.setItem(RECEIVED_FILES_KEY, JSON.stringify(files));
  } catch {
    /* ignore */
  }
}

function triggerDownload(fileName: string, content?: string) {
  // If real data URL is available, use it directly
  if (content?.startsWith("data:")) {
    const a = document.createElement("a");
    a.href = content;
    a.download = fileName;
    a.click();
    return;
  }
  // Otherwise create a text receipt file
  const text = `OFS Transfer Receipt\n\nFile: ${fileName}\nReceived: ${new Date().toLocaleString()}\n\nThis file was received via OFS (Open File Share).`;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.receipt.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function HistoryTab() {
  const { data: history = [], isLoading } = useGetTransferHistory();
  const [receivedFiles, setReceivedFiles] =
    useState<ReceivedFile[]>(loadReceivedFiles);

  const storedIds = new Set(receivedFiles.map((f) => f.id));
  const historyReceivedAsFiles: ReceivedFile[] = history
    .filter((h) => h.direction === "received")
    .map((h) => ({
      id: `hist-${String(h.transferredAt)}-${h.fileName}`,
      name: h.fileName,
      size: formatFileSize(h.fileSize),
      timestamp: Math.floor(Number(h.transferredAt) / 1_000_000),
      sender: h.sender,
    }))
    .filter((f) => !storedIds.has(f.id));

  const allReceived = [...receivedFiles, ...historyReceivedAsFiles];

  function deleteReceivedFile(id: string) {
    setReceivedFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      saveReceivedFiles(updated);
      return updated;
    });
    toast.success("File removed from received list");
  }

  function downloadReceivedFile(file: ReceivedFile) {
    triggerDownload(file.name, file.url);
    toast.success("Saving to device...", { description: file.name });
  }

  const completedCount = history.filter((h) => h.status === "completed").length;
  const failedCount = history.filter((h) => h.status === "failed").length;
  const receivedCount = history.filter(
    (h) => h.direction === "received",
  ).length;

  return (
    <div className="tab-content space-y-4 pb-4">
      <div>
        <h2 className="font-display font-bold text-xl">Transfer History</h2>
        <p className="text-xs text-muted-foreground">
          {history.length} transfers recorded
        </p>
      </div>

      {/* ===== RECEIVED FILES SECTION ===== */}
      <div className="glass rounded-2xl overflow-hidden">
        <div
          className="px-4 py-3 flex items-center gap-2 border-b border-border/30"
          style={{ background: "oklch(0.75 0.18 195 / 0.08)" }}
        >
          <InboxIcon size={15} style={{ color: "oklch(0.82 0.15 195)" }} />
          <p
            className="text-sm font-semibold"
            style={{ color: "oklch(0.82 0.15 195)" }}
          >
            Received Files
          </p>
          <span
            className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: "oklch(0.75 0.18 195 / 0.18)",
              color: "oklch(0.82 0.15 195)",
            }}
          >
            {allReceived.length}
          </span>
        </div>

        {allReceived.length === 0 ? (
          <div
            className="p-6 flex flex-col items-center gap-2"
            data-ocid="received.empty_state"
          >
            <InboxIcon size={24} className="text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground text-center">
              No received files yet. Tap Receive on Home and scan a QR code.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/15">
            {allReceived.map((file, i) => (
              <motion.div
                key={file.id}
                className="px-4 py-3 flex items-center gap-3"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                data-ocid={`received.item.${i + 1}`}
              >
                <FileIcon fileType="" size={14} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {file.size}
                    </span>
                    {file.sender && (
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: "oklch(0.82 0.15 195 / 0.8)" }}
                      >
                        from {file.sender}
                      </span>
                    )}
                    <Badge
                      className="text-[9px] px-1.5 py-0 rounded-full h-4"
                      style={{
                        background: "oklch(0.75 0.18 195 / 0.18)",
                        color: "oklch(0.82 0.15 195)",
                        border: "none",
                      }}
                    >
                      Received
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      background: "oklch(0.78 0.18 145 / 0.15)",
                      border: "1px solid oklch(0.78 0.18 145 / 0.3)",
                      color: "oklch(0.78 0.18 145)",
                    }}
                    onClick={() => downloadReceivedFile(file)}
                    data-ocid={`received.save_button.${i + 1}`}
                    title="Download"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      background: "oklch(0.65 0.22 25 / 0.15)",
                      border: "1px solid oklch(0.65 0.22 25 / 0.3)",
                      color: "oklch(0.75 0.2 25)",
                    }}
                    onClick={() => deleteReceivedFile(file.id)}
                    data-ocid={`received.delete_button.${i + 1}`}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="glass rounded-xl p-3">
            <p className="text-2xl font-display font-bold text-emerald-400">
              {completedCount}
            </p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="text-2xl font-display font-bold text-destructive">
              {failedCount}
            </p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
          <div className="glass rounded-xl p-3">
            <p
              className="text-2xl font-display font-bold"
              style={{ color: "oklch(0.75 0.18 195)" }}
            >
              {receivedCount}
            </p>
            <p className="text-xs text-muted-foreground">Received</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2" data-ocid="history.loading_state">
          {[0, 1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div
          className="glass rounded-2xl p-10 flex flex-col items-center gap-3"
          data-ocid="history.empty_state"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "oklch(0.65 0.2 295 / 0.12)" }}
          >
            <Clock size={28} className="text-secondary" />
          </div>
          <p className="font-semibold">No transfers yet</p>
          <p className="text-xs text-muted-foreground text-center">
            Send a file or receive via QR scan to see history
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100dvh-420px)]">
          <div className="space-y-2 pr-1">
            {history.map((record, i) => {
              const isCompleted = record.status === "completed";
              const isReceived = record.direction === "received";
              return (
                <motion.div
                  key={
                    String(record.transferredAt) +
                    record.fileName +
                    record.receiver
                  }
                  className="glass rounded-xl p-4 flex items-start gap-3"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  data-ocid={`history.item.${i + 1}`}
                >
                  <FileIcon fileType="" size={16} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate max-w-[140px]">
                        {record.fileName}
                      </p>
                      <Badge
                        className="text-[10px] px-2 py-0 rounded-full"
                        style={{
                          background: isCompleted
                            ? "oklch(0.78 0.18 145 / 0.2)"
                            : "oklch(0.65 0.22 25 / 0.2)",
                          color: isCompleted
                            ? "oklch(0.78 0.18 145)"
                            : "oklch(0.75 0.2 25)",
                          border: "none",
                        }}
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle size={10} className="mr-1" />
                            Completed
                          </>
                        ) : (
                          <>
                            <XCircle size={10} className="mr-1" />
                            Failed
                          </>
                        )}
                      </Badge>
                      <Badge
                        className="text-[10px] px-2 py-0 rounded-full"
                        style={{
                          background: isReceived
                            ? "oklch(0.75 0.18 195 / 0.2)"
                            : "oklch(0.65 0.2 295 / 0.2)",
                          color: isReceived
                            ? "oklch(0.75 0.18 195)"
                            : "oklch(0.75 0.18 295)",
                          border: "none",
                        }}
                      >
                        {isReceived ? "Received" : "Sent"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatFileSize(record.fileSize)}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {isReceived ? (
                        <ArrowDownLeft
                          size={11}
                          style={{ color: "oklch(0.75 0.18 195)" }}
                          className="flex-shrink-0"
                        />
                      ) : (
                        <ArrowUpRight
                          size={11}
                          className="text-primary flex-shrink-0"
                        />
                      )}
                      <p className="text-[11px] text-muted-foreground truncate">
                        {isReceived
                          ? `From: ${record.sender}`
                          : `To: ${record.receiver}`}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {formatTimestamp(record.transferredAt)}
                    </p>
                    {isReceived && isCompleted && (
                      <Button
                        size="sm"
                        className="mt-2 h-7 text-xs px-3 rounded-lg"
                        style={{
                          background: "oklch(0.75 0.18 195 / 0.15)",
                          color: "oklch(0.75 0.18 195)",
                          border: "1px solid oklch(0.75 0.18 195 / 0.3)",
                        }}
                        data-ocid={`history.save_button.${i + 1}`}
                        onClick={() => {
                          triggerDownload(record.fileName);
                          toast.success("Saving to device...", {
                            description: record.fileName,
                          });
                        }}
                      >
                        <Download size={12} className="mr-1" />
                        Download
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
