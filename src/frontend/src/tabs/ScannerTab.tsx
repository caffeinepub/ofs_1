import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  Camera,
  CameraOff,
  Check,
  FlipHorizontal,
  Loader2,
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
  downloadUrl?: string;
  raw: string;
}

function parseOFSData(data: string): OFSTransfer | null {
  if (!data.startsWith("ofs:")) return null;
  const parts = data.split(":");
  if (parts.length >= 4 && parts[1] === "file") {
    let downloadUrl: string | undefined;
    if (parts.length >= 6) {
      downloadUrl = parts.slice(5).join(":");
    }
    return {
      fileName: parts[2] || "Unknown File",
      fileSize: parts[3] || "Unknown Size",
      sender: parts[4] || "Nearby Device",
      downloadUrl,
      raw: data,
    };
  }
  return null;
}

interface ScannerTabProps {
  onClose?: () => void;
}

export function ScannerTab({ onClose: _onClose }: ScannerTabProps) {
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

  // Start camera immediately when component mounts — no delay
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    scanner.startScanning();
    return () => {
      scanner.stopScanning();
    };
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
        if (incomingTransfer) {
          addReceived.mutate({
            sender: incomingTransfer.sender,
            fileName: incomingTransfer.fileName,
            fileSize: BigInt(parseFileSizeToBytes(incomingTransfer.fileSize)),
            downloadUrl: incomingTransfer.downloadUrl,
          });
          toast.success("File received!", {
            description: `${incomingTransfer.fileName} saved to History`,
          });
        }
      }
    }, 80);
  }, [addReceived, incomingTransfer]);

  const handleDecline = useCallback(() => {
    setTransferState("declined");
    setIncomingTransfer(null);
    setTimeout(() => setTransferState("idle"), 1500);
  }, []);

  useEffect(() => {
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  const isLoading = scanner.isLoading;
  const hasError = !!scanner.error;
  const cameraActive = scanner.isActive;

  return (
    <div className="flex flex-col h-full min-h-[60vh]">
      {/* Camera view area */}
      <div
        className="relative flex-1 overflow-hidden bg-black"
        style={{ minHeight: 320 }}
      >
        {/* Video element always in DOM */}
        <video
          ref={scanner.videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{
            display: cameraActive ? "block" : "none",
            minHeight: 320,
          }}
        />
        {/* Hidden canvas for QR grabbing */}
        <canvas ref={scanner.canvasRef} className="hidden" />

        {/* Scanning overlay when active */}
        {cameraActive && (
          <>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-56 h-56 rounded-2xl relative"
                style={{ border: "2px solid oklch(0.82 0.15 195 / 0.85)" }}
              >
                {/* Animated scan line */}
                <motion.div
                  className="absolute left-2 right-2 h-0.5 rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, oklch(0.82 0.15 195), transparent)",
                    boxShadow: "0 0 8px oklch(0.82 0.15 195 / 0.8)",
                  }}
                  animate={{ top: ["8%", "88%", "8%"] }}
                  transition={{
                    duration: 2.2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                />
                {/* Corner markers */}
                {(["tl", "tr", "bl", "br"] as const).map((corner) => (
                  <div
                    key={corner}
                    className="absolute w-6 h-6"
                    style={{
                      ...(corner === "tl"
                        ? { top: -2, left: -2 }
                        : corner === "tr"
                          ? { top: -2, right: -2 }
                          : corner === "bl"
                            ? { bottom: -2, left: -2 }
                            : { bottom: -2, right: -2 }),
                      borderColor: "oklch(0.82 0.15 195)",
                      borderStyle: "solid",
                      borderWidth: 0,
                      ...(corner === "tl"
                        ? {
                            borderTopWidth: 3,
                            borderLeftWidth: 3,
                            borderTopLeftRadius: 6,
                          }
                        : corner === "tr"
                          ? {
                              borderTopWidth: 3,
                              borderRightWidth: 3,
                              borderTopRightRadius: 6,
                            }
                          : corner === "bl"
                            ? {
                                borderBottomWidth: 3,
                                borderLeftWidth: 3,
                                borderBottomLeftRadius: 6,
                              }
                            : {
                                borderBottomWidth: 3,
                                borderRightWidth: 3,
                                borderBottomRightRadius: 6,
                              }),
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Flip camera button */}
            <div className="absolute top-4 right-4">
              <button
                type="button"
                onClick={scanner.switchCamera}
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: "oklch(0.12 0.025 260 / 0.85)",
                  border: "1px solid oklch(0.3 0.05 260 / 0.5)",
                  color: "oklch(0.82 0.15 195)",
                }}
                data-ocid="scanner.flip_camera.button"
              >
                <FlipHorizontal size={18} />
              </button>
            </div>

            {/* Hint label */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center px-4">
              <p
                className="text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5"
                style={{
                  background: "oklch(0.12 0.025 260 / 0.85)",
                  color: "oklch(0.82 0.15 195)",
                  border: "1px solid oklch(0.82 0.15 195 / 0.3)",
                }}
              >
                <ScanLine size={12} />
                Point camera at sender's QR code
              </p>
            </div>
          </>
        )}

        {/* Loading state */}
        {isLoading && !cameraActive && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{ background: "oklch(0.08 0.02 260)" }}
          >
            <Loader2
              size={36}
              style={{ color: "oklch(0.82 0.15 195)" }}
              className="animate-spin"
            />
            <p className="text-sm text-muted-foreground">Starting camera...</p>
          </div>
        )}

        {/* Error state */}
        {hasError && !isLoading && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6"
            style={{ background: "oklch(0.08 0.02 260)" }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: "oklch(0.65 0.2 25 / 0.1)",
                border: "1px solid oklch(0.65 0.2 25 / 0.3)",
              }}
            >
              <AlertCircle size={28} style={{ color: "oklch(0.65 0.2 25)" }} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Camera Error
              </p>
              <p className="text-xs text-muted-foreground">
                {scanner.error?.message ?? "Could not access camera"}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Make sure camera permission is allowed in your browser settings.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => scanner.retry()}
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.82 0.15 195), oklch(0.65 0.2 295))",
                color: "oklch(0.08 0.015 260)",
              }}
              data-ocid="scanner.retry.button"
            >
              <Camera size={14} className="mr-2" />
              Try Again
            </Button>
          </div>
        )}

        {/* Idle / not started state */}
        {!cameraActive && !isLoading && !hasError && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6"
            style={{ background: "oklch(0.08 0.02 260)" }}
          >
            <motion.div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{
                background: "oklch(0.82 0.15 195 / 0.08)",
                border: "1.5px solid oklch(0.82 0.15 195 / 0.3)",
              }}
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            >
              <CameraOff size={32} style={{ color: "oklch(0.82 0.15 195)" }} />
            </motion.div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                Camera not started
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tap the button below to activate
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => scanner.startScanning()}
              className="font-semibold rounded-2xl px-8"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.82 0.15 195), oklch(0.65 0.2 295))",
                color: "oklch(0.08 0.015 260)",
                boxShadow: "0 4px 20px oklch(0.82 0.15 195 / 0.35)",
              }}
              data-ocid="scanner.start.button"
            >
              <Camera size={18} className="mr-2" />
              Start Scanning
            </Button>
          </div>
        )}
      </div>

      {/* Incoming transfer panel */}
      <AnimatePresence>
        {incomingTransfer && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="p-4 flex flex-col gap-3"
            style={{
              background: "oklch(0.1 0.02 260 / 0.98)",
              borderTop: "1px solid oklch(0.25 0.04 260 / 0.6)",
            }}
            data-ocid="scanner.transfer.panel"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "oklch(0.82 0.15 195 / 0.12)",
                  border: "1px solid oklch(0.82 0.15 195 / 0.3)",
                }}
              >
                <ScanLine size={18} style={{ color: "oklch(0.82 0.15 195)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-bold truncate"
                  style={{ color: "oklch(0.88 0.18 195)" }}
                >
                  {incomingTransfer.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {incomingTransfer.fileSize} · from{" "}
                  <span style={{ color: "oklch(0.78 0.18 145)" }}>
                    {incomingTransfer.sender}
                  </span>
                </p>
              </div>
            </div>

            {transferState === "idle" && (
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  style={{
                    background: "oklch(0.78 0.18 145 / 0.15)",
                    border: "1px solid oklch(0.78 0.18 145 / 0.4)",
                    color: "oklch(0.78 0.18 145)",
                  }}
                  onClick={handleAccept}
                  data-ocid="scanner.accept.button"
                >
                  <Check size={15} className="mr-1" />
                  Accept
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleDecline}
                  data-ocid="scanner.decline.button"
                >
                  <X size={15} className="mr-1" />
                  Decline
                </Button>
              </div>
            )}

            {transferState === "receiving" && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Receiving...</span>
                  <span>{speed}</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}

            {transferState === "success" && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{
                  background: "oklch(0.78 0.18 145 / 0.1)",
                  border: "1px solid oklch(0.78 0.18 145 / 0.3)",
                }}
                data-ocid="scanner.success_state"
              >
                <Check size={16} style={{ color: "oklch(0.78 0.18 145)" }} />
                <span
                  className="text-sm font-semibold"
                  style={{ color: "oklch(0.78 0.18 145)" }}
                >
                  Received! Check History tab to download.
                </span>
              </motion.div>
            )}

            {transferState === "declined" && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{
                  background: "oklch(0.65 0.2 25 / 0.1)",
                  border: "1px solid oklch(0.65 0.2 25 / 0.3)",
                }}
              >
                <X size={16} style={{ color: "oklch(0.65 0.2 25)" }} />
                <span
                  className="text-sm font-semibold"
                  style={{ color: "oklch(0.65 0.2 25)" }}
                >
                  Transfer declined
                </span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
