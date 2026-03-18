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
const DELETED_IDS_KEY = "ofs_deleted_received_ids";

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

function loadDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveDeletedIds(ids: Set<string>) {
  try {
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

async function triggerDownload(fileName: string, url?: string) {
  if (!url) {
    toast.error("File data not available", {
      description: "The original file data could not be found for download.",
    });
    return;
  }

  if (url.startsWith("data:") || url.startsWith("blob:")) {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  if (url.startsWith("http")) {
    try {
      toast.info("Downloading...", { id: "dl-progress" });
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
      toast.dismiss("dl-progress");
      toast.success("Download complete!", { description: fileName });
    } catch {
      toast.dismiss("dl-progress");
      toast.error("Download failed", {
        description: "Could not fetch the file. Please try again.",
      });
    }
    return;
  }

  // Fallback
  toast.error("File data not available", {
    description: "The original file data could not be found for download.",
  });
}

export function HistoryTab() {
  const { data: history = [], isLoading } = useGetTransferHistory();
  const [receivedFiles, setReceivedFiles] =
    useState<ReceivedFile[]>(loadReceivedFiles);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(loadDeletedIds);

  const storedIds = new Set(receivedFiles.map((f) => f.id));
  const allDeletedIds = new Set([...storedIds, ...deletedIds]);

  const historyReceivedAsFiles: ReceivedFile[] = history
    .filter((h) => h.direction === "received")
    .map((h) => ({
      id: `hist-${String(h.transferredAt)}-${h.fileName}`,
      name: h.fileName,
      size: formatFileSize(h.fileSize),
      url: h.downloadUrl,
      timestamp: Math.floor(Number(h.transferredAt) / 1_000_000),
      sender: h.sender,
    }))
    .filter((f) => !allDeletedIds.has(f.id));

  // Also include stored received files (not deleted)
  const filteredReceivedFiles = receivedFiles.filter(
    (f) => !deletedIds.has(f.id),
  );

  // Merge: history takes priority (already deduped by id)
  const mergedReceived: ReceivedFile[] = [
    ...historyReceivedAsFiles,
    ...filteredReceivedFiles.filter(
      (f) => !historyReceivedAsFiles.some((h) => h.id === f.id),
    ),
  ].sort((a, b) => b.timestamp - a.timestamp);

  function handleDeleteReceived(id: string) {
    // Remove from receivedFiles state
    const newFiles = receivedFiles.filter((f) => f.id !== id);
    setReceivedFiles(newFiles);
    saveReceivedFiles(newFiles);
    // Also track as deleted so history-sourced files are hidden
    const newDeleted = new Set([...deletedIds, id]);
    setDeletedIds(newDeleted);
    saveDeletedIds(newDeleted);
    toast.success("File removed from history");
  }

  const sentHistory = history.filter(
    (h) => h.direction !== "received" || !h.direction,
  );

  return (
    <div className="flex flex-col gap-5 py-4">
      {/* Received Files Section */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ArrowDownLeft size={16} style={{ color: "oklch(0.82 0.15 195)" }} />
          <h2
            className="text-sm font-bold uppercase tracking-wide"
            style={{ color: "oklch(0.82 0.15 195)" }}
          >
            Received Files
          </h2>
          {mergedReceived.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {mergedReceived.length}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div
            className="flex flex-col gap-2"
            data-ocid="history.loading_state"
          >
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : mergedReceived.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-8 rounded-2xl gap-2"
            style={{
              background: "oklch(0.1 0.02 260 / 0.4)",
              border: "1px dashed oklch(0.3 0.04 260 / 0.4)",
            }}
            data-ocid="history.received.empty_state"
          >
            <InboxIcon size={28} style={{ color: "oklch(0.4 0.04 260)" }} />
            <p className="text-xs text-muted-foreground">
              No received files yet
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {mergedReceived.map((file, i) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-3 flex items-center gap-3"
                data-ocid={`history.received.item.${i + 1}`}
              >
                <FileIcon
                  fileType={file.name.split(".").pop() || ""}
                  size={16}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.size}
                    {file.sender ? ` · from ${file.sender}` : ""}
                    {file.timestamp
                      ? ` · ${formatTimestamp(BigInt(file.timestamp * 1_000_000))}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                    style={{
                      background: "oklch(0.82 0.15 195 / 0.1)",
                      border: "1px solid oklch(0.82 0.15 195 / 0.25)",
                      color: "oklch(0.82 0.15 195)",
                    }}
                    onClick={() => triggerDownload(file.name, file.url)}
                    data-ocid={`history.received.download_button.${i + 1}`}
                  >
                    <Download size={14} />
                  </button>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                    style={{
                      background: "oklch(0.65 0.2 25 / 0.1)",
                      border: "1px solid oklch(0.65 0.2 25 / 0.25)",
                      color: "oklch(0.65 0.2 25)",
                    }}
                    onClick={() => handleDeleteReceived(file.id)}
                    data-ocid={`history.received.delete_button.${i + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Sent / Transfer History Section */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ArrowUpRight size={16} style={{ color: "oklch(0.78 0.18 145)" }} />
          <h2
            className="text-sm font-bold uppercase tracking-wide"
            style={{ color: "oklch(0.78 0.18 145)" }}
          >
            Transfer History
          </h2>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : sentHistory.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-8 rounded-2xl gap-2"
            style={{
              background: "oklch(0.1 0.02 260 / 0.4)",
              border: "1px dashed oklch(0.3 0.04 260 / 0.4)",
            }}
            data-ocid="history.sent.empty_state"
          >
            <Clock size={28} style={{ color: "oklch(0.4 0.04 260)" }} />
            <p className="text-xs text-muted-foreground">No transfers yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sentHistory.map((record, i) => (
              <motion.div
                key={`${record.transferredAt}-${record.fileName}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass rounded-xl p-3 flex items-center gap-3"
                data-ocid={`history.sent.item.${i + 1}`}
              >
                <FileIcon
                  fileType={record.fileName.split(".").pop() || ""}
                  size={16}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {record.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(record.fileSize)} ·{" "}
                    {formatTimestamp(record.transferredAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {record.status === "completed" ? (
                    <CheckCircle
                      size={16}
                      style={{ color: "oklch(0.78 0.18 145)" }}
                    />
                  ) : (
                    <XCircle
                      size={16}
                      style={{ color: "oklch(0.65 0.2 25)" }}
                    />
                  )}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {record.status}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
