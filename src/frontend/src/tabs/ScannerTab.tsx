import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CameraOff,
  Check,
  ChevronDown,
  Copy,
  File,
  FlipHorizontal,
  Keyboard,
  QrCode,
  ScanLine,
  Share2,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
// Module-level PIN store: maps 6-digit PIN -> full OFS code
const OFS_PIN_KEY = "ofs_pin_store";

function setPinInStore(pin: string, ofsCode: string) {
  try {
    const raw = localStorage.getItem(OFS_PIN_KEY);
    const store: Record<string, string> = raw ? JSON.parse(raw) : {};
    store[pin] = ofsCode;
    localStorage.setItem(OFS_PIN_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

function getPinFromStore(pin: string): string | undefined {
  try {
    const raw = localStorage.getItem(OFS_PIN_KEY);
    if (!raw) return undefined;
    const store: Record<string, string> = JSON.parse(raw);
    return store[pin];
  } catch {
    return undefined;
  }
}

function deletePinFromStore(pin: string) {
  try {
    const raw = localStorage.getItem(OFS_PIN_KEY);
    if (!raw) return;
    const store: Record<string, string> = JSON.parse(raw);
    delete store[pin];
    localStorage.setItem(OFS_PIN_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

type Mode = "scan" | "mycode";

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ─── QR Code generator ───────────────────────────────────────────────────────
// Dynamically load qrcode generator via CDN
declare global {
  interface Window {
    QRCode:
      | { toDataURL: (text: string, opts: unknown) => Promise<string> }
      | undefined;
    qrcodeLoading?: boolean;
    qrcodeCallbacks?: Array<() => void>;
  }
}

function loadQRLib(): Promise<void> {
  return new Promise((resolve) => {
    if (window.QRCode) {
      resolve();
      return;
    }
    if (window.qrcodeLoading) {
      window.qrcodeCallbacks = window.qrcodeCallbacks || [];
      window.qrcodeCallbacks.push(resolve);
      return;
    }
    window.qrcodeLoading = true;
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    script.onload = () => {
      resolve();
      for (const cb of window.qrcodeCallbacks || []) cb();
      window.qrcodeCallbacks = [];
    };
    document.head.appendChild(script);
  });
}

function generateQRDataUrl(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const div = document.createElement("div");
    div.style.visibility = "hidden";
    div.style.position = "fixed";
    div.style.top = "-9999px";
    document.body.appendChild(div);
    try {
      const QRLib = window.QRCode as any;
      const qr = new QRLib(div, {
        text,
        width: 220,
        height: 220,
        colorDark: "#00e5ff",
        colorLight: "#0a0f1e",
        correctLevel: QRLib.CorrectLevel?.H ?? 3,
      });
      setTimeout(() => {
        const canvas = div.querySelector("canvas");
        const img = div.querySelector("img");
        if (canvas) {
          resolve(canvas.toDataURL("image/png"));
        } else if (img && (img as HTMLImageElement).src) {
          resolve((img as HTMLImageElement).src);
        } else {
          reject(new Error("No canvas/img"));
        }
        document.body.removeChild(div);
        void qr;
      }, 100);
    } catch (e) {
      document.body.removeChild(div);
      reject(e);
    }
  });
}

function useQRCodeDataUrl(text: string) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!text) return;
    setDataUrl(null);
    loadQRLib()
      .then(() => generateQRDataUrl(text))
      .then(setDataUrl)
      .catch(() => {});
  }, [text]);

  return dataUrl;
}

