import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain,
  Clock,
  Download,
  HardDrive,
  Inbox,
  ScanLine,
  Send,
  Share2,
  Trash2,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import {
  FileIcon,
  formatFileSize,
  formatTimestamp,
} from "../components/FileIcon";
import { SendDialog } from "../components/SendDialog";
import { UploadDialog } from "../components/UploadDialog";
import { useDeleteFile, useGetMyFiles } from "../hooks/useLocalFiles";
import type { LocalFileMetadata } from "../utils/localFileStore";

const AI_FEATURES = [
  {
    icon: Zap,
    title: "Smart Compression",
    desc: "Reduce image size by up to 65% with zero quality loss",
    color: "oklch(0.88 0.2 95)",
    glow: "oklch(0.88 0.2 95 / 0.25)",
  },
  {
    icon: ScanLine,
    title: "File Recognition",
    desc: "Instantly detect file type, content, and metadata",
    color: "oklch(0.82 0.15 195)",
    glow: "oklch(0.82 0.15 195 / 0.25)",
  },
  {
    icon: Brain,
    title: "Smart Transfer",
    desc: "AI optimizes transfer order and batch compression",
    color: "oklch(0.65 0.2 295)",
    glow: "oklch(0.65 0.2 295 / 0.25)",
  },
];

interface HomeTabProps {
  onReceive?: () => void;
}

