import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  Github,
  Link2,
  MonitorDown,
  Smartphone,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface GetAppDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Minimal QR code data URL generator using Google Charts API (client-side URL only) */
function getQrUrl(text: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(text)}&bgcolor=0a1628&color=7adff0&format=png&margin=4`;
}

export function GetAppDialog({ open, onClose }: GetAppDialogProps) {
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  // biome-ignore lint/suspicious/noExplicitAny: BeforeInstallPromptEvent is not typed
  const deferredPrompt = useRef<any>(null);
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // biome-ignore lint/suspicious/noExplicitAny: BeforeInstallPromptEvent is not typed
    const handler = (e: any) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQrUrl(getQrUrl(window.location.href));
    }
  }, [open]);

  const showFeedback = (key: string, msg: string, duration = 2500) => {
    setFeedback((f) => ({ ...f, [key]: msg }));
    setTimeout(
      () =>
        setFeedback((f) => {
          const n = { ...f };
          delete n[key];
          return n;
        }),
      duration,
    );
  };

  const handleInstall = async () => {
    if (deferredPrompt.current) {
      deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === "accepted") {
        setInstallable(false);
        setInstalled(true);
        showFeedback("install", "Installing...", 3000);
      }
      deferredPrompt.current = null;
    } else {
      showFeedback("install", "Use browser menu → Add to Home Screen", 4000);
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
              Install OFS on your device for the best experience.
            </p>
          </DialogHeader>

          <div className="space-y-3">
            {/* Install App card */}
            <motion.div
              className="rounded-2xl p-4 relative overflow-hidden"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              style={{
                background: installed
                  ? "oklch(0.14 0.03 145)"
                  : "oklch(0.14 0.03 195)",
                border: installed
                  ? "1px solid oklch(0.78 0.18 145 / 0.4)"
                  : "1px solid oklch(0.82 0.15 195 / 0.4)",
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: installed
                    ? "radial-gradient(circle at 0% 50%, oklch(0.78 0.18 145 / 0.15), transparent 70%)"
                    : "radial-gradient(circle at 0% 50%, oklch(0.82 0.15 195 / 0.15), transparent 70%)",
                }}
              />
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: installed
                      ? "oklch(0.78 0.18 145 / 0.18)"
                      : "oklch(0.82 0.15 195 / 0.18)",
                    color: installed
                      ? "oklch(0.78 0.18 145)"
                      : "oklch(0.82 0.15 195)",
                  }}
                >
                  <MonitorDown size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {installed ? "App Installed!" : "Install on This Device"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {installed
                      ? "OFS is installed. Launch it from your home screen."
                      : installable
                        ? "Add OFS to your home screen for instant access, just like a native app."
                        : 'Tap below, or use your browser menu and select "Add to Home Screen".'}
                  </p>
                  {feedback.install && (
                    <motion.p
                      className="text-xs font-medium mt-1"
                      style={{ color: "oklch(0.82 0.15 195)" }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {feedback.install}
                    </motion.p>
                  )}
                  {!installed && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2 h-7 text-xs px-3 rounded-lg"
                      style={{
                        background: "oklch(0.82 0.15 195 / 0.18)",
                        color: "oklch(0.82 0.15 195)",
                        border: "1px solid oklch(0.82 0.15 195 / 0.33)",
                      }}
                      onClick={handleInstall}
                      data-ocid="get_app.install.button"
                    >
                      {installable ? "Install App" : "How to Install"}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Share link card */}
            <motion.div
              className="rounded-2xl p-4 relative overflow-hidden"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.07 }}
              style={{
                background: "oklch(0.14 0.03 260)",
                border: "1px solid oklch(0.82 0.15 195 / 0.2)",
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle at 0% 50%, oklch(0.82 0.15 195 / 0.08), transparent 70%)",
                }}
              />
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: "oklch(0.82 0.15 195 / 0.12)",
                    color: "oklch(0.82 0.15 195)",
                  }}
                >
                  <Link2 size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Share Link
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Share with anyone. They can open it in a browser or scan the
                    QR code.
                  </p>
                  {qrUrl && (
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
                          src={qrUrl}
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
                  {feedback.link && (
                    <motion.p
                      className="text-xs font-medium mt-1"
                      style={{ color: "oklch(0.82 0.15 195)" }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {feedback.link}
                    </motion.p>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 h-7 text-xs px-3 rounded-lg"
                    style={{
                      background: "oklch(0.82 0.15 195 / 0.12)",
                      color: "oklch(0.82 0.15 195)",
                      border: "1px solid oklch(0.82 0.15 195 / 0.25)",
                    }}
                    onClick={() => {
                      navigator.clipboard
                        .writeText(window.location.href)
                        .catch(() => {});
                      showFeedback("link", "Link copied!");
                    }}
                    data-ocid="get_app.copy_link.button"
                  >
                    Copy Link
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Source code card */}
            <motion.div
              className="rounded-2xl p-4 relative overflow-hidden"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              style={{
                background: "oklch(0.14 0.03 260)",
                border: "1px solid oklch(0.88 0.2 95 / 0.2)",
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle at 0% 50%, oklch(0.88 0.2 95 / 0.08), transparent 70%)",
                }}
              />
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: "oklch(0.88 0.2 95 / 0.12)",
                    color: "oklch(0.88 0.2 95)",
                  }}
                >
                  <Download size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Source Code
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Download source and build a native Android/iOS app with real
                    Bluetooth.
                  </p>
                  {feedback.src && (
                    <motion.p
                      className="text-xs font-medium mt-1"
                      style={{ color: "oklch(0.88 0.2 95)" }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {feedback.src}
                    </motion.p>
                  )}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-3 rounded-lg"
                      style={{
                        background: "oklch(0.88 0.2 95 / 0.12)",
                        color: "oklch(0.88 0.2 95)",
                        border: "1px solid oklch(0.88 0.2 95 / 0.25)",
                      }}
                      onClick={() =>
                        showFeedback(
                          "src",
                          "Settings → More → Download ZIP",
                          4000,
                        )
                      }
                      data-ocid="get_app.download_src.button"
                    >
                      <Download size={11} className="mr-1" />
                      Download ZIP
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-3 rounded-lg"
                      style={{
                        background: "oklch(0.65 0.2 295 / 0.12)",
                        color: "oklch(0.65 0.2 295)",
                        border: "1px solid oklch(0.65 0.2 295 / 0.25)",
                      }}
                      onClick={() =>
                        showFeedback("src", "Settings → GitHub Export", 4000)
                      }
                      data-ocid="get_app.github.button"
                    >
                      <Github size={11} className="mr-1" />
                      GitHub
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