// ─── Scan Mode ────────────────────────────────────────────────────────────────
function ScanMode() {
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

  // Manual code entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState("");

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

  const handleManualSubmit = useCallback(() => {
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    // Resolve 6-digit PIN
    const digits = trimmed.replace(/[\s-]/g, "");
    let resolvedCode = trimmed;
    if (/^\d{6}$/.test(digits)) {
      const mapped = getPinFromStore(digits);
      if (!mapped) {
        toast.error("Code expired or not found");
        return;
      }
      resolvedCode = mapped;
    }
    const ofsData = parseOFSData(resolvedCode);
    if (ofsData) {
      setIncomingTransfer(ofsData);
      setTransferState("idle");
      setLastResult(resolvedCode);
      setShowManualEntry(false);
      setManualCode("");
    } else {
      toast.error("Invalid code format");
    }
  }, [manualCode]);

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
            <div
              className="absolute top-6 left-6 w-8 h-8"
              style={{
                borderTop: "3px solid oklch(0.82 0.15 195)",
                borderLeft: "3px solid oklch(0.82 0.15 195)",
                boxShadow:
                  "inset 4px 4px 8px oklch(0.82 0.15 195 / 0.3), 0 0 10px oklch(0.82 0.15 195 / 0.5)",
              }}
            />
            <div
              className="absolute top-6 right-6 w-8 h-8"
              style={{
                borderTop: "3px solid oklch(0.82 0.15 195)",
                borderRight: "3px solid oklch(0.82 0.15 195)",
                boxShadow:
                  "inset -4px 4px 8px oklch(0.82 0.15 195 / 0.3), 0 0 10px oklch(0.82 0.15 195 / 0.5)",
              }}
            />
            <div
              className="absolute bottom-6 left-6 w-8 h-8"
              style={{
                borderBottom: "3px solid oklch(0.82 0.15 195)",
                borderLeft: "3px solid oklch(0.82 0.15 195)",
                boxShadow:
                  "inset 4px -4px 8px oklch(0.82 0.15 195 / 0.3), 0 0 10px oklch(0.82 0.15 195 / 0.5)",
              }}
            />
            <div
              className="absolute bottom-6 right-6 w-8 h-8"
              style={{
                borderBottom: "3px solid oklch(0.82 0.15 195)",
                borderRight: "3px solid oklch(0.82 0.15 195)",
                boxShadow:
                  "inset -4px -4px 8px oklch(0.82 0.15 195 / 0.3), 0 0 10px oklch(0.82 0.15 195 / 0.5)",
              }}
            />

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

      {/* ── Manual Code Entry ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          border: "1px solid oklch(0.82 0.15 195 / 0.25)",
          background: "oklch(0.09 0.02 260 / 0.7)",
        }}
      >
        {/* Toggle header */}
        <button
          type="button"
          data-ocid="scanner.toggle"
          className="w-full flex items-center justify-between gap-3 px-4 py-3 transition-all"
          style={{
            background: showManualEntry
              ? "oklch(0.82 0.15 195 / 0.06)"
              : "transparent",
          }}
          onClick={() => setShowManualEntry((v) => !v)}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: "oklch(0.82 0.15 195 / 0.1)",
                border: "1px solid oklch(0.82 0.15 195 / 0.25)",
              }}
            >
              <Keyboard size={14} style={{ color: "oklch(0.82 0.15 195)" }} />
            </div>
            <span
              className="text-sm font-semibold"
              style={{ color: "oklch(0.82 0.15 195)" }}
            >
              Enter Code Manually
            </span>
          </div>
          <motion.div
            animate={{ rotate: showManualEntry ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown
              size={16}
              style={{ color: "oklch(0.82 0.15 195 / 0.7)" }}
            />
          </motion.div>
        </button>

        {/* Expandable body */}
        <AnimatePresence initial={false}>
          {showManualEntry && (
            <motion.div
              key="manual-entry"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
              <div
                className="px-4 pb-4 flex flex-col gap-3"
                style={{
                  borderTop: "1px solid oklch(0.82 0.15 195 / 0.15)",
                  paddingTop: "0.875rem",
                }}
              >
                <p className="text-xs text-muted-foreground">
                  Paste the OFS code shared by the sender to receive their file
                  instantly — no scanner needed.
                </p>
                <input
                  data-ocid="scanner.code_input"
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                  placeholder="e.g. ofs:file:photo.jpg:2.3 MB:OFS-Device-4521"
                  className="w-full rounded-xl px-4 py-3 text-sm font-mono outline-none"
                  style={{
                    background: "oklch(0.07 0.015 260)",
                    border: "1.5px solid oklch(0.82 0.15 195 / 0.3)",
                    color: "oklch(0.9 0.04 260)",
                    caretColor: "oklch(0.82 0.15 195)",
                    boxShadow: "inset 0 0 16px oklch(0.82 0.15 195 / 0.04)",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor =
                      "oklch(0.82 0.15 195 / 0.7)";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px oklch(0.82 0.15 195 / 0.1), inset 0 0 16px oklch(0.82 0.15 195 / 0.06)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      "oklch(0.82 0.15 195 / 0.3)";
                    e.currentTarget.style.boxShadow =
                      "inset 0 0 16px oklch(0.82 0.15 195 / 0.04)";
                  }}
                />
                <Button
                  data-ocid="scanner.code_submit_button"
                  className="w-full h-11 font-semibold"
                  style={{
                    background: manualCode.trim()
                      ? "oklch(0.82 0.15 195)"
                      : "oklch(0.18 0.03 260)",
                    color: manualCode.trim()
                      ? "oklch(0.06 0.015 260)"
                      : "oklch(0.4 0.03 260)",
                    boxShadow: manualCode.trim()
                      ? "0 0 18px oklch(0.82 0.15 195 / 0.4)"
                      : "none",
                    transition: "all 0.2s ease",
                  }}
                  disabled={!manualCode.trim()}
                  onClick={handleManualSubmit}
                >
                  <ScanLine size={16} className="mr-2" />
                  Receive File
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
                <p className="text-sm font-bold text-foreground">
                  {incomingTransfer.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {incomingTransfer.fileSize} · from {incomingTransfer.sender}
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
                {incomingTransfer?.fileName} saved successfully
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

// ─── My Code Mode ─────────────────────────────────────────────────────────────
function MyCodeMode() {
  const [step, setStep] = useState<"select" | "qrcode">("select");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deviceId = useMemo(() => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `OFS-Device-${num}`;
  }, []);

  const ofsCode = selectedFile
    ? `ofs:file:${selectedFile.name}:${formatFileSize(selectedFile.size)}:${deviceId}`
    : `ofs:device:${deviceId}`;

  // biome-ignore lint/correctness/useExhaustiveDependencies: pin is intentionally stable per device
  const pin = useMemo(() => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }, [deviceId]);

  // Register PIN in the module-level store whenever ofsCode changes
  useEffect(() => {
    if (ofsCode) {
      setPinInStore(pin, ofsCode);
    }
    return () => {
      deletePinFromStore(pin);
    };
  }, [pin, ofsCode]);

  const [pinCopied, setPinCopied] = useState(false);

  const handleCopyPin = useCallback(() => {
    const formatted = `${pin.slice(0, 3)} ${pin.slice(3)}`;
    navigator.clipboard.writeText(formatted).then(() => {
      toast.success("PIN copied!");
      setPinCopied(true);
      setTimeout(() => setPinCopied(false), 2000);
    });
  }, [pin]);

  const qrDataUrl = useQRCodeDataUrl(ofsCode);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) setSelectedFile(file);
    },
    [],
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleShare = useCallback(() => {
    const text = selectedFile
      ? `Scan to receive ${selectedFile.name} from ${deviceId}`
      : `Scan to send files to ${deviceId}`;
    if (navigator.share) {
      navigator.share({ title: "OFS Device Code", text, url: ofsCode });
    } else {
      navigator.clipboard.writeText(ofsCode).then(() => {
        toast.success("Device code copied!");
      });
    }
  }, [deviceId, ofsCode, selectedFile]);

  const handleBack = useCallback(() => {
    setStep("select");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <div className="flex flex-col gap-4 pt-2">
      <AnimatePresence mode="wait">
        {step === "select" ? (
          <motion.div
            key="select"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-col gap-4"
          >
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-1">
              <div
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: "oklch(0.82 0.15 195)" }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: "oklch(0.82 0.15 195)",
                    color: "oklch(0.06 0.015 260)",
                  }}
                >
                  1
                </span>
                Select File
              </div>
              <div
                className="flex-1 h-px"
                style={{ background: "oklch(0.25 0.04 260 / 0.5)" }}
              />
              <div
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: "oklch(0.45 0.03 260)" }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: "oklch(0.2 0.03 260)",
                    color: "oklch(0.45 0.03 260)",
                    border: "1px solid oklch(0.3 0.04 260 / 0.5)",
                  }}
                >
                  2
                </span>
                Show QR Code
              </div>
            </div>

            {/* Drop zone */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />

            <motion.div
              data-ocid="scanner.dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              animate={{
                scale: isDragOver ? 1.02 : 1,
                borderColor: isDragOver
                  ? "oklch(0.82 0.15 195 / 0.8)"
                  : "oklch(0.82 0.15 195 / 0.3)",
              }}
              className="relative flex flex-col items-center justify-center gap-4 rounded-3xl cursor-pointer select-none"
              style={{
                minHeight: "200px",
                background: isDragOver
                  ? "oklch(0.82 0.15 195 / 0.06)"
                  : "oklch(0.1 0.02 260 / 0.6)",
                border: "2px dashed oklch(0.82 0.15 195 / 0.3)",
                boxShadow: isDragOver
                  ? "0 0 30px oklch(0.82 0.15 195 / 0.15), inset 0 0 30px oklch(0.82 0.15 195 / 0.05)"
                  : "none",
                transition: "background 0.2s, box-shadow 0.2s",
              }}
            >
              <motion.div
                animate={{ y: isDragOver ? -6 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex flex-col items-center gap-3"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "oklch(0.82 0.15 195 / 0.1)",
                    border: "1px solid oklch(0.82 0.15 195 / 0.25)",
                    boxShadow: "0 0 20px oklch(0.82 0.15 195 / 0.1)",
                  }}
                >
                  <Upload size={28} style={{ color: "oklch(0.82 0.15 195)" }} />
                </div>
                <div className="text-center">
                  <p
                    className="text-sm font-bold"
                    style={{ color: "oklch(0.82 0.15 195)" }}
                  >
                    {isDragOver ? "Drop it here" : "Select a file to share"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tap to browse or drag & drop
                  </p>
                </div>
              </motion.div>

              {/* Animated corner accents */}
              <div
                className="absolute top-3 left-3 w-4 h-4"
                style={{
                  borderTop: "2px solid oklch(0.82 0.15 195 / 0.5)",
                  borderLeft: "2px solid oklch(0.82 0.15 195 / 0.5)",
                }}
              />
              <div
                className="absolute top-3 right-3 w-4 h-4"
                style={{
                  borderTop: "2px solid oklch(0.82 0.15 195 / 0.5)",
                  borderRight: "2px solid oklch(0.82 0.15 195 / 0.5)",
                }}
              />
              <div
                className="absolute bottom-3 left-3 w-4 h-4"
                style={{
                  borderBottom: "2px solid oklch(0.82 0.15 195 / 0.5)",
                  borderLeft: "2px solid oklch(0.82 0.15 195 / 0.5)",
                }}
              />
              <div
                className="absolute bottom-3 right-3 w-4 h-4"
                style={{
                  borderBottom: "2px solid oklch(0.82 0.15 195 / 0.5)",
                  borderRight: "2px solid oklch(0.82 0.15 195 / 0.5)",
                }}
              />
            </motion.div>

            {/* Select File button */}
            <Button
              data-ocid="scanner.upload_button"
              className="w-full h-12 font-semibold"
              style={{
                background: "oklch(0.82 0.15 195 / 0.12)",
                border: "1px solid oklch(0.82 0.15 195 / 0.4)",
                color: "oklch(0.82 0.15 195)",
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <File size={16} className="mr-2" />
              Browse Files
            </Button>

            {/* Selected file preview */}
            <AnimatePresence>
              {selectedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  className="rounded-2xl p-4 flex items-center gap-3"
                  style={{
                    background: "oklch(0.13 0.025 260 / 0.8)",
                    border: "1px solid oklch(0.65 0.2 295 / 0.4)",
                    boxShadow: "0 0 16px oklch(0.65 0.2 295 / 0.1)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "oklch(0.65 0.2 295 / 0.12)",
                      border: "1px solid oklch(0.65 0.2 295 / 0.3)",
                    }}
                  >
                    <File size={18} style={{ color: "oklch(0.65 0.2 295)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "oklch(0.65 0.22 25 / 0.1)",
                      border: "1px solid oklch(0.65 0.22 25 / 0.3)",
                      color: "oklch(0.75 0.18 25)",
                    }}
                  >
                    <X size={13} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Continue button */}
            <Button
              data-ocid="scanner.confirm_button"
              disabled={!selectedFile}
              className="w-full h-12 font-semibold"
              style={{
                background: selectedFile
                  ? "oklch(0.82 0.15 195)"
                  : "oklch(0.2 0.03 260)",
                color: selectedFile
                  ? "oklch(0.06 0.015 260)"
                  : "oklch(0.4 0.03 260)",
                boxShadow: selectedFile
                  ? "0 0 24px oklch(0.82 0.15 195 / 0.45)"
                  : "none",
                transition: "all 0.25s ease",
              }}
              onClick={() => selectedFile && setStep("qrcode")}
            >
              <QrCode size={16} className="mr-2" />
              {selectedFile ? "Generate QR Code" : "Select a file first"}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="qrcode"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-col items-center gap-5"
          >
            {/* Step indicator */}
            <div className="flex items-center gap-2 w-full mb-1">
              <div
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: "oklch(0.55 0.03 260)" }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{
                    background: "oklch(0.78 0.18 145 / 0.15)",
                    border: "1px solid oklch(0.78 0.18 145 / 0.4)",
                    color: "oklch(0.78 0.18 145)",
                  }}
                >
                  <Check size={11} />
                </span>
                Select File
              </div>
              <div
                className="flex-1 h-px"
                style={{ background: "oklch(0.82 0.15 195 / 0.4)" }}
              />
              <div
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: "oklch(0.82 0.15 195)" }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: "oklch(0.82 0.15 195)",
                    color: "oklch(0.06 0.015 260)",
                  }}
                >
                  2
                </span>
                Show QR Code
              </div>
            </div>

            {/* File info chip */}
            {selectedFile && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl w-full"
                style={{
                  background: "oklch(0.65 0.2 295 / 0.1)",
                  border: "1px solid oklch(0.65 0.2 295 / 0.3)",
                }}
              >
                <File
                  size={15}
                  style={{ color: "oklch(0.65 0.2 295)", flexShrink: 0 }}
                />
                <span className="text-xs font-semibold text-foreground truncate flex-1">
                  {selectedFile.name}
                </span>
                <span
                  className="text-xs font-mono flex-shrink-0"
                  style={{ color: "oklch(0.65 0.2 295)" }}
                >
                  {formatFileSize(selectedFile.size)}
                </span>
              </motion.div>
            )}

            {/* QR card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative p-6 rounded-3xl flex flex-col items-center gap-4 w-full"
              style={{
                background: "oklch(0.11 0.02 260 / 0.9)",
                border: "1.5px solid oklch(0.82 0.15 195 / 0.5)",
                boxShadow:
                  "0 0 40px oklch(0.82 0.15 195 / 0.2), 0 0 80px oklch(0.65 0.2 295 / 0.1), inset 0 0 30px oklch(0.82 0.15 195 / 0.03)",
              }}
            >
              <motion.div
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{ border: "1px solid oklch(0.82 0.15 195 / 0.2)" }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 2.5,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />

              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "oklch(0.82 0.15 195)" }}
              >
                Scan to Receive File
              </p>

              <div
                className="rounded-2xl overflow-hidden p-3"
                style={{
                  background: "oklch(0.06 0.015 260)",
                  border: "1px solid oklch(0.82 0.15 195 / 0.2)",
                }}
              >
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR code for ${selectedFile?.name}`}
                    width={200}
                    height={200}
                    className="block"
                    style={{ imageRendering: "pixelated" }}
                  />
                ) : (
                  <div
                    className="w-[200px] h-[200px] flex items-center justify-center"
                    data-ocid="scanner.loading_state"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      }}
                    >
                      <QrCode
                        size={40}
                        style={{ color: "oklch(0.82 0.15 195 / 0.4)" }}
                      />
                    </motion.div>
                  </div>
                )}
              </div>

              <div className="text-center">
                <p
                  className="font-mono font-bold text-base tracking-wider"
                  style={{ color: "oklch(0.82 0.15 195)" }}
                >
                  {deviceId}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ask nearby devices to scan this code
                </p>
              </div>

              {/* ── Share PIN ─────────────────────────────────────────────── */}
              <div
                className="w-full flex flex-col items-center gap-2 rounded-xl p-4"
                style={{
                  background: "oklch(0.07 0.015 260)",
                  border: "1px solid oklch(0.82 0.15 195 / 0.35)",
                  boxShadow: "0 0 20px oklch(0.82 0.15 195 / 0.1)",
                }}
              >
                <p
                  className="text-xs font-semibold tracking-widest uppercase"
                  style={{ color: "oklch(0.65 0.08 195)" }}
                >
                  Share Code
                </p>
                <div className="flex items-center gap-3">
                  <span
                    className="font-mono font-bold tracking-[0.25em]"
                    style={{
                      fontSize: "2rem",
                      color: "oklch(0.88 0.18 195)",
                      textShadow:
                        "0 0 16px oklch(0.82 0.15 195 / 0.7), 0 0 32px oklch(0.82 0.15 195 / 0.3)",
                      letterSpacing: "0.25em",
                    }}
                  >
                    {pin.slice(0, 3)} {pin.slice(3)}
                  </span>
                  <button
                    type="button"
                    data-ocid="scanner.pin_copy_button"
                    onClick={handleCopyPin}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
                    style={{
                      background: pinCopied
                        ? "oklch(0.78 0.18 145 / 0.15)"
                        : "oklch(0.82 0.15 195 / 0.12)",
                      border: pinCopied
                        ? "1px solid oklch(0.78 0.18 145 / 0.4)"
                        : "1px solid oklch(0.82 0.15 195 / 0.3)",
                      color: pinCopied
                        ? "oklch(0.78 0.18 145)"
                        : "oklch(0.82 0.15 195)",
                    }}
                    title="Copy PIN"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {pinCopied ? (
                        <motion.span
                          key="check"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Check size={14} />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="copy"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Copy size={14} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Receiver types this 6-digit code to get the file instantly
                </p>
              </div>

              <Button
                className="w-full h-11 font-semibold"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.82 0.15 195 / 0.15), oklch(0.65 0.2 295 / 0.15))",
                  border: "1px solid oklch(0.82 0.15 195 / 0.4)",
                  color: "oklch(0.82 0.15 195)",
                }}
                onClick={handleShare}
              >
                <Share2 size={16} className="mr-2" />
                Share Device Code
              </Button>
            </motion.div>

            {/* Back button */}
            <Button
              data-ocid="scanner.back_button"
              variant="outline"
              className="w-full h-11 font-semibold"
              style={{
                borderColor: "oklch(0.35 0.05 260 / 0.6)",
                color: "oklch(0.6 0.05 260)",
              }}
              onClick={handleBack}
            >
              <ArrowLeft size={16} className="mr-2" />
              Back — Change File
            </Button>

            {/* Instructions */}
            <div
              className="w-full rounded-2xl p-4"
              style={{
                background: "oklch(0.11 0.02 260 / 0.6)",
                border: "1px solid oklch(0.3 0.05 260 / 0.4)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-3"
                style={{ color: "oklch(0.65 0.2 295)" }}
              >
                How to share files
              </p>
              <ol className="flex flex-col gap-2">
                {[
                  "Select a file to share (done ✓)",
                  "Show this QR code to the receiver",
                  "They scan it from the Scanner tab",
                  "Receiver accepts the incoming transfer",
                ].map((stepText, i) => (
                  <li
                    key={stepText}
                    className="flex items-start gap-2.5 text-xs"
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{
                        background:
                          i === 0
                            ? "oklch(0.78 0.18 145 / 0.15)"
                            : "oklch(0.82 0.15 195 / 0.12)",
                        color:
                          i === 0
                            ? "oklch(0.78 0.18 145)"
                            : "oklch(0.82 0.15 195)",
                        border:
                          i === 0
                            ? "1px solid oklch(0.78 0.18 145 / 0.35)"
                            : "1px solid oklch(0.82 0.15 195 / 0.25)",
                      }}
                    >
                      {i === 0 ? <Check size={10} /> : i + 1}
                    </span>
                    <span
                      className="pt-0.5"
                      style={{
                        color:
                          i === 0 ? "oklch(0.78 0.18 145 / 0.8)" : undefined,
                      }}
                    >
                      {i === 0 ? (
                        <span className="text-muted-foreground line-through">
                          {stepText}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {stepText}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Transferred & Received Files ─────────────────────────────────────────────
interface HistoryRecord {
  sender: string;
  receiver: string;
  fileName: string;
  fileSize: string;
  transferredAt: string;
  status: "completed" | "failed";
  fileData?: string; // base64 data URL if available
}

function TransferredFilesSection() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ofs_transfer_history");
      if (raw) {
        const parsed = JSON.parse(raw);
        setRecords(parsed.slice(0, 20)); // show last 20
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleDownload = useCallback((record: HistoryRecord) => {
    if (record.fileData) {
      // If we have actual file data stored
      const a = document.createElement("a");
      a.href = record.fileData;
      a.download = record.fileName;
      a.click();
    } else {
      // Create a placeholder text file with info
      const text = `OFS Transfer Record\nFile: ${record.fileName}\nSize: ${record.fileSize}\nStatus: ${record.status}\nDate: ${new Date(Number(record.transferredAt) / 1_000_000).toLocaleString()}`;
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${record.fileName}.transfer-info.txt`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }, []);

  const completedRecords = records.filter((r) => r.status === "completed");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-6"
    >
      <div className="flex items-center justify-between mb-3">
        <h2
          className="font-display font-bold text-base"
          style={{ color: "oklch(0.82 0.15 195)" }}
        >
          Transferred & Received Files
        </h2>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            background: "oklch(0.82 0.15 195 / 0.12)",
            color: "oklch(0.82 0.15 195 / 0.7)",
            border: "1px solid oklch(0.82 0.15 195 / 0.2)",
          }}
        >
          {completedRecords.length} files
        </span>
      </div>

      {completedRecords.length === 0 ? (
        <div
          data-ocid="scanner.files.empty_state"
          className="flex flex-col items-center justify-center py-10 rounded-2xl gap-3"
          style={{
            background: "oklch(0.1 0.02 260 / 0.5)",
            border: "1px dashed oklch(0.25 0.04 260 / 0.6)",
          }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: "oklch(0.82 0.15 195 / 0.08)",
              border: "1px solid oklch(0.82 0.15 195 / 0.2)",
            }}
          >
            <File size={22} style={{ color: "oklch(0.82 0.15 195 / 0.5)" }} />
          </div>
          <p className="text-sm text-muted-foreground">
            No transferred files yet
          </p>
          <p className="text-xs text-muted-foreground opacity-60">
            Files you send or receive will appear here
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2" data-ocid="scanner.files.list">
          {completedRecords.map((record, i) => {
            const date = new Date(Number(record.transferredAt) / 1_000_000);
            const isReceived = record.sender !== "me";
            return (
              <motion.div
                key={`${record.fileName}-${i}`}
                data-ocid={`scanner.files.item.${i + 1}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{
                  background: "oklch(0.12 0.025 260 / 0.8)",
                  border: "1px solid oklch(0.22 0.04 260 / 0.5)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isReceived
                      ? "oklch(0.78 0.18 145 / 0.15)"
                      : "oklch(0.82 0.15 195 / 0.12)",
                    border: isReceived
                      ? "1px solid oklch(0.78 0.18 145 / 0.4)"
                      : "1px solid oklch(0.82 0.15 195 / 0.3)",
                  }}
                >
                  <File
                    size={16}
                    style={{
                      color: isReceived
                        ? "oklch(0.78 0.18 145)"
                        : "oklch(0.82 0.15 195)",
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: "oklch(0.92 0.02 260)" }}
                  >
                    {record.fileName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                      style={{
                        background: isReceived
                          ? "oklch(0.78 0.18 145 / 0.15)"
                          : "oklch(0.82 0.15 195 / 0.12)",
                        color: isReceived
                          ? "oklch(0.78 0.18 145)"
                          : "oklch(0.82 0.15 195)",
                      }}
                    >
                      {isReceived ? "Received" : "Sent"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {date.toLocaleDateString()}{" "}
                      {date.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  data-ocid={`scanner.files.download_button.${i + 1}`}
                  onClick={() => handleDownload(record)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
                  style={{
                    background: "oklch(0.78 0.18 145 / 0.12)",
                    border: "1px solid oklch(0.78 0.18 145 / 0.35)",
                    color: "oklch(0.78 0.18 145)",
                  }}
                >
                  <Upload size={12} style={{ transform: "rotate(180deg)" }} />
                  Save
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Scanner Tab ─────────────────────────────────────────────────────────
export function ScannerTab() {
  const [mode, setMode] = useState<Mode>("scan");

  return (
    <div className="pb-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-4 pb-5"
      >
        <h1 className="font-display text-2xl font-bold gradient-text">
          Scanner
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Scan to receive files or show your code to receive
        </p>
      </motion.div>

      {/* Mode pill switcher */}
      <div
        className="flex p-1 rounded-2xl mb-5"
        style={{
          background: "oklch(0.1 0.02 260 / 0.8)",
          border: "1px solid oklch(0.25 0.04 260 / 0.5)",
        }}
      >
        <button
          type="button"
          data-ocid="scanner.scan_tab"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all"
          style={{
            background:
              mode === "scan"
                ? "linear-gradient(135deg, oklch(0.82 0.15 195 / 0.2), oklch(0.65 0.2 295 / 0.15))"
                : "transparent",
            color:
              mode === "scan" ? "oklch(0.82 0.15 195)" : "oklch(0.55 0.03 260)",
            border:
              mode === "scan"
                ? "1px solid oklch(0.82 0.15 195 / 0.3)"
                : "1px solid transparent",
            boxShadow:
              mode === "scan" ? "0 0 16px oklch(0.82 0.15 195 / 0.15)" : "none",
          }}
          onClick={() => setMode("scan")}
        >
          <ScanLine size={15} />
          Scan
        </button>
        <button
          type="button"
          data-ocid="scanner.my_code_tab"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all"
          style={{
            background:
              mode === "mycode"
                ? "linear-gradient(135deg, oklch(0.65 0.2 295 / 0.2), oklch(0.82 0.15 195 / 0.15))"
                : "transparent",
            color:
              mode === "mycode"
                ? "oklch(0.75 0.18 295)"
                : "oklch(0.55 0.03 260)",
            border:
              mode === "mycode"
                ? "1px solid oklch(0.65 0.2 295 / 0.3)"
                : "1px solid transparent",
            boxShadow:
              mode === "mycode"
                ? "0 0 16px oklch(0.65 0.2 295 / 0.15)"
                : "none",
          }}
          onClick={() => setMode("mycode")}
        >
          <QrCode size={15} />
          My Code
        </button>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, x: mode === "scan" ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: mode === "scan" ? 20 : -20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {mode === "scan" ? <ScanMode /> : <MyCodeMode />}
        </motion.div>
      </AnimatePresence>

      {/* Transferred & Received Files */}
      <TransferredFilesSection />
    </div>
  );
}