export function HomeTab({ onReceive }: HomeTabProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sendFile, setSendFile] = useState<LocalFileMetadata | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LocalFileMetadata | null>(
    null,
  );
  const [longPressFile, setLongPressFile] = useState<LocalFileMetadata | null>(
    null,
  );
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: files = [], isLoading: filesLoading } = useGetMyFiles();
  const deleteFile = useDeleteFile();

  const recentFiles = files.slice(0, 4);

  const totalSize = files.reduce((acc, f) => acc + Number(f.fileSize), 0);

  return (
    <div className="tab-content space-y-5 pb-4">
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          className="glass rounded-2xl p-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <HardDrive size={15} className="text-primary" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Storage
            </span>
          </div>
          <p className="text-xl font-display font-semibold">
            {formatFileSize(totalSize)}
          </p>
          <p className="text-xs text-muted-foreground">{files.length} files</p>
        </motion.div>

        <motion.div
          className="glass rounded-2xl p-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock size={15} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Files
            </span>
          </div>
          <p className="text-xl font-display font-semibold">{files.length}</p>
          <p className="text-xs text-muted-foreground">total transferred</p>
        </motion.div>
      </div>

      {/* Send & Receive action buttons */}
      <motion.div
        className="glass rounded-3xl p-5 flex flex-col gap-4"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex items-center gap-2">
          <Share2 size={16} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">
            File Transfer
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            className="font-semibold rounded-2xl h-14 text-base flex flex-col gap-1"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.82 0.15 195), oklch(0.65 0.2 295))",
              color: "oklch(0.08 0.015 260)",
              boxShadow: "0 4px 24px oklch(0.82 0.15 195 / 0.35)",
            }}
            onClick={() => setUploadOpen(true)}
            data-ocid="home.send.primary_button"
          >
            <Send size={20} />
            <span className="text-xs font-semibold">Send File</span>
          </Button>

          <Button
            size="lg"
            className="font-semibold rounded-2xl h-14 text-base flex flex-col gap-1"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.65 0.2 295), oklch(0.82 0.15 130))",
              color: "oklch(0.08 0.015 260)",
              boxShadow: "0 4px 24px oklch(0.65 0.2 295 / 0.35)",
            }}
            onClick={() => onReceive?.()}
            data-ocid="home.receive.primary_button"
          >
            <Inbox size={20} />
            <span className="text-xs font-semibold">Receive</span>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Tap <span className="text-primary font-medium">Send</span> to pick a
          file and share it, or{" "}
          <span
            style={{ color: "oklch(0.65 0.2 295)" }}
            className="font-medium"
          >
            Receive
          </span>{" "}
          to open scanner and accept an incoming transfer
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Brain size={14} style={{ color: "oklch(0.65 0.2 295)" }} />
          <span className="text-sm font-semibold text-foreground">
            AI Features
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {AI_FEATURES.map((feat, i) => (
            <motion.div
              key={feat.title}
              className="glass rounded-2xl p-3 flex flex-col gap-2 relative overflow-hidden"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.07 }}
              style={{ border: `1px solid ${feat.color}33` }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${feat.glow}, transparent 70%)`,
                }}
              />
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${feat.color}18`, color: feat.color }}
              >
                <feat.icon size={16} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-foreground leading-tight mb-1">
                  {feat.title}
                </p>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  {feat.desc}
                </p>
              </div>
              <motion.div
                className="w-1.5 h-1.5 rounded-full absolute top-3 right-3"
                style={{ background: feat.color }}
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.1, 0.8] }}
                transition={{
                  duration: 2 + i * 0.4,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              Recent Files
            </span>
          </div>
        </div>

        {filesLoading ? (
          <div className="space-y-2" data-ocid="home.loading_state">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : recentFiles.length === 0 ? (
          <div
            className="glass rounded-xl p-6 text-center"
            data-ocid="home.empty_state"
          >
            <p className="text-sm text-muted-foreground">
              No files yet. Upload one to get started!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentFiles.map((file, i) => (
              <motion.div
                key={file.id}
                className="glass file-card rounded-xl p-3 flex items-center gap-3"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                data-ocid={`home.item.${i + 1}`}
                onPointerDown={() => {
                  longPressTimer.current = setTimeout(
                    () => setLongPressFile(file),
                    500,
                  );
                }}
                onPointerUp={() => {
                  if (longPressTimer.current)
                    clearTimeout(longPressTimer.current);
                }}
                onPointerLeave={() => {
                  if (longPressTimer.current)
                    clearTimeout(longPressTimer.current);
                }}
                onPointerMove={() => {
                  if (longPressTimer.current)
                    clearTimeout(longPressTimer.current);
                }}
              >
                <button
                  type="button"
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer text-left"
                  onClick={() => setSendFile(file)}
                >
                  <FileIcon fileType={file.fileType} size={18} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(Number(file.fileSize))} ·{" "}
                      {formatTimestamp(file.uploadedAt)}
                    </p>
                  </div>
                  <Send
                    size={14}
                    className="text-muted-foreground flex-shrink-0 mr-1"
                  />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-lg flex-shrink-0 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(file);
                  }}
                  data-ocid={`home.delete_button.${i + 1}`}
                  aria-label="Delete file"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <SendDialog
        open={!!sendFile}
        file={sendFile}
        onClose={() => setSendFile(null)}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent data-ocid="home.delete_confirm.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.fileName}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteTarget(null)}
              data-ocid="home.delete_confirm.cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteFile.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
              data-ocid="home.delete_confirm.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Long-press delete bottom sheet */}
      <AnimatePresence>
        {longPressFile && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setLongPressFile(null)}
              onKeyDown={(e) => e.key === "Escape" && setLongPressFile(null)}
              role="button"
              tabIndex={0}
            />
            <motion.div
              className="relative w-full glass rounded-t-2xl p-6 space-y-3"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <p className="text-sm font-medium text-muted-foreground truncate text-center pb-1">
                {longPressFile.fileName}
              </p>
              <button
                type="button"
                className="w-full py-3 rounded-xl bg-red-500/20 text-red-400 font-semibold hover:bg-red-500/30 transition-colors"
                onClick={() => {
                  setDeleteTarget(longPressFile);
                  setLongPressFile(null);
                }}
                data-ocid="home.delete_button"
              >
                Delete
              </button>
              <button
                type="button"
                className="w-full py-3 rounded-xl bg-white/5 text-muted-foreground font-medium hover:bg-white/10 transition-colors"
                onClick={() => setLongPressFile(null)}
                data-ocid="home.cancel_button"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
