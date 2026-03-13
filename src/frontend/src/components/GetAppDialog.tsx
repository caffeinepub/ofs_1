import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Github, Link2, Smartphone, X } from "lucide-react";
import { motion } from "motion/react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

interface GetAppDialogProps {
  open: boolean;
  onClose: () => void;
}

const OPTIONS = [
  {
    icon: Link2,
    title: "Share Live Link",
    desc: "Share the web app link with anyone. Opens in any browser, no install needed.",
    action: "Copy Link",
    color: "oklch(0.82 0.15 195)",
    glow: "oklch(0.82 0.15 195 / 0.2)",
    showQR: true,
    onClick: () => {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      return "Copied!";
    },
  },
  {
    icon: Download,
    title: "Download Source Code",
    desc: "Download the full source code as a ZIP from your project settings.",
    action: "How to Download",
    color: "oklch(0.88 0.2 95)",
    glow: "oklch(0.88 0.2 95 / 0.2)",
    showQR: false,
    info: "Go to Project Settings → More → Download ZIP",
  },
  {
    icon: Github,
    title: "Export to GitHub",
    desc: "Push the code to your GitHub repo and build a native Android/iOS app from it.",
    action: "How to Export",
    color: "oklch(0.65 0.2 295)",
    glow: "oklch(0.65 0.2 295 / 0.2)",
    showQR: false,
    info: "Go to Project Settings → GitHub Export",
  },
];

export function GetAppDialog({ open, onClose }: GetAppDialogProps) {
  const [feedback, setFeedback] = useState<Record<number, string>>({});
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      QRCode.toDataURL(window.location.href, {
        width: 128,
        margin: 1,
        color: { dark: "#0a0f1e", light: "#d4f1f9" },
      })
        .then(setQrDataUrl)
        .catch(() => {});
    }
  }, [open]);

  const handleAction = (index: number, option: (typeof OPTIONS)[0]) => {
    if (option.onClick) {
      const msg = option.onClick();
      setFeedback((f) => ({ ...f, [index]: msg }));
      setTimeout(
        () =>
          setFeedback((f) => {
            const n = { ...f };
            delete n[index];
            return n;
          }),
        2000,
      );
    } else if (option.info) {
      setFeedback((f) => ({ ...f, [index]: option.info! }));
      setTimeout(
        () =>
          setFeedback((f) => {
            const n = { ...f };
            delete n[index];
            return n;
          }),
        3000,
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-sm mx-auto rounded-3xl border-0 p-0 overflow-hidden"
        style={{
          background: "oklch(0.11 0.025 260)",
          border: "1px solid oklch(0.25 0.04 260)",
        }}
        data-ocid="get_app.dialog"
      >
        <div className="p-5">
          <DialogHeader className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{
                    background: "oklch(0.82 0.15 195 / 0.15)",
                    color: "oklch(0.82 0.15 195)",
                  }}
                >
                  <Smartphone size={16} />
                </div>
                <DialogTitle className="text-base font-bold">
                  Get the App
                </DialogTitle>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                data-ocid="get_app.close_button"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              OFS is a web app. Choose how you want to access or distribute it.
            </p>
          </DialogHeader>

          <div className="space-y-3">
            {OPTIONS.map((opt, i) => (
              <motion.div
                key={opt.title}
                className="rounded-2xl p-4 relative overflow-hidden"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                style={{
                  background: "oklch(0.14 0.03 260)",
                  border: `1px solid ${opt.color}33`,
                }}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 0% 50%, ${opt.glow}, transparent 70%)`,
                  }}
                />
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${opt.color}18`, color: opt.color }}
                  >
                    <opt.icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {opt.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {opt.desc}
                    </p>
                    {opt.showQR && qrDataUrl && (
                      <motion.div
                        className="mt-3 flex flex-col items-center gap-1.5"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div
                          className="rounded-xl p-1.5"
                          style={{
                            background: "oklch(0.82 0.15 195 / 0.1)",
                            border: "1px solid oklch(0.82 0.15 195 / 0.25)",
                          }}
                        >
                          <img
                            src={qrDataUrl}
                            alt="QR code for app link"
                            width={112}
                            height={112}
                            className="rounded-lg"
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Scan to open on another device
                        </p>
                      </motion.div>
                    )}
                    {feedback[i] && (
                      <motion.p
                        className="text-xs font-medium mt-1"
                        style={{ color: opt.color }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {feedback[i]}
                      </motion.p>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2 h-7 text-xs px-3 rounded-lg"
                      style={{
                        background: `${opt.color}18`,
                        color: opt.color,
                        border: `1px solid ${opt.color}33`,
                      }}
                      onClick={() => handleAction(i, opt)}
                      data-ocid={`get_app.button.${i + 1}`}
                    >
                      {opt.action}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground text-center mt-4 leading-relaxed">
            For real Bluetooth device discovery, export the source code and
            build a native app using React Native or Capacitor.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
