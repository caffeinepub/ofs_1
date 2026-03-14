import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  Camera,
  CameraOff,
  Check,
  Copy,
  FlipHorizontal,
  ScanLine,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAddReceivedRecord } from "../hooks/useLocalFiles";
import { useQRScanner } from "../qr-code/useQRScanner";

function parseFileSizeToBytes(sizeStr: string): number {
  const match = sizeStr.match(/^([\d.]+)\s*(B|KB|MB|GB)?$/i);
  if (!match) return 0;
  const val = Number.parseFloat(match[1]);
  const unit = (match[2] || "B").toUpperCase();
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  };
  return Math.round(val * (multipliers[unit] ?? 1));
}

interface OFSTransfer {
  fileName: string;
  fileSize: string;
  sender: string;
  raw: string;
}

function parseOFSData(data: string): OFSTransfer | null {
  if (!data.startsWith("ofs:")) return null;
  const parts = data.split(":");
  if (parts.length >= 4 && parts[1] === "file") {
    return {
      fileName: parts[2] || "Unknown File",
      fileSize: parts[3] || "Unknown Size",
      sender: parts[4] || "Nearby Device",
      raw: data,
    };
  }
  return null;
}

export function ScannerTab() {
  const addReceived = useAddReceivedRecord();
  const scanner = useQRScanner({ facingMode: "environment" });
  const [incomingTransfer, setIncomingTransfer] = useState<OFSTransfer | null>(
    null,
  );
  const [transferState, setTransferState] = useState<
    "idle" | "receiving" | "success" | "declined"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState("0.0 MB/s");
  const [lastResult, setLastResult] = useState<string | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    scanner.startScanning();
  }, []);

  useEffect(() => {
    if (scanner.qrResults.length === 0) return;
    const latest = scanner.qrResults[0];
    if (latest.data === lastResult) return;
    setLastResult(latest.data);
    const ofsData = parseOFSData(latest.data);
    if (ofsData) {
      setIncomingTransfer(ofsData);
      setTransferState("idle");
    }
  }, [scanner.qrResults, lastResult]);

  const handleAccept = useCallback(() => {
    setTransferState("receiving");
    setProgress(0);
    let p = 0;
    progressRef.current = setInterval(() => {
      p += Math.random() * 8 + 2;
      const mbps = (Math.random() * 4 + 1.5).toFixed(1);
      setSpeed(`${mbps} MB/s`);
      setProgress(Math.min(p, 100));
      if (p >= 100) {
        clearInterval(progressRef.current!);
        setTransferState("success");
        setSpeed("Done");
        addReceived.mutate({
          sender: incomingTransfer?.sender ?? "Nearby Device",
          fileName: incomingTransfer?.fileName ?? "Unknown File",
          fileSize: BigInt(
            parseFileSizeToBytes(incomingTransfer?.fileSize ?? "0"),
          ),
        });
      }
    }, 150);
  }, [addReceived, incomingTransfer]);

  const handleDecline = useCallback(() => {
    setIncomingTransfer(null);
    setTransferState("declined");
    clearInterval(progressRef.current!);
  }, []);

  const handleCopy = useCallback(() => {
    if (!lastResult) return;
    navigator.clipboard.writeText(lastResult).then(() => {
      toast.success("Copied to clipboard");
    });
  }, [lastResult]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: cleanup-only on unmount
  useEffect(() => {
    return () => {
      clearInterval(progressRef.current!);
      scanner.stopScanning();
    };
  }, []);

  const isOFSResult = lastResult?.startsWith("ofs:");
  const showResultCard =
    lastResult && !isOFSResult && !incomingTransfer && transferState === "idle";

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence>
        {scanner.error && (
          <motion.div
            data-ocid="scanner.error_state"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-3 p-4 rounded-2xl"
            style={{
              background: "oklch(0.2 0.06 25 / 0.4)",
              border: "1px solid oklch(0.65 0.22 25 / 0.5)",
            }}
          >
            <AlertCircle
              size={18}
              className="text-destructive flex-shrink-0 mt-0.5"
            />
            <div>
              <p className="text-sm font-semibold text-destructive">
                Camera Error
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {scanner.error.type === "permission"
                  ? "Camera access denied. Tap the lock icon in your browser's address bar → Site Settings → Camera → Allow."
                  : scanner.error.message}
              </p>
              <button
                type="button"
                onClick={() => scanner.retry()}
                className="mt-2 text-xs font-semibold"
                style={{ color: "oklch(0.82 0.15 195)" }}
              >
                Retry
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera viewport */}
      <div
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          aspectRatio: "1 / 1",
          background: "oklch(0.06 0.015 260)",
          border: "2px solid oklch(0.82 0.15 195 / 0.4)",
          boxShadow:
            "0 0 30px oklch(0.82 0.15 195 / 0.2), inset 0 0 40px oklch(0.05 0.01 260 / 0.8)",
        }}
      >
        <video
          ref={scanner.videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          playsInline
          muted
          style={{ display: scanner.isActive ? "block" : "none" }}
        />
        <canvas
          ref={scanner.canvasRef}
          data-ocid="scanner.canvas_target"
          className="hidden"
        />

        {!scanner.isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: "oklch(0.82 0.15 195 / 0.08)",
                border: "1px solid oklch(0.82 0.15 195 / 0.2)",
              }}
            >
              <Camera
                size={36}
                style={{ color: "oklch(0.82 0.15 195 / 0.5)" }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Tap Start Scanning to activate camera
            </p>
          </div>
        )}

        {scanner.isActive && (
          <>
            {[
              {
                top: "1.5rem",
                left: "1.5rem",
                borderTop: true,
                borderLeft: true,
              },
              {
                top: "1.5rem",
                right: "1.5rem",
                borderTop: true,
                borderRight: true,
              },
              {
                bottom: "1.5rem",
                left: "1.5rem",
                borderBottom: true,
                borderLeft: true,
              },
              {
                bottom: "1.5rem",
                right: "1.5rem",
                borderBottom: true,
                borderRight: true,
              },
            ].map((corner, i) => (
              <div
                key={String(i)}
                className="absolute w-8 h-8"
                style={{
                  top: corner.top,
                  left: corner.left,
                  right: corner.right,
                  bottom: corner.bottom,
                  borderTop: corner.borderTop
                    ? "3px solid oklch(0.82 0.15 195)"
                    : undefined,
                  borderLeft: corner.borderLeft
                    ? "3px solid oklch(0.82 0.15 195)"
                    : undefined,
                  borderRight: corner.borderRight
                    ? "3px solid oklch(0.82 0.15 195)"
                    : undefined,
                  borderBottom: corner.borderBottom
                    ? "3px solid oklch(0.82 0.15 195)"
                    : undefined,
                  boxShadow: "0 0 10px oklch(0.82 0.15 195 / 0.5)",
                }}
              />
            ))}

            <motion.div
              className="absolute left-8 right-8"
              style={{
                height: "2px",
                background:
                  "linear-gradient(90deg, transparent, oklch(0.82 0.15 195), oklch(0.65 0.2 295), oklch(0.82 0.15 195), transparent)",
                boxShadow: "0 0 12px oklch(0.82 0.15 195 / 0.8)",
              }}
              animate={{ top: ["15%", "85%", "15%"] }}
              transition={{
                duration: 2.5,
                ease: "easeInOut",
                repeat: Number.POSITIVE_INFINITY,
              }}
            />

            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: "oklch(0.78 0.18 145)",
                  boxShadow: "0 0 6px oklch(0.78 0.18 145)",
                  animation: "device-pulse 1s ease-in-out infinite",
                }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: "oklch(0.78 0.18 145)" }}
              >
                Scanning...
              </span>
            </div>
          </>
        )}

        <AnimatePresence>
          {scanner.isLoading && (
            <motion.div
              data-ocid="scanner.loading_state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "oklch(0.06 0.015 260 / 0.8)" }}
            >
              <div className="flex flex-col items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                >
                  <ScanLine
                    size={32}
                    style={{ color: "oklch(0.82 0.15 195)" }}
                  />
                </motion.div>
                <p className="text-sm text-muted-foreground">
                  Starting camera...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        {!scanner.isActive ? (
          <Button
            data-ocid="scanner.start_button"
            className="flex-1 h-12 font-semibold"
            style={{
              background: "oklch(0.82 0.15 195)",
              color: "oklch(0.06 0.015 260)",
              boxShadow: "0 0 20px oklch(0.82 0.15 195 / 0.4)",
            }}
            onClick={() => scanner.startScanning()}
            disabled={scanner.isLoading || scanner.isSupported === false}
          >
            <Camera size={18} className="mr-2" />
            Start Scanning
          </Button>
        ) : (
          <Button
            data-ocid="scanner.stop_button"
            variant="outline"
            className="flex-1 h-12 font-semibold"
            style={{
              borderColor: "oklch(0.65 0.22 25 / 0.5)",
              color: "oklch(0.75 0.18 25)",
            }}
            onClick={() => scanner.stopScanning()}
          >
            <CameraOff size={18} className="mr-2" />
            Stop Scanning
          </Button>
        )}

        {scanner.isActive && (
          <Button
            data-ocid="scanner.switch_button"
            variant="outline"
            className="h-12 w-12 p-0"
            style={{
              borderColor: "oklch(0.82 0.15 195 / 0.3)",
              color: "oklch(0.82 0.15 195)",
            }}
            onClick={() => scanner.switchCamera()}
          >
            <FlipHorizontal size={18} />
          </Button>
        )}
      </div>

      {/* Non-OFS QR result */}
      <AnimatePresence>
        {showResultCard && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="rounded-2xl p-4 flex items-start justify-between gap-3"
            style={{
              background: "oklch(0.13 0.025 260 / 0.8)",
              border: "1px solid oklch(0.82 0.15 195 / 0.3)",
              boxShadow: "0 0 20px oklch(0.82 0.15 195 / 0.1)",
            }}
          >
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-semibold mb-1"
                style={{ color: "oklch(0.82 0.15 195)" }}
              >
                QR Code Detected
              </p>
              <p className="text-sm text-foreground break-all line-clamp-3">
                {lastResult}
              </p>
            </div>
            <Button
              data-ocid="scanner.copy_button"
              size="sm"
              variant="outline"
              className="flex-shrink-0"
              style={{
                borderColor: "oklch(0.82 0.15 195 / 0.4)",
                color: "oklch(0.82 0.15 195)",
              }}
              onClick={handleCopy}
            >
              <Copy size={14} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incoming transfer */}
      <AnimatePresence>
        {incomingTransfer && transferState === "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="rounded-2xl p-5 flex flex-col gap-4"
            style={{
              background: "oklch(0.13 0.025 260 / 0.95)",
              border: "1px solid oklch(0.65 0.2 295 / 0.5)",
              boxShadow:
                "0 0 30px oklch(0.65 0.2 295 / 0.2), 0 8px 32px oklch(0 0 0 / 0.5)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "oklch(0.65 0.2 295 / 0.15)",
                  border: "1px solid oklch(0.65 0.2 295 / 0.3)",
                }}
              >
                <ScanLine size={20} style={{ color: "oklch(0.65 0.2 295)" }} />
              </div>
              <div>
                <p
                  className="text-xs font-semibold"
                  style={{ color: "oklch(0.65 0.2 295)" }}
                >
                  Incoming File Transfer
                </p>
                <p className="text-base font-bold text-foreground">
                  {incomingTransfer.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {incomingTransfer.fileSize}
                </p>
                <p
                  className="text-sm font-semibold mt-0.5"
                  style={{ color: "oklch(0.82 0.15 195)" }}
                >
                  From: {incomingTransfer.sender}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                data-ocid="scanner.accept_button"
                className="flex-1 h-11 font-semibold"
                style={{
                  background: "oklch(0.78 0.18 145)",
                  color: "oklch(0.06 0.015 260)",
                  boxShadow: "0 0 16px oklch(0.78 0.18 145 / 0.4)",
                }}
                onClick={handleAccept}
              >
                <Check size={16} className="mr-1.5" />
                Accept
              </Button>
              <Button
                data-ocid="scanner.cancel_button"
                variant="outline"
                className="flex-1 h-11 font-semibold"
                style={{
                  borderColor: "oklch(0.65 0.22 25 / 0.4)",
                  color: "oklch(0.75 0.18 25)",
                }}
                onClick={handleDecline}
              >
                <X size={16} className="mr-1.5" />
                Decline
              </Button>
            </div>
          </motion.div>
        )}

        {incomingTransfer && transferState === "receiving" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl p-5 flex flex-col gap-3"
            style={{
              background: "oklch(0.13 0.025 260 / 0.95)",
              border: "1px solid oklch(0.82 0.15 195 / 0.4)",
            }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                Receiving {incomingTransfer.fileName}
              </p>
              <span
                className="text-xs font-mono"
                style={{ color: "oklch(0.82 0.15 195)" }}
              >
                {speed}
              </span>
            </div>
            <div className="space-y-1.5">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.round(progress)}%</span>
                <span>Receiving...</span>
              </div>
            </div>
          </motion.div>
        )}

        {transferState === "success" && (
          <motion.div
            data-ocid="scanner.success_state"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl p-6 flex flex-col items-center gap-3"
            style={{
              background: "oklch(0.13 0.025 260 / 0.95)",
              border: "1px solid oklch(0.78 0.18 145 / 0.5)",
              boxShadow: "0 0 30px oklch(0.78 0.18 145 / 0.2)",
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: "oklch(0.78 0.18 145 / 0.15)",
                border: "2px solid oklch(0.78 0.18 145 / 0.6)",
                boxShadow: "0 0 20px oklch(0.78 0.18 145 / 0.4)",
              }}
            >
              <Check size={28} style={{ color: "oklch(0.78 0.18 145)" }} />
            </motion.div>
            <div className="text-center">
              <p
                className="font-bold text-base"
                style={{ color: "oklch(0.78 0.18 145)" }}
              >
                File Received!
              </p>
              <p className="text-sm text-muted-foreground">
                {incomingTransfer?.fileName} saved to History
              </p>
              <p
                className="text-xs font-semibold mt-1"
                style={{ color: "oklch(0.82 0.15 195 / 0.8)" }}
              >
                From: {incomingTransfer?.sender}
              </p>
            </div>
            <button
              type="button"
              className="text-xs text-muted-foreground underline underline-offset-2"
              onClick={() => {
                setTransferState("idle");
                setIncomingTransfer(null);
                setLastResult(null);
              }}
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
