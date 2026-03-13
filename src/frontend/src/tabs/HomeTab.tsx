import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain,
  Clock,
  HardDrive,
  ScanLine,
  Send,
  Share2,
  Trash2,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { FileMetadata } from "../backend";
import {
  FileIcon,
  formatFileSize,
  formatTimestamp,
} from "../components/FileIcon";
import { RadarScanner } from "../components/RadarScanner";
import { SendDialog } from "../components/SendDialog";
import { UploadDialog } from "../components/UploadDialog";
import {
  useAddNearbyDevice,
  useDeleteFile,
  useGetMyFiles,
  useGetNearbyDevices,
} from "../hooks/useQueries";

const SEED_DEVICES = ["Galaxy S25", "MacBook Pro", "iPhone 16", "Pixel 9"];

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

export function HomeTab() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sendFile, setSendFile] = useState<FileMetadata | null>(null);

  const { data: files = [], isLoading: filesLoading } = useGetMyFiles();
  const { data: devices = [], isLoading: devicesLoading } =
    useGetNearbyDevices();
  const addDevice = useAddNearbyDevice();
  const deleteFile = useDeleteFile();

  // Seed devices if empty
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally omit mutate fn
  useEffect(() => {
    if (!devicesLoading && devices.length === 0) {
      const shuffled = [...SEED_DEVICES]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      for (const name of shuffled) {
        addDevice.mutate(name);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devicesLoading, devices.length]);

  const recentFiles = files.slice(0, 4);

  const radarDots = devices.slice(0, 5).map((d, i) => {
    const angle = (i / Math.max(devices.length, 1)) * 2 * Math.PI - Math.PI / 2;
    const dist = 0.45 + (i % 2) * 0.25;
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      label: d.name,
      connected: d.isConnected,
    };
  });

  const totalSize = files.reduce((acc, f) => acc + Number(f.fileSize), 0);

  return (
    <div className="tab-content space-y-5 pb-4">
      {/* Header stats */}
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
            <Zap size={15} className="text-yellow-400" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Nearby
            </span>
          </div>
          <p className="text-xl font-display font-semibold">{devices.length}</p>
          <p className="text-xs text-muted-foreground">devices found</p>
        </motion.div>
      </div>

      {/* Radar + Send button */}
      <motion.div
        className="glass rounded-3xl p-5 flex flex-col items-center gap-4"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex items-center gap-2">
          <Share2 size={16} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Nearby Devices
          </span>
        </div>

        {devicesLoading ? (
          <div
            className="w-[220px] h-[220px] rounded-full"
            style={{ background: "oklch(0.13 0.025 260 / 0.5)" }}
          />
        ) : (
          <RadarScanner dots={radarDots} size={220} />
        )}

        <Button
          size="lg"
          className="w-full font-semibold rounded-2xl h-12 text-base"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.82 0.15 195), oklch(0.65 0.2 295))",
            color: "oklch(0.08 0.015 260)",
            boxShadow: "0 4px 24px oklch(0.82 0.15 195 / 0.35)",
          }}
          onClick={() => setUploadOpen(true)}
          data-ocid="home.primary_button"
        >
          <Send size={18} className="mr-2" />
          Send File
        </Button>
      </motion.div>

      {/* AI Features */}
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
              style={{
                border: `1px solid ${feat.color}33`,
              }}
            >
              {/* Glow bg */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${feat.glow}, transparent 70%)`,
                }}
              />
              {/* Icon */}
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: `${feat.color}18`,
                  color: feat.color,
                }}
              >
                <feat.icon size={16} />
              </div>
              {/* Text */}
              <div>
                <p className="text-[11px] font-bold text-foreground leading-tight mb-1">
                  {feat.title}
                </p>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  {feat.desc}
                </p>
              </div>
              {/* Animated indicator */}
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

      {/* Recent Files */}
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
                key={file.blobId.getDirectURL()}
                className="glass file-card rounded-xl p-3 flex items-center gap-3"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                data-ocid={`home.item.${i + 1}`}
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
                      {formatFileSize(file.fileSize)} ·{" "}
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
                    deleteFile.mutate(file.id);
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
    </div>
  );
}
