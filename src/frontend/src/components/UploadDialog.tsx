import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Brain,
  FileCheck,
  FileText,
  Image as ImageIcon,
  Music,
  ScanLine,
  Upload,
  Video,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useUploadFile } from "../hooks/useLocalFiles";
import type { FileRecognition, ImageAnalysis } from "../utils/aiAnalysis";
import { analyzeImage, recognizeFile } from "../utils/aiAnalysis";
import { FileIcon, formatFileSize } from "./FileIcon";

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
}

function categoryIcon(category: string) {
  switch (category) {
    case "Image":
      return <ImageIcon size={13} />;
    case "Video":
      return <Video size={13} />;
    case "Audio":
      return <Music size={13} />;
    case "Document":
      return <FileText size={13} />;
    case "Code":
      return <Brain size={13} />;
    default:
      return <ScanLine size={13} />;
  }
}

function categoryColor(category: string): string {
  switch (category) {
    case "Image":
      return "oklch(0.82 0.15 195)";
    case "Video":
      return "oklch(0.65 0.2 295)";
    case "Audio":
      return "oklch(0.75 0.18 145)";
    case "Document":
      return "oklch(0.78 0.16 60)";
    case "Spreadsheet":
      return "oklch(0.72 0.17 150)";
    case "Presentation":
      return "oklch(0.76 0.18 30)";
    case "Archive":
      return "oklch(0.72 0.14 50)";
    case "Code":
      return "oklch(0.78 0.18 270)";
    default:
      return "oklch(0.65 0.08 250)";
  }
}

