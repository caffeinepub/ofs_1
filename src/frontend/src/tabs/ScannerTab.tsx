import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  Camera,
  CameraOff,
  Check,
  Copy,
  FlipHorizontal,
  QrCode,
  ScanLine,
  Share2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useQRScanner } from "../qr-code/useQRScanner";

declare global {
  interface Window {
    QRCodeLib: any;
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
  // Format: ofs:file:filename.ext:size:senderName
  const parts = data.split(":");
  if (parts.length >= 4 && parts[1] === "file") {
    return {
      fileName: parts[2] || "Unknown File",
      fileSize: parts[3] || "Unknown Size",
      sender: parts[4] || "Nearby Device",
      raw: data,
    };
  }
  // ofs:device: is a device code, not a file transfer
  return null;
}

// ─── QR Code generator (My Code mode) ────────────────────────────────────────
function useQRCodeDataUrl(text: string) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const generate = () => {
      if (window.QRCodeLib) {
        window.QRCodeLib.toDataURL(
          text,
          {
            width: 220,
            margin: 2,
            color: { dark: "#00e5ff", light: "#0a0f1e" },
          },
          (err: Error | null, url: string) => {
            if (!err) setDataUrl(url);
          },
        );
        return;
      }
      // Fallback: generate via quickchart.io
      setDataUrl(
        `https://quickchart.io/qr?text=${encodeURIComponent(text)}&size=220&dark=00e5ff&light=0a0f1e`,
      );
    };

    if (window.QRCodeLib) {
      generate();
      return;
    }

    const existing = document.getElementById("qrcode-lib");
    if (existing) {
      existing.addEventListener("load", generate, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "qrcode-lib";
    script.src =
      "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js";
    script.onload = () => {
      // qrcode lib uses module.exports - check window.QRCode or window.qrcode
      window.QRCodeLib =
        (window as any).QRCode || (window as any).qrcode || null;
      generate();
    };
    script.onerror = () => {
      // CDN failed, use fallback
      generate();
    };
    document.head.appendChild(script);
  }, [text]);

  return dataUrl;
}

// ─── Scan Mode ────────────────────────────────────────────────────────────────
function ScanMode() {
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

  // Handle new QR results
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
    // Non-OFS QR codes just shown in the result card (handled below)
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
      }
    }, 150);
  }, []);

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
      {/* Error Banner */}
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

      {/* Camera viewfinder */}
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
        {/* Video feed */}
        <video
          ref={scanner.videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          playsInline
          muted
          style={{ display: scanner.isActive ? "block" : "none" }}
        />

        {/* Canvas for QR processing (hidden) */}
        <canvas
          ref={scanner.canvasRef}
          data-ocid="scanner.canvas_target"
          className="hidden"
        />

        {/* Idle placeholder */}
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

        {/* Corner brackets */}
        {scanner.isActive && (
          <>
            {/* Top-left */}
            <div
              className="absolute top-6 left-6 w-8 h-8"
              style={{
                borderTop: "3px solid oklch(0.82 0.15 195)",
                borderLeft: "3px solid oklch(0.82 0.15 195)",
                boxShadow:
                  "inset 4px 4px 8px oklch(0.82 0.15 195 / 0.3), 0 0 10px oklch(0.82 0.15 195 / 0.5)",
              }}
            />
            {/* Top-right */}
            <div
              className="absolute top-6 right-6 w-8 h-8"
              style={{
                borderTop: "3px solid oklch(0.82 0.15 195)",
                borderRight: "3px solid oklch(0.82 0.15 195)",
                boxShadow:
                  "inset -4px 4px 8px oklch(0.82 0.15 195 / 0.3), 0 0 10px oklch(0.82 0.15 195 / 0.5)",
              }}
            />
            {/* Bottom-left */}
            <div
              className="absolute bottom-6 left-6 w-8 h-8"
              style={{
                borderBottom: "3px solid oklch(0.82 0.15 195)",
                borderLeft: "3px solid oklch(0.82 0.15 195)",
                boxShadow:
                  "inset 4px -4px 8px oklch(0.82 0.15 195 / 0.3), 0 0 10px oklch(0.82 0.15 195 / 0.5)",
              }}
            />
            {/* Bottom-right */}
            <div
              className="absolute bottom-6 right-6 w-8 h-8"
              style={{
                borderBottom: "3px solid oklch(0.82 0.15 195)",
                borderRight: "3px solid oklch(0.82 0.15 195)",
                boxShadow:
                  "inset -4px -4px 8px oklch(0.82 0.15 195 / 0.3), 0 0 10px oklch(0.82 0.15 195 / 0.5)",
              }}
            />

            {/* Animated scan line */}
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

            {/* Scanning indicator */}
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

        {/* Loading overlay */}
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

      {/* Non-OFS QR result card */}
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

      {/* Incoming OFS transfer sheet */}
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
  const deviceId = useMemo(() => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `OFS-Device-${num}`;
  }, []);

  const ofsCode = `ofs:device:${deviceId}`;
  const qrDataUrl = useQRCodeDataUrl(ofsCode);

  const handleShare = useCallback(() => {
    const text = `Scan to send files to ${deviceId}`;
    if (navigator.share) {
      navigator.share({ title: "OFS Device Code", text, url: ofsCode });
    } else {
      navigator.clipboard.writeText(ofsCode).then(() => {
        toast.success("Device code copied!");
      });
    }
  }, [deviceId, ofsCode]);

  return (
    <div className="flex flex-col items-center gap-6 pt-2">
      {/* QR card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative p-6 rounded-3xl flex flex-col items-center gap-4"
        style={{
          background: "oklch(0.11 0.02 260 / 0.9)",
          border: "1.5px solid oklch(0.82 0.15 195 / 0.5)",
          boxShadow:
            "0 0 40px oklch(0.82 0.15 195 / 0.2), 0 0 80px oklch(0.65 0.2 295 / 0.1), inset 0 0 30px oklch(0.82 0.15 195 / 0.03)",
        }}
      >
        {/* Pulsing border glow */}
        <motion.div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            border: "1px solid oklch(0.82 0.15 195 / 0.2)",
          }}
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
          My Device Code
        </p>

        {/* QR Code image */}
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
              alt={`QR code for ${deviceId}`}
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

        {/* Device ID */}
        <div className="text-center">
          <p
            className="font-mono font-bold text-lg tracking-wider"
            style={{ color: "oklch(0.82 0.15 195)" }}
          >
            {deviceId}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Ask nearby devices to scan this to send you files
          </p>
        </div>

        {/* Share button */}
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
          How to receive files
        </p>
        <ol className="flex flex-col gap-2">
          {[
            "Show this QR code to the sender",
            "They scan it from the Scanner tab",
            "Accept the incoming file transfer",
            "File saves to your device",
          ].map((step, i) => (
            <li key={step} className="flex items-start gap-2.5 text-xs">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{
                  background: "oklch(0.82 0.15 195 / 0.12)",
                  color: "oklch(0.82 0.15 195)",
                  border: "1px solid oklch(0.82 0.15 195 / 0.25)",
                }}
              >
                {i + 1}
              </span>
              <span className="text-muted-foreground pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ─── Main Scanner Tab ─────────────────────────────────────────────────────────
export function ScannerTab() {
  const [mode, setMode] = useState<Mode>("scan");

  return (
    <div className="pb-6">
      {/* Header */}
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
    </div>
  );
}
