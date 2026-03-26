import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  QrCode,
  RefreshCw,
  Wifi,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAddReceivedRecord } from "../hooks/useLocalFiles";
import { useQRScanner } from "../qr-code/useQRScanner";

// ── QR code generation (reuse same approach as SendDialog) ─────────────────
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
        colorDark: "#f59e0b",
        colorLight: "#0a0f1e",
        correctLevel: QRLib.CorrectLevel?.L ?? 1,
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
      }, 150);
    } catch (e) {
      document.body.removeChild(div);
      reject(e);
    }
  });
}

function useQRDataUrl(text: string) {
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

// ── WebRTC helpers ─────────────────────────────────────────────────────────
const STUN = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
const CHUNK_SIZE = 64 * 1024; // 64 KB

async function waitForICE(pc: RTCPeerConnection): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("ICE gathering timeout")),
      15000,
    );
    if (pc.iceGatheringState === "complete") {
      clearTimeout(timeout);
      resolve();
      return;
    }
    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
}

// ── Types ──────────────────────────────────────────────────────────────────
type Mode = "send" | "receive";
type SendPhase =
  | "pick"
  | "creating"
  | "show-offer"
  | "scan-answer"
  | "connecting"
  | "transferring"
  | "done"
  | "error";
type ReceivePhase =
  | "scan-offer"
  | "show-answer"
  | "connecting"
  | "receiving"
  | "done"
  | "error";

interface WifiDirectDialogProps {
  open: boolean;
  onClose: () => void;
}

// ── Camera Scan View ───────────────────────────────────────────────────────
interface ScanViewProps {
  onScanned: (data: string) => void;
  label: string;
}