export function UploadDialog({ open, onClose }: UploadDialogProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compress, setCompress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [recognition, setRecognition] = useState<FileRecognition | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysis | null>(
    null,
  );
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFile = useUploadFile();

  const estimatedSize = selectedFile
    ? compress && selectedFile.type.startsWith("image/")
      ? selectedFile.size * (1 - (imageAnalysis?.estimatedSavings ?? 0.35))
      : selectedFile.size
    : 0;

  useEffect(() => {
    if (!selectedFile) {
      setRecognition(null);
      setImageAnalysis(null);
      setAnalyzing(false);
      return;
    }
    setAnalyzing(true);
    setRecognition(null);
    setImageAnalysis(null);
    const rec = recognizeFile(selectedFile);
    const timer = setTimeout(async () => {
      setRecognition(rec);
      if (selectedFile.type.startsWith("image/")) {
        try {
          const analysis = await analyzeImage(selectedFile);
          setImageAnalysis(analysis);
        } catch {
          // ignore
        }
      }
      setAnalyzing(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [selectedFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  async function compressImage(file: File): Promise<Uint8Array> {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const maxDim = 1920;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            blob!.arrayBuffer().then((ab) => resolve(new Uint8Array(ab)));
          },
          "image/jpeg",
          0.75,
        );
      };
      img.src = url;
    });
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setProgress(0);
    try {
      let data: Uint8Array;
      if (compress && selectedFile.type.startsWith("image/")) {
        data = await compressImage(selectedFile);
      } else {
        const ab = await selectedFile.arrayBuffer();
        data = new Uint8Array(ab);
      }
      await uploadFile.mutateAsync({
        fileName: selectedFile.name,
        fileSize: BigInt(data.byteLength),
        fileType: selectedFile.type || "application/octet-stream",
        data,
        onProgress: (pct) => setProgress(pct),
      });
      setDone(true);
      toast.success("File uploaded successfully!");
      setTimeout(() => {
        setDone(false);
        setSelectedFile(null);
        setProgress(0);
        setUploading(false);
        onClose();
      }, 1200);
    } catch {
      toast.error("Upload failed. Please try again.");
      setUploading(false);
      setProgress(0);
    }
  }

  function handleClose() {
    if (uploading) return;
    setSelectedFile(null);
    setProgress(0);
    setDone(false);
    onClose();
  }

  const catColor = recognition
    ? categoryColor(recognition.category)
    : "oklch(0.82 0.15 195)";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="glass border-border/50 max-w-sm mx-auto"
        data-ocid="upload.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display gradient-text text-xl">
            Upload File
          </DialogTitle>
        </DialogHeader>

        {!selectedFile ? (
          <button
            type="button"
            className={`relative rounded-2xl border-2 border-dashed p-8 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200 ${
              dragOver
                ? "dropzone-active border-primary/70"
                : "border-border/50 hover:border-primary/40"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              fileInputRef.current?.click()
            }
            data-ocid="upload.dropzone"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "oklch(0.82 0.15 195 / 0.15)" }}
            >
              <Upload size={26} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                Drop file here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
            />
          </button>
        ) : (
          <div className="space-y-3">
            <div className="glass rounded-xl p-4 flex items-center gap-3">
              <FileIcon fileType={selectedFile.type} size={20} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                  {compress && selectedFile.type.startsWith("image/") && (
                    <span className="ml-1" style={{ color: catColor }}>
                      → {formatFileSize(estimatedSize)} compressed
                    </span>
                  )}
                </p>
              </div>
              {!uploading && (
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {analyzing ? (
                <motion.div
                  key="analyzing"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: "oklch(0.11 0.02 260 / 0.8)",
                    border: "1px solid oklch(0.82 0.15 195 / 0.2)",
                  }}
                  data-ocid="upload.ai_panel"
                >
                  <div className="flex items-center gap-2 px-4 py-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1.2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      }}
                    >
                      <ScanLine
                        size={14}
                        style={{ color: "oklch(0.82 0.15 195)" }}
                      />
                    </motion.div>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "oklch(0.82 0.15 195)" }}
                    >
                      AI Analyzing...
                    </span>
                    <motion.div
                      className="ml-auto flex gap-0.5"
                      initial="hidden"
                      animate="visible"
                      variants={{
                        visible: { transition: { staggerChildren: 0.15 } },
                      }}
                    >
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1 h-1 rounded-full"
                          style={{ background: "oklch(0.82 0.15 195)" }}
                          variants={{
                            hidden: { opacity: 0.2 },
                            visible: {
                              opacity: [0.2, 1, 0.2],
                              transition: {
                                duration: 1,
                                repeat: Number.POSITIVE_INFINITY,
                                delay: i * 0.2,
                              },
                            },
                          }}
                        />
                      ))}
                    </motion.div>
                  </div>
                  <div
                    className="relative h-1 overflow-hidden"
                    style={{ background: "oklch(0.15 0.02 260)" }}
                  >
                    <motion.div
                      className="absolute inset-y-0 w-1/3"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent, oklch(0.82 0.15 195 / 0.8), transparent)",
                      }}
                      animate={{ x: ["-100%", "400%"] }}
                      transition={{
                        duration: 1.2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      }}
                    />
                  </div>
                </motion.div>
              ) : recognition ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-xl overflow-hidden space-y-0"
                  style={{
                    background: "oklch(0.11 0.02 260 / 0.8)",
                    border: `1px solid ${catColor}33`,
                  }}
                  data-ocid="upload.ai_panel"
                >
                  <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${catColor}22`, color: catColor }}
                    >
                      {categoryIcon(recognition.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground leading-tight">
                        {recognition.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {Math.round(recognition.confidence * 100)}% confidence
                      </p>
                    </div>
                    <Badge
                      className="text-[10px] px-2 py-0 h-5 font-semibold border-0"
                      style={{ background: `${catColor}22`, color: catColor }}
                    >
                      {recognition.category}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 px-4 pb-2">
                    {recognition.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: "oklch(0.18 0.02 260)",
                          color: "oklch(0.65 0.08 260)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  {imageAnalysis && (
                    <>
                      <div
                        className="h-px mx-4"
                        style={{ background: `${catColor}22` }}
                      />
                      <div className="px-4 py-2 flex items-center justify-between">
                        <div className="text-[10px] text-muted-foreground space-y-0.5">
                          <p>
                            <span className="text-foreground font-medium">
                              {imageAnalysis.width} × {imageAnalysis.height}
                            </span>{" "}
                            px · {imageAnalysis.megapixels}MP ·{" "}
                            {imageAnalysis.aspectRatio}
                          </p>
                          <p style={{ color: catColor }}>
                            ~{Math.round(imageAnalysis.estimatedSavings * 100)}%
                            compression possible
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {imageAnalysis.dominantColors
                            .slice(0, 4)
                            .map((color) => (
                              <div
                                key={color}
                                title={color}
                                className="w-4 h-4 rounded-full border border-white/10 flex-shrink-0"
                                style={{ background: color }}
                              />
                            ))}
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>

            {selectedFile.type.startsWith("image/") && (
              <div className="flex items-center justify-between glass rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-yellow-400" />
                  <Label
                    htmlFor="compress-toggle"
                    className="text-sm cursor-pointer"
                  >
                    AI Image Compression
                  </Label>
                </div>
                <Switch
                  id="compress-toggle"
                  checked={compress}
                  onCheckedChange={setCompress}
                  disabled={uploading}
                  data-ocid="upload.switch"
                />
              </div>
            )}

            {uploading && (
              <div className="space-y-2" data-ocid="upload.loading_state">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{done ? "Complete!" : "Uploading..."}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="relative h-2 rounded-full overflow-hidden bg-muted">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      done ? "bg-emerald-400" : "shimmer-bar"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {!uploading && (
              <Button
                className="w-full font-semibold"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.82 0.15 195), oklch(0.65 0.2 295))",
                  color: "oklch(0.08 0.015 260)",
                }}
                onClick={handleUpload}
                data-ocid="upload.submit_button"
              >
                <Upload size={16} className="mr-2" />
                Upload File
              </Button>
            )}

            {done && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center justify-center gap-2 text-emerald-400 font-semibold"
                data-ocid="upload.success_state"
              >
                <FileCheck size={18} />
                <span>Upload Complete!</span>
              </motion.div>
            )}
          </div>
        )}

        {!uploading && selectedFile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            data-ocid="upload.cancel_button"
          >
            Cancel
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
