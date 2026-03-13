import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, Download, Inbox, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

type ReceiveStep = "incoming" | "receiving" | "done";

const DEVICE_NAMES = [
  "Galaxy S25",
  "iPhone 16 Pro",
  "Pixel 9",
  "OnePlus 13",
  "Xiaomi 15",
];
const FILE_NAMES = [
  "photo_2026.jpg",
  "video_clip.mp4",
  "document.pdf",
  "music_track.mp3",
  "archive.zip",
];
const FILE_SIZES = ["3.2 MB", "14.8 MB", "1.1 MB", "8.7 MB", "22.4 MB"];

interface ReceiveDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ReceiveDialog({ open, onClose }: ReceiveDialogProps) {
  const [step, setStep] = useState<ReceiveStep>("incoming");
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [deviceName] = useState(
    () => DEVICE_NAMES[Math.floor(Math.random() * DEVICE_NAMES.length)],
  );
  const [fileName] = useState(
    () => FILE_NAMES[Math.floor(Math.random() * FILE_NAMES.length)],
  );
  const [fileSize] = useState(
    () => FILE_SIZES[Math.floor(Math.random() * FILE_SIZES.length)],
  );

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep("incoming");
      setProgress(0);
      setSpeed(0);
    }
  }, [open]);

  function handleAccept() {
    setStep("receiving");
    let pct = 0;
    const interval = setInterval(() => {
      pct += Math.random() * 10 + 4;
      const newSpeed = 1.5 + Math.random() * 4.8;
      if (pct >= 100) {
        pct = 100;
        clearInterval(interval);
        setProgress(100);
        setSpeed(0);
        setStep("done");
      } else {
        setProgress(pct);
        setSpeed(newSpeed);
      }
    }, 200);
  }

  function handleDecline() {
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && step !== "receiving" && onClose()}
    >
      <DialogContent
        className="glass border-border/50 max-w-sm mx-auto"
        data-ocid="receive.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display gradient-text text-xl flex items-center gap-2">
            <Inbox size={18} style={{ color: "oklch(0.65 0.2 295)" }} />
            Incoming Transfer
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "incoming" && (
            <motion.div
              key="incoming"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              {/* Animated incoming badge */}
              <div className="flex flex-col items-center gap-3 py-2">
                <motion.div className="relative w-20 h-20 flex items-center justify-center">
                  {/* Pulsing rings */}
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-full"
                      style={{
                        border: "2px solid oklch(0.65 0.2 295 / 0.5)",
                      }}
                      animate={{
                        scale: [1, 1.6 + i * 0.25],
                        opacity: [0.7, 0],
                      }}
                      transition={{
                        duration: 1.8,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: i * 0.5,
                        ease: "easeOut",
                      }}
                    />
                  ))}
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{
                      background: "oklch(0.65 0.2 295 / 0.15)",
                      border: "1px solid oklch(0.65 0.2 295 / 0.4)",
                    }}
                  >
                    <Download
                      size={28}
                      style={{ color: "oklch(0.65 0.2 295)" }}
                    />
                  </div>
                </motion.div>

                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">
                    {deviceName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    wants to send you a file
                  </p>
                </div>
              </div>

              {/* File info card */}
              <div
                className="rounded-2xl p-3 flex items-center gap-3"
                style={{
                  background: "oklch(0.14 0.03 260)",
                  border: "1px solid oklch(0.65 0.2 295 / 0.25)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "oklch(0.65 0.2 295 / 0.15)",
                    color: "oklch(0.65 0.2 295)",
                  }}
                >
                  <Download size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-foreground">
                    {fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">{fileSize}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={handleDecline}
                  data-ocid="receive.cancel_button"
                >
                  Decline
                </Button>
                <Button
                  className="flex-1 rounded-xl font-semibold"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.65 0.2 295), oklch(0.82 0.15 195))",
                    color: "oklch(0.08 0.015 260)",
                    boxShadow: "0 4px 20px oklch(0.65 0.2 295 / 0.35)",
                  }}
                  onClick={handleAccept}
                  data-ocid="receive.accept_button"
                >
                  Accept
                </Button>
              </div>
            </motion.div>
          )}

          {step === "receiving" && (
            <motion.div
              key="receiving"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 py-2"
              data-ocid="receive.loading_state"
            >
              <div className="text-center">
                <p className="text-sm font-semibold">
                  Receiving{" "}
                  <span style={{ color: "oklch(0.65 0.2 295)" }}>
                    {fileName}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  from {deviceName} · {Math.round(progress)}%
                </p>
              </div>

              <div className="relative h-3 rounded-full overflow-hidden bg-muted">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, oklch(0.65 0.2 295), oklch(0.82 0.15 195))",
                    boxShadow: "0 0 12px oklch(0.65 0.2 295 / 0.6)",
                  }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.15 }}
                />
              </div>

              <div className="flex items-center justify-center gap-1.5">
                <Zap
                  size={13}
                  style={{ color: "oklch(0.88 0.2 95)" }}
                  className="flex-shrink-0"
                />
                <motion.span
                  key={Math.floor(speed * 10)}
                  className="text-xs font-mono font-semibold"
                  style={{ color: "oklch(0.88 0.2 95)" }}
                  initial={{ opacity: 0.6, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {speed.toFixed(1)} MB/s
                </motion.span>
              </div>

              <div className="flex justify-center">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: "oklch(0.65 0.2 295)" }}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        repeat: Number.POSITIVE_INFINITY,
                        duration: 1.2,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-4"
              data-ocid="receive.success_state"
            >
              <CheckCircle
                size={48}
                className="text-emerald-400"
                style={{
                  filter: "drop-shadow(0 0 12px oklch(0.78 0.18 145 / 0.8))",
                }}
              />
              <p className="font-semibold text-emerald-400">File Received!</p>
              <p className="text-xs text-muted-foreground text-center">
                {fileName} from {deviceName} saved to your device
              </p>
              <Button
                className="mt-2"
                variant="outline"
                onClick={onClose}
                data-ocid="receive.close_button"
              >
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
