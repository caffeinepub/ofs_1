import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, QrCode, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LocalFileMetadata } from "../utils/localFileStore";
import { FileIcon, formatFileSize } from "./FileIcon";

// ─── QR helpers ──────────────────────────────────────────────────────────────
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

// ─── Component ───────────────────────────────────────────────────────────────
interface SendDialogProps {
  open: boolean;
  file: LocalFileMetadata | null;
  onClose: () => void;
}

export function SendDialog({ open, file, onClose }: SendDialogProps) {
  const senderName = useMemo(() => {
    return localStorage.getItem("ofs_display_name") || "OFS User";
  }, []);

  const ofsCode = file
    ? `ofs:file:${file.fileName}:${formatFileSize(Number(file.fileSize))}:${senderName}`
    : "";

  const qrDataUrl = useQRCodeDataUrl(ofsCode);

  function handleClose() {
    onClose();
  }

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="glass border-border/50 max-w-sm mx-auto overflow-y-auto max-h-[90vh]"
        data-ocid="send.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display gradient-text text-xl">
            Send File
          </DialogTitle>
        </DialogHeader>

        {/* File info */}
        <div className="glass rounded-xl p-3 flex items-center gap-3 overflow-hidden">
          <FileIcon fileType={file.fileType} size={18} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(Number(file.fileSize))}
            </p>
          </div>
        </div>

        {/* Sender name badge */}
        <div
          className="rounded-xl px-3 py-2 flex items-center gap-2"
          style={{
            background: "oklch(0.82 0.15 195 / 0.08)",
            border: "1px solid oklch(0.82 0.15 195 / 0.25)",
          }}
        >
          <span
            className="text-xs font-semibold"
            style={{ color: "oklch(0.65 0.08 195)" }}
          >
            Sending as:
          </span>
          <span
            className="text-sm font-bold truncate"
            style={{ color: "oklch(0.88 0.18 195)" }}
          >
            {senderName}
          </span>
        </div>

        {/* QR Code */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative p-5 rounded-3xl flex flex-col items-center gap-4"
          style={{
            background: "oklch(0.11 0.02 260 / 0.9)",
            border: "1.5px solid oklch(0.82 0.15 195 / 0.5)",
            boxShadow:
              "0 0 40px oklch(0.82 0.15 195 / 0.2), inset 0 0 30px oklch(0.82 0.15 195 / 0.03)",
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
                alt={`QR code for ${file.fileName}`}
                width={200}
                height={200}
                className="block"
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <div
                className="w-[200px] h-[200px] flex items-center justify-center"
                data-ocid="send.loading_state"
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

          <p className="text-xs text-muted-foreground text-center">
            Show this QR to the receiver — they tap{" "}
            <span style={{ color: "oklch(0.82 0.15 195)" }}>Receive</span> on
            Home and scan it
          </p>
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
            How it works
          </p>
          <ol className="flex flex-col gap-2">
            {[
              { text: "QR code generated (done ✓)", done: true },
              { text: "Show this screen to the receiver", done: false },
              { text: "Receiver taps Receive on Home & scans", done: false },
              { text: "File is saved to their History tab", done: false },
            ].map((step, i) => (
              <li key={step.text} className="flex items-start gap-2.5 text-xs">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{
                    background: step.done
                      ? "oklch(0.78 0.18 145 / 0.15)"
                      : "oklch(0.82 0.15 195 / 0.12)",
                    color: step.done
                      ? "oklch(0.78 0.18 145)"
                      : "oklch(0.82 0.15 195)",
                    border: step.done
                      ? "1px solid oklch(0.78 0.18 145 / 0.35)"
                      : "1px solid oklch(0.82 0.15 195 / 0.25)",
                  }}
                >
                  {step.done ? <Check size={10} /> : i + 1}
                </span>
                <span
                  className="pt-0.5"
                  style={{
                    color: step.done ? "oklch(0.78 0.18 145 / 0.8)" : undefined,
                  }}
                >
                  {step.done ? (
                    <span className="text-muted-foreground line-through">
                      {step.text}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{step.text}</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleClose}
          data-ocid="send.close_button"
        >
          <X size={15} className="mr-2" />
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
}
