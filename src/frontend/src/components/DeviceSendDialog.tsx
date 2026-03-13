import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bluetooth, CheckCircle, FileUp, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Variant_completed_failed } from "../backend";
import { useAddTransferRecord, useGetMyFiles } from "../hooks/useQueries";
import { FileIcon, formatFileSize } from "./FileIcon";

type Step = "pick" | "transferring" | "done";

interface Props {
  open: boolean;
  deviceName: string;
  onClose: () => void;
}

export function DeviceSendDialog({ open, deviceName, onClose }: Props) {
  const [step, setStep] = useState<Step>("pick");
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [pickedFile, setPickedFile] = useState<{
    name: string;
    size: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addRecord = useAddTransferRecord();
  const { data: myFiles = [] } = useGetMyFiles();

  function handleClose() {
    setStep("pick");
    setProgress(0);
    setSuccess(false);
    setPickedFile(null);
    onClose();
  }

  function startTransfer(fileName: string, fileSize: number) {
    setPickedFile({ name: fileName, size: fileSize });
    setStep("transferring");
    setProgress(0);
    let pct = 0;
    const interval = setInterval(() => {
      pct += Math.random() * 12 + 5;
      if (pct >= 100) {
        pct = 100;
        clearInterval(interval);
        setProgress(100);
        const ok = true;
        setSuccess(ok);
        setStep("done");
        addRecord.mutate({
          receiver: deviceName,
          fileName,
          fileSize: BigInt(fileSize),
          status: Variant_completed_failed.completed,
        });
        toast.success(`Sent to ${deviceName}!`);
      } else {
        setProgress(pct);
      }
    }, 180);
  }

  function handleLocalFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    startTransfer(file.name, file.size);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && step === "pick" && handleClose()}
    >
      <DialogContent
        className="glass border-border/50 max-w-sm mx-auto"
        data-ocid="device_send.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display gradient-text text-xl flex items-center gap-2">
            <Bluetooth size={18} className="text-blue-400" />
            Send to {deviceName}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "pick" && (
            <motion.div
              key="pick"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {/* Pick from uploaded files */}
              {myFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    My Files
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {myFiles.map((file, i) => (
                      <motion.button
                        key={file.blobId.getDirectURL()}
                        className="w-full glass rounded-xl p-3 flex items-center gap-3 hover:border-primary/40 transition-colors text-left"
                        style={{
                          border: "1px solid oklch(0.3 0.04 260 / 0.5)",
                        }}
                        whileHover={{ x: 2 }}
                        onClick={() =>
                          startTransfer(file.fileName, Number(file.fileSize))
                        }
                        data-ocid={`device_send.item.${i + 1}`}
                      >
                        <FileIcon fileType={file.fileType} size={16} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {file.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.fileSize)}
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Or pick from device */}
              <button
                type="button"
                className="glass rounded-xl p-4 flex flex-col items-center gap-3 border-dashed border-2 cursor-pointer hover:border-primary/50 transition-colors w-full"
                style={{ borderColor: "oklch(0.82 0.15 195 / 0.3)" }}
                onClick={() => fileInputRef.current?.click()}
                data-ocid="device_send.upload_button"
              >
                <FileUp size={24} className="text-primary" />
                <div className="text-center">
                  <p className="text-sm font-semibold">
                    Pick a file from device
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Or tap a file above
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleLocalFilePick}
                />
              </button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                data-ocid="device_send.cancel_button"
              >
                Cancel
              </Button>
            </motion.div>
          )}

          {step === "transferring" && (
            <motion.div
              key="transferring"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 py-2"
              data-ocid="device_send.loading_state"
            >
              <div className="text-center">
                <p className="text-sm font-semibold">
                  Sending{" "}
                  <span className="text-primary">{pickedFile?.name}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  to {deviceName} · {Math.round(progress)}%
                </p>
              </div>
              <div className="relative h-3 rounded-full overflow-hidden bg-muted">
                <div
                  className="h-full rounded-full shimmer-bar transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
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
              data-ocid={
                success
                  ? "device_send.success_state"
                  : "device_send.error_state"
              }
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
                  <p className="text-xs text-muted-foreground text-center">
                    {pickedFile?.name} was sent to {deviceName}
                  </p>
                </>
              ) : (
                <>
                  <XCircle size={48} className="text-destructive" />
                  <p className="font-semibold text-destructive">
                    Transfer Failed
                  </p>
                </>
              )}
              <Button
                className="mt-2"
                variant="outline"
                onClick={handleClose}
                data-ocid="device_send.close_button"
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
