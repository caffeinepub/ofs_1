import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, ChevronRight, Send, Wifi, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useAddTransferRecord,
  useGetNearbyDevices,
} from "../hooks/useLocalFiles";
import type { LocalFileMetadata } from "../utils/localFileStore";
import { FileIcon, formatFileSize } from "./FileIcon";

type Step = "select-device" | "transferring" | "done";

interface SendDialogProps {
  open: boolean;
  file: LocalFileMetadata | null;
  onClose: () => void;
}

export function SendDialog({ open, file, onClose }: SendDialogProps) {
  const [step, setStep] = useState<Step>("select-device");
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [success, setSuccess] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState("");

  const { data: devices = [] } = useGetNearbyDevices();
  const addRecord = useAddTransferRecord();

  function handleClose() {
    setStep("select-device");
    setProgress(0);
    setSpeed(0);
    setSuccess(false);
    setSelectedDevice("");
    onClose();
  }

  function simulateTransfer(device: string) {
    setSelectedDevice(device);
    setStep("transferring");
    setProgress(0);

    let pct = 0;
    const interval = setInterval(() => {
      pct += Math.random() * 12 + 5;
      setSpeed(Math.random() * 4 + 1);
      if (pct >= 100) {
        pct = 100;
        clearInterval(interval);
        setProgress(100);
        const ok = Math.random() > 0.15;
        setSuccess(ok);
        setStep("done");
        if (file) {
          addRecord.mutate({
            receiver: device,
            fileName: file.fileName,
            fileSize: file.fileSize,
            status: ok ? "completed" : "failed",
          });
        }
        if (ok) toast.success(`Sent to ${device} successfully!`);
        else toast.error(`Transfer to ${device} failed.`);
      } else {
        setProgress(pct);
      }
    }, 180);
  }

  if (!file) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && step === "select-device" && handleClose()}
    >
      <DialogContent
        className="glass border-border/50 max-w-sm mx-auto overflow-hidden"
        data-ocid="send.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display gradient-text text-xl">
            Send File
          </DialogTitle>
        </DialogHeader>

        <div className="glass rounded-xl p-3 flex items-center gap-3 overflow-hidden">
          <FileIcon fileType={file.fileType} size={18} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.fileSize)}
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === "select-device" && (
            <motion.div
              key="devices"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-2"
            >
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Nearby Devices
              </p>
              {devices.length === 0 ? (
                <div
                  className="text-center py-6 text-muted-foreground text-sm"
                  data-ocid="send.empty_state"
                >
                  No nearby devices found
                </div>
              ) : (
                devices.map((d, i) => (
                  <motion.button
                    key={d.name}
                    className="w-full glass rounded-xl p-3 flex items-center gap-3 hover:border-primary/40 transition-colors text-left"
                    style={{ border: "1px solid oklch(0.3 0.04 260 / 0.5)" }}
                    whileHover={{ x: 2 }}
                    onClick={() => simulateTransfer(d.name)}
                    data-ocid={`send.item.${i + 1}`}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: d.isConnected
                          ? "oklch(0.78 0.18 145 / 0.2)"
                          : "oklch(0.82 0.15 195 / 0.15)",
                      }}
                    >
                      <Wifi
                        size={16}
                        className={
                          d.isConnected ? "text-emerald-400" : "text-primary"
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.isConnected ? "Connected" : "Available"}
                      </p>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-muted-foreground flex-shrink-0"
                    />
                  </motion.button>
                ))
              )}
            </motion.div>
          )}

          {step === "transferring" && (
            <motion.div
              key="transferring"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 py-2"
              data-ocid="send.loading_state"
            >
              <div className="text-center">
                <p className="text-sm font-semibold">
                  Sending to{" "}
                  <span className="text-primary">{selectedDevice}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(progress)}%
                </p>
              </div>
              <div className="relative h-3 rounded-full overflow-hidden bg-muted">
                <div
                  className="h-full rounded-full shimmer-bar transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {speed.toFixed(1)} MB/s
              </p>
              <div className="flex justify-center">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-primary"
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
              data-ocid={success ? "send.success_state" : "send.error_state"}
            >
              {success ? (
                <>
                  <CheckCircle
                    size={48}
                    className="text-emerald-400"
                    style={{
                      filter:
                        "drop-shadow(0 0 12px oklch(0.78 0.18 145 / 0.8))",
                    }}
                  />
                  <p className="font-semibold text-emerald-400">
                    Transfer Complete!
                  </p>
                  <p className="text-xs text-muted-foreground text-center break-all px-2">
                    {file.fileName} was sent to {selectedDevice}
                  </p>
                </>
              ) : (
                <>
                  <XCircle
                    size={48}
                    className="text-destructive"
                    style={{
                      filter: "drop-shadow(0 0 12px oklch(0.65 0.22 25 / 0.6))",
                    }}
                  />
                  <p className="font-semibold text-destructive">
                    Transfer Failed
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    Something went wrong. Please try again.
                  </p>
                </>
              )}
              <Button
                className="mt-2"
                variant="outline"
                onClick={handleClose}
                data-ocid="send.close_button"
              >
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {step === "select-device" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            data-ocid="send.cancel_button"
          >
            Cancel
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