function ScanView({ onScanned, label }: ScanViewProps) {
  const scanner = useQRScanner({ facingMode: "environment" });
  const scannedRef = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional one-time effect
  useEffect(() => {
    scanner.startScanning();
    return () => {
      scanner.stopScanning();
    };
  }, []);

  useEffect(() => {
    if (scanner.qrResults.length === 0 || scannedRef.current) return;
    scannedRef.current = true;
    onScanned(scanner.qrResults[0].data);
  }, [scanner.qrResults, onScanned]);

  return (
    <div className="relative flex flex-col items-center justify-center flex-1">
      <div className="relative w-72 h-72 rounded-2xl overflow-hidden">
        <video
          ref={scanner.videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
        <canvas ref={scanner.canvasRef} className="hidden" />
        {/* Corner brackets */}
        <div
          className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2"
          style={{ borderColor: "oklch(0.88 0.2 55)" }}
        />
        <div
          className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2"
          style={{ borderColor: "oklch(0.88 0.2 55)" }}
        />
        <div
          className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2"
          style={{ borderColor: "oklch(0.88 0.2 55)" }}
        />
        <div
          className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2"
          style={{ borderColor: "oklch(0.88 0.2 55)" }}
        />
        {/* Scan line */}
        <motion.div
          className="absolute left-0 right-0 h-0.5"
          style={{
            background: "oklch(0.88 0.2 55 / 0.8)",
            boxShadow: "0 0 8px oklch(0.88 0.2 55)",
          }}
          animate={{ y: [0, 272, 0] }}
          transition={{
            duration: 2.5,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />
      </div>
      <p
        className="text-sm text-center mt-4"
        style={{ color: "oklch(0.88 0.2 55)" }}
      >
        {label}
      </p>
      {scanner.error && (
        <p className="text-xs text-destructive mt-2 text-center">
          {scanner.error?.message}
        </p>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function WifiDirectDialog({ open, onClose }: WifiDirectDialogProps) {
  const [mode, setMode] = useState<Mode>("send");

  // Send state
  const [sendPhase, setSendPhase] = useState<SendPhase>("pick");
  const [sendFile, setSendFile] = useState<File | null>(null);
  const [offerSdp, setOfferSdp] = useState("");
  const [sendProgress, setSendProgress] = useState(0);
  const [sendError, setSendError] = useState("");
  const pcSendRef = useRef<RTCPeerConnection | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Receive state
  const [receivePhase, setReceivePhase] = useState<ReceivePhase>("scan-offer");
  const [answerSdp, setAnswerSdp] = useState("");
  const [receiveProgress, setReceiveProgress] = useState(0);
  const [receiveError, setReceiveError] = useState("");
  const [receivedFile, setReceivedFile] = useState<{
    name: string;
    url: string;
  } | null>(null);
  const [manualOffer, setManualOffer] = useState("");
  const pcReceiveRef = useRef<RTCPeerConnection | null>(null);

  const addReceived = useAddReceivedRecord();

  const offerQr = useQRDataUrl(offerSdp);
  const answerQr = useQRDataUrl(answerSdp);

  // Reset on close
  useEffect(() => {
    if (!open) {
      pcSendRef.current?.close();
      pcReceiveRef.current?.close();
      pcSendRef.current = null;
      pcReceiveRef.current = null;
      setSendPhase("pick");
      setSendFile(null);
      setOfferSdp("");
      setSendProgress(0);
      setSendError("");
      setReceivePhase("scan-offer");
      setAnswerSdp("");
      setReceiveProgress(0);
      setReceiveError("");
      setReceivedFile(null);
      setManualOffer("");
    }
  }, [open]);

  // ── SEND FLOW ────────────────────────────────────────────────────────────
  const handleFilePick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) setSendFile(f);
    },
    [],
  );

  const createConnection = useCallback(async () => {
    if (!sendFile) return;
    setSendPhase("creating");
    setSendError("");
    try {
      pcSendRef.current?.close();
      const pc = new RTCPeerConnection(STUN);
      pcSendRef.current = pc;

      const dc = pc.createDataChannel("file-transfer");
      dc.binaryType = "arraybuffer";

      dc.onopen = async () => {
        setSendPhase("transferring");
        const file = sendFile;
        // Send metadata
        dc.send(
          JSON.stringify({ name: file.name, size: file.size, type: file.type }),
        );
        // Send chunks
        const buffer = await file.arrayBuffer();
        let offset = 0;
        const total = buffer.byteLength;
        while (offset < total) {
          const end = Math.min(offset + CHUNK_SIZE, total);
          dc.send(buffer.slice(offset, end));
          offset = end;
          setSendProgress(Math.round((offset / total) * 100));
          // Small yield to avoid blocking
          await new Promise((r) => setTimeout(r, 0));
        }
        dc.send(JSON.stringify({ done: true }));
        setSendPhase("done");
        toast.success("File sent via Wi-Fi Direct!");
      };

      dc.onerror = () => {
        setSendError("Data channel error");
        setSendPhase("error");
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForICE(pc);

      const sdp = JSON.stringify(pc.localDescription);
      setOfferSdp(sdp);
      setSendPhase("show-offer");
    } catch (e) {
      setSendError(String(e));
      setSendPhase("error");
    }
  }, [sendFile]);

  const handleAnswerScanned = useCallback(async (data: string) => {
    const pc = pcSendRef.current;
    if (!pc) return;
    setSendPhase("connecting");
    try {
      const answer = JSON.parse(data) as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(answer);
    } catch (e) {
      setSendError(String(e));
      setSendPhase("error");
    }
  }, []);

  // ── RECEIVE FLOW ─────────────────────────────────────────────────────────
  const processOffer = useCallback(
    async (data: string) => {
      setReceivePhase("show-answer");
      setReceiveError("");
      try {
        const offer = JSON.parse(data) as RTCSessionDescriptionInit;
        pcReceiveRef.current?.close();
        const pc = new RTCPeerConnection(STUN);
        pcReceiveRef.current = pc;

        const chunks: ArrayBuffer[] = [];
        let meta: { name: string; size: number; type: string } | null = null;

        pc.ondatachannel = (ev) => {
          const dc = ev.channel;
          dc.binaryType = "arraybuffer";
          setReceivePhase("receiving");

          dc.onmessage = (msgEv) => {
            if (typeof msgEv.data === "string") {
              const parsed = JSON.parse(msgEv.data);
              if (parsed.done) {
                // Reassemble
                const blob = new Blob(chunks, {
                  type: meta?.type || "application/octet-stream",
                });
                const url = URL.createObjectURL(blob);
                const fileName = meta?.name || "received-file";
                setReceivedFile({ name: fileName, url });
                setReceivePhase("done");
                setReceiveProgress(100);
                // Store in history
                addReceived.mutate({
                  sender: "Wi-Fi Direct",
                  fileName,
                  fileSize: BigInt(blob.size),
                  downloadUrl: url,
                });
                toast.success(`${fileName} received via Wi-Fi Direct!`);
              } else if (parsed.name) {
                meta = parsed;
              }
            } else {
              chunks.push(msgEv.data as ArrayBuffer);
              if (meta) {
                const received = chunks.reduce((a, b) => a + b.byteLength, 0);
                setReceiveProgress(Math.round((received / meta.size) * 100));
              }
            }
          };

          dc.onerror = () => {
            setReceiveError("Data channel error");
            setReceivePhase("error");
          };
        };

        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await waitForICE(pc);

        const sdp = JSON.stringify(pc.localDescription);
        setAnswerSdp(sdp);
      } catch (e) {
        setReceiveError(String(e));
        setReceivePhase("error");
      }
    },
    [addReceived],
  );

  const handleDownload = useCallback(() => {
    if (!receivedFile) return;
    const a = document.createElement("a");
    a.href = receivedFile.url;
    a.download = receivedFile.name;
    a.click();
  }, [receivedFile]);

  const AMBER = "oklch(0.88 0.2 55)";
  const CYAN = "oklch(0.82 0.15 195)";

  if (!open) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "oklch(0.08 0.025 260)" }}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      data-ocid="wifi_direct.modal"
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid oklch(0.88 0.2 55 / 0.15)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: "oklch(0.15 0.025 260)", color: AMBER }}
          data-ocid="wifi_direct.close_button"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "oklch(0.88 0.2 55 / 0.15)", color: AMBER }}
          >
            <Wifi size={16} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Wi-Fi Direct</p>
            <p className="text-xs" style={{ color: AMBER }}>
              Peer-to-peer transfer
            </p>
          </div>
        </div>

        {/* Connected indicator */}
        {(sendPhase === "transferring" ||
          sendPhase === "done" ||
          receivePhase === "receiving" ||
          receivePhase === "done") && (
          <motion.div
            className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: "oklch(0.55 0.18 145 / 0.2)",
              color: "oklch(0.75 0.18 145)",
              border: "1px solid oklch(0.55 0.18 145 / 0.3)",
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "oklch(0.75 0.18 145)" }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
            />
            Connected
          </motion.div>
        )}
      </div>

      {/* Mode tabs */}
      <div
        className="flex gap-1 mx-4 mt-4 p-1 rounded-xl flex-shrink-0"
        style={{ background: "oklch(0.13 0.025 260)" }}
      >
        {(["send", "receive"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            className="flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all"
            style={
              mode === m
                ? { background: AMBER, color: "oklch(0.08 0.025 260)" }
                : { color: "oklch(0.6 0.04 260)" }
            }
            onClick={() => setMode(m)}
            data-ocid={`wifi_direct.${m}.tab`}
          >
            {m === "send" ? "📤 Send" : "📥 Receive"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col">
        <AnimatePresence mode="wait">
          {mode === "send" ? (
            <motion.div
              key="send"
              className="flex flex-col gap-4 flex-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
            >
              {/* PICK FILE */}
              {sendPhase === "pick" && (
                <div className="flex flex-col items-center gap-4 pt-6">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center"
                    style={{
                      background: "oklch(0.88 0.2 55 / 0.1)",
                      border: "1px dashed oklch(0.88 0.2 55 / 0.4)",
                    }}
                  >
                    <Wifi size={36} style={{ color: AMBER }} />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-bold text-foreground mb-1">
                      Send via Wi-Fi Direct
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pick a file to send directly to a nearby device — no
                      server needed
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFilePick}
                    data-ocid="wifi_direct.upload_button"
                  />
                  <Button
                    className="w-full rounded-xl h-12 font-semibold"
                    style={{
                      background: AMBER,
                      color: "oklch(0.08 0.025 260)",
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    data-ocid="wifi_direct.send.primary_button"
                  >
                    Pick File
                  </Button>
                  {sendFile && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full glass rounded-xl p-3 flex items-center gap-3"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: "oklch(0.88 0.2 55 / 0.15)",
                          color: AMBER,
                        }}
                      >
                        <QrCode size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {sendFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(sendFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-lg font-semibold text-xs"
                        style={{
                          background: AMBER,
                          color: "oklch(0.08 0.025 260)",
                        }}
                        onClick={createConnection}
                        data-ocid="wifi_direct.create_connection.button"
                      >
                        Create QR
                      </Button>
                    </motion.div>
                  )}
                </div>
              )}

              {/* CREATING */}
              {sendPhase === "creating" && (
                <div className="flex flex-col items-center justify-center gap-4 flex-1 pt-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1.5,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                  >
                    <RefreshCw size={40} style={{ color: AMBER }} />
                  </motion.div>
                  <p className="text-sm text-muted-foreground">
                    Creating peer connection…
                  </p>
                  <div data-ocid="wifi_direct.send.loading_state" />
                </div>
              )}

              {/* SHOW OFFER QR */}
              {sendPhase === "show-offer" && (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-sm font-semibold text-foreground text-center">
                    Receiver scans this QR code
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    Open Wi-Fi Direct → Receive on the other device, then scan
                    below
                  </p>
                  {offerQr ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3 rounded-2xl"
                      style={{
                        background: "oklch(0.06 0.015 260)",
                        border: "2px solid oklch(0.88 0.2 55 / 0.4)",
                      }}
                    >
                      <img
                        src={offerQr}
                        alt="Offer QR"
                        width={220}
                        height={220}
                      />
                    </motion.div>
                  ) : (
                    <div
                      className="w-56 h-56 rounded-2xl flex items-center justify-center"
                      style={{ background: "oklch(0.13 0.025 260)" }}
                    >
                      <RefreshCw
                        size={24}
                        className="animate-spin"
                        style={{ color: AMBER }}
                      />
                    </div>
                  )}
                  <Button
                    className="w-full rounded-xl h-12 font-semibold"
                    style={{
                      background: "oklch(0.88 0.2 55 / 0.15)",
                      color: AMBER,
                      border: "1px solid oklch(0.88 0.2 55 / 0.4)",
                    }}
                    onClick={() => setSendPhase("scan-answer")}
                    data-ocid="wifi_direct.scan_answer.button"
                  >
                    📷 Scan Receiver's Answer
                  </Button>
                </div>
              )}

              {/* SCAN ANSWER */}
              {sendPhase === "scan-answer" && (
                <ScanView
                  onScanned={handleAnswerScanned}
                  label="Point camera at the receiver's answer QR"
                />
              )}

              {/* CONNECTING */}
              {sendPhase === "connecting" && (
                <div className="flex flex-col items-center justify-center gap-4 flex-1 pt-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1.5,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                  >
                    <Wifi size={40} style={{ color: AMBER }} />
                  </motion.div>
                  <p className="text-sm text-muted-foreground">
                    Establishing peer connection…
                  </p>
                </div>
              )}

              {/* TRANSFERRING */}
              {sendPhase === "transferring" && (
                <div className="flex flex-col items-center gap-4 pt-8">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center"
                    style={{
                      background: "oklch(0.88 0.2 55 / 0.1)",
                      border: `1px solid ${AMBER}33`,
                    }}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{
                        duration: 0.8,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    >
                      <Wifi size={36} style={{ color: AMBER }} />
                    </motion.div>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    Sending {sendFile?.name}
                  </p>
                  <div className="w-full space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Transfer progress</span>
                      <span style={{ color: AMBER }}>{sendProgress}%</span>
                    </div>
                    <Progress
                      value={sendProgress}
                      className="h-2 rounded-full"
                      style={{ background: "oklch(0.15 0.025 260)" }}
                    />
                  </div>
                  <div data-ocid="wifi_direct.send.loading_state" />
                </div>
              )}

              {/* DONE */}
              {sendPhase === "done" && (
                <motion.div
                  className="flex flex-col items-center gap-4 pt-8"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <CheckCircle2
                    size={64}
                    style={{ color: "oklch(0.75 0.18 145)" }}
                  />
                  <p className="text-base font-bold text-foreground">
                    File Sent!
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    {sendFile?.name} was successfully transferred via Wi-Fi
                    Direct.
                  </p>
                  <Button
                    className="w-full rounded-xl h-12 font-semibold"
                    style={{
                      background: AMBER,
                      color: "oklch(0.08 0.025 260)",
                    }}
                    onClick={() => {
                      setSendPhase("pick");
                      setSendFile(null);
                    }}
                    data-ocid="wifi_direct.send.success_state"
                  >
                    Send Another File
                  </Button>
                </motion.div>
              )}

              {/* ERROR */}
              {sendPhase === "error" && (
                <div className="flex flex-col items-center gap-4 pt-8">
                  <XCircle size={48} className="text-destructive" />
                  <p className="text-sm font-semibold text-destructive">
                    Connection Failed
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    {sendError}
                  </p>
                  <Button
                    className="w-full rounded-xl h-12 font-semibold"
                    onClick={() => {
                      setSendPhase("pick");
                      setSendFile(null);
                      pcSendRef.current?.close();
                    }}
                    data-ocid="wifi_direct.send.error_state"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="receive"
              className="flex flex-col gap-4 flex-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.18 }}
            >
              {/* SCAN OFFER */}
              {receivePhase === "scan-offer" && (
                <div className="flex flex-col flex-1 gap-4">
                  <ScanView
                    onScanned={processOffer}
                    label="Scan the sender's Wi-Fi Direct QR code"
                  />
                  <div
                    className="glass rounded-xl p-3 space-y-2"
                    style={{ border: "1px solid oklch(0.88 0.2 55 / 0.2)" }}
                  >
                    <p
                      className="text-xs font-semibold"
                      style={{ color: AMBER }}
                    >
                      Or paste offer manually
                    </p>
                    <textarea
                      className="w-full bg-transparent text-xs text-muted-foreground resize-none outline-none placeholder:text-muted-foreground/50"
                      rows={3}
                      placeholder="Paste JSON offer from sender here…"
                      value={manualOffer}
                      onChange={(e) => setManualOffer(e.target.value)}
                      data-ocid="wifi_direct.receive.textarea"
                    />
                    <Button
                      size="sm"
                      className="w-full rounded-lg text-xs font-semibold"
                      style={{
                        background: AMBER,
                        color: "oklch(0.08 0.025 260)",
                      }}
                      disabled={!manualOffer.trim()}
                      onClick={() => processOffer(manualOffer.trim())}
                      data-ocid="wifi_direct.receive.submit_button"
                    >
                      Connect with Offer
                    </Button>
                  </div>
                </div>
              )}

              {/* SHOW ANSWER QR */}
              {receivePhase === "show-answer" && (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-sm font-semibold text-foreground text-center">
                    Show this to the sender
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    The sender scans this answer QR to complete the connection
                  </p>
                  {answerQr ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3 rounded-2xl"
                      style={{
                        background: "oklch(0.06 0.015 260)",
                        border: `2px solid ${AMBER}66`,
                      }}
                    >
                      <img
                        src={answerQr}
                        alt="Answer QR"
                        width={220}
                        height={220}
                      />
                    </motion.div>
                  ) : (
                    <div
                      className="w-56 h-56 rounded-2xl flex items-center justify-center"
                      style={{ background: "oklch(0.13 0.025 260)" }}
                    >
                      <RefreshCw
                        size={24}
                        className="animate-spin"
                        style={{ color: AMBER }}
                      />
                    </div>
                  )}
                  <div
                    className="w-full glass rounded-xl p-3 space-y-1"
                    style={{ border: `1px solid ${AMBER}33` }}
                  >
                    <p
                      className="text-xs font-semibold"
                      style={{ color: AMBER }}
                    >
                      Or copy answer text
                    </p>
                    <p className="text-[10px] text-muted-foreground break-all line-clamp-3">
                      {answerSdp}
                    </p>
                  </div>
                  <div data-ocid="wifi_direct.receive.loading_state" />
                </div>
              )}

              {/* RECEIVING */}
              {receivePhase === "receiving" && (
                <div className="flex flex-col items-center gap-4 pt-8">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center"
                    style={{
                      background: `${CYAN}18`,
                      border: `1px solid ${CYAN}33`,
                    }}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{
                        duration: 0.8,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    >
                      <Wifi size={36} style={{ color: CYAN }} />
                    </motion.div>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    Receiving file…
                  </p>
                  <div className="w-full space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Transfer progress</span>
                      <span style={{ color: CYAN }}>{receiveProgress}%</span>
                    </div>
                    <Progress
                      value={receiveProgress}
                      className="h-2 rounded-full"
                      style={{ background: "oklch(0.15 0.025 260)" }}
                    />
                  </div>
                  <div data-ocid="wifi_direct.receive.loading_state" />
                </div>
              )}

              {/* DONE */}
              {receivePhase === "done" && (
                <motion.div
                  className="flex flex-col items-center gap-4 pt-8"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <CheckCircle2
                    size={64}
                    style={{ color: "oklch(0.75 0.18 145)" }}
                  />
                  <p className="text-base font-bold text-foreground">
                    File Received!
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    {receivedFile?.name} was saved to your History tab.
                  </p>
                  <Button
                    className="w-full rounded-xl h-12 font-semibold gap-2"
                    style={{ background: CYAN, color: "oklch(0.08 0.025 260)" }}
                    onClick={handleDownload}
                    data-ocid="wifi_direct.receive.primary_button"
                  >
                    <Download size={18} />
                    Download File
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full rounded-xl h-10 text-sm"
                    onClick={() => {
                      setReceivePhase("scan-offer");
                      setAnswerSdp("");
                      pcReceiveRef.current?.close();
                    }}
                    data-ocid="wifi_direct.receive.success_state"
                  >
                    Receive Another
                  </Button>
                </motion.div>
              )}

              {/* ERROR */}
              {receivePhase === "error" && (
                <div className="flex flex-col items-center gap-4 pt-8">
                  <XCircle size={48} className="text-destructive" />
                  <p className="text-sm font-semibold text-destructive">
                    Connection Failed
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    {receiveError}
                  </p>
                  <Button
                    className="w-full rounded-xl h-12 font-semibold"
                    onClick={() => {
                      setReceivePhase("scan-offer");
                      setAnswerSdp("");
                      pcReceiveRef.current?.close();
                    }}
                    data-ocid="wifi_direct.receive.error_state"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info footer */}
      <div
        className="px-4 pb-6 pt-2 flex-shrink-0"
        style={{ borderTop: "1px solid oklch(0.88 0.2 55 / 0.1)" }}
      >
        <p className="text-[10px] text-muted-foreground text-center">
          🔒 Peer-to-peer · No server · Files never leave your network
        </p>
      </div>
    </motion.div>
  );
}
