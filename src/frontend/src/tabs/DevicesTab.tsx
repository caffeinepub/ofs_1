import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Ban,
  Bluetooth,
  BluetoothOff,
  Check,
  Plus,
  RefreshCw,
  Send,
  ShieldOff,
  Smartphone,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DeviceSendDialog } from "../components/DeviceSendDialog";
import { RadarScanner } from "../components/RadarScanner";
import {
  useAddNearbyDevice,
  useConnectToDevice,
  useGetNearbyDevices,
} from "../hooks/useLocalFiles";

interface BluetoothDeviceLocal {
  name: string;
  real: boolean;
}

interface DisplayDevice {
  name: string;
  isConnected: boolean;
  real: boolean;
  isDemo: boolean;
}

const DEMO_DEVICES: { name: string; real: boolean; isConnected: boolean }[] = [
  { name: "Riya's iPhone", real: false, isConnected: false },
  { name: "Samsung Galaxy S23", real: false, isConnected: false },
  { name: "Arjun's OnePlus", real: false, isConnected: false },
];

export function DevicesTab() {
  const [customName, setCustomName] = useState("");
  const [connecting, setConnecting] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [bluetoothDevices, setBluetoothDevices] = useState<
    BluetoothDeviceLocal[]
  >([]);
  const [btScanning, setBtScanning] = useState(false);
  const [btSupported] = useState(
    () => typeof navigator !== "undefined" && "bluetooth" in navigator,
  );
  const [sendTarget, setSendTarget] = useState<string | null>(null);
  const [btPermissionDenied, setBtPermissionDenied] = useState(false);
  const [deviceTab, setDeviceTab] = useState<"nearby" | "blocked">("nearby");

  // Long press state
  const [longPressTarget, setLongPressTarget] = useState<string | null>(null);
  const [blockedDevices, setBlockedDevices] = useState<string[]>([]);
  const [deletedDemoDevices, setDeletedDemoDevices] = useState<string[]>([]);
  const [deleteConfirmDevice, setDeleteConfirmDevice] = useState<string | null>(
    null,
  );
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: devices = [], isLoading, refetch } = useGetNearbyDevices();
  const addDevice = useAddNearbyDevice();
  const connectDevice = useConnectToDevice();

  // Close menu on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLongPressTarget(null);
        setDeleteConfirmDevice(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Show manually added devices that aren't from bluetooth
  const manualDevices = devices
    .filter((d) => !bluetoothDevices.some((b) => b.name === d.name))
    .map((d) => ({
      name: d.name,
      isConnected: d.isConnected,
      real: false,
      isDemo: false,
    }));

  const visibleDemoDevices: DisplayDevice[] = DEMO_DEVICES.filter(
    (d) =>
      !blockedDevices.includes(d.name) && !deletedDemoDevices.includes(d.name),
  ).map((d) => ({ ...d, isDemo: true }));

  const displayDevices: DisplayDevice[] = [
    ...bluetoothDevices
      .map((b) => ({
        name: b.name,
        isConnected:
          devices.find((d) => d.name === b.name)?.isConnected ?? false,
        real: true,
        isDemo: false,
      }))
      .filter((d) => !blockedDevices.includes(d.name)),
    ...manualDevices.filter((d) => !blockedDevices.includes(d.name)),
    ...visibleDemoDevices,
  ];

  const radarDots = displayDevices.slice(0, 6).map((d, i) => {
    const angle = (i / Math.max(displayDevices.length, 1)) * 2 * Math.PI + 0.3;
    const dist = 0.38 + (i % 3) * 0.18;
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      label: d.name,
      connected: d.isConnected,
      real: d.real,
    };
  });

  async function handleConnect(name: string) {
    setConnecting(name);
    try {
      await connectDevice.mutateAsync(name);
      toast.success(`Connected to ${name}`);
    } catch {
      toast.error(`Failed to connect to ${name}`);
    } finally {
      setConnecting(null);
    }
  }

  async function handleScan() {
    setScanning(true);
    await refetch();
    setTimeout(() => setScanning(false), 1800);
  }

  async function handleBluetoothScan() {
    if (!btSupported) {
      toast.error(
        "Bluetooth not supported in this browser. Use Chrome or Edge.",
      );
      return;
    }
    setBtScanning(true);
    try {
      const bt = navigator as unknown as {
        bluetooth: {
          requestDevice: (opts: unknown) => Promise<{ name?: string }>;
        };
      };
      const device = await bt.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [],
      });
      if (device?.name) {
        const name = device.name;
        setBtPermissionDenied(false);
        setBluetoothDevices((prev) =>
          prev.some((d) => d.name === name)
            ? prev
            : [...prev, { name, real: true }],
        );
        toast.success(`Found: ${name}`, {
          description: "Tap Send to transfer a file",
        });
      } else {
        toast.info("Device found but name is hidden");
      }
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      if (
        error?.name === "NotFoundError" ||
        error?.message?.includes("cancelled")
      ) {
        // User cancelled the picker — silent
      } else if (
        error?.name === "NotAllowedError" ||
        error?.name === "SecurityError"
      ) {
        setBtPermissionDenied(true);
        toast.error(
          "Bluetooth permission denied. Please allow Bluetooth access in your browser settings and try again.",
        );
      } else {
        toast.error("Could not scan for Bluetooth devices");
      }
    } finally {
      setBtScanning(false);
    }
  }

  async function handleAddDevice() {
    if (!customName.trim()) return;
    try {
      await addDevice.mutateAsync(customName.trim());
      setCustomName("");
      toast.success(`Added ${customName.trim()}`);
    } catch {
      toast.error("Failed to add device");
    }
  }

  function startLongPress(name: string) {
    longPressTimer.current = setTimeout(() => {
      setLongPressTarget(name);
    }, 500);
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleBlockDevice(name: string) {
    setBlockedDevices((prev) => [...prev, name]);
    setBluetoothDevices((prev) => prev.filter((d) => d.name !== name));
    setLongPressTarget(null);
    toast.warning("Device blocked", {
      description: `${name} has been blocked`,
    });
  }

  function handleUnblockDevice(name: string) {
    setBlockedDevices((prev) => prev.filter((d) => d !== name));
    toast.success("Device unblocked", {
      description: `${name} has been unblocked`,
    });
  }

  function handleDeleteDevice(name: string) {
    setDeleteConfirmDevice(name);
    setLongPressTarget(null);
  }

  function confirmDelete(name: string) {
    // Check if it's a demo device
    const isDemo = DEMO_DEVICES.some((d) => d.name === name);
    if (isDemo) {
      setDeletedDemoDevices((prev) => [...prev, name]);
    } else {
      setBluetoothDevices((prev) => prev.filter((d) => d.name !== name));
    }
    setDeleteConfirmDevice(null);
    toast.success("Device removed", {
      description: `${name} has been removed`,
    });
  }

  return (
    <div className="tab-content space-y-5 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl">Nearby Devices</h2>
          <p className="text-xs text-muted-foreground">
            {displayDevices.length} devices detected
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl gap-2 border-border/50"
            onClick={handleScan}
            disabled={scanning}
            data-ocid="devices.button"
          >
            <RefreshCw size={13} className={scanning ? "animate-spin" : ""} />
            {scanning ? "Scanning..." : "Scan"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl gap-2 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
            onClick={handleBluetoothScan}
            disabled={btScanning || !btSupported}
            data-ocid="devices.secondary_button"
            title={
              !btSupported
                ? "Bluetooth not supported in this browser"
                : "Scan real Bluetooth devices"
            }
          >
            {btSupported ? (
              <Bluetooth
                size={13}
                className={btScanning ? "animate-pulse" : ""}
              />
            ) : (
              <BluetoothOff size={13} className="opacity-50" />
            )}
            {btScanning ? "Scanning..." : "Bluetooth"}
          </Button>
        </div>
      </div>

      {/* Tab switcher */}
      <div
        className="flex rounded-2xl p-1 gap-1"
        style={{
          background: "oklch(0.11 0.02 260 / 0.8)",
          border: "1px solid oklch(0.82 0.15 195 / 0.15)",
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-semibold transition-all duration-200"
          style={{
            background:
              deviceTab === "nearby"
                ? "linear-gradient(135deg, oklch(0.82 0.15 195 / 0.25), oklch(0.65 0.2 295 / 0.25))"
                : "transparent",
            color:
              deviceTab === "nearby"
                ? "oklch(0.9 0.12 195)"
                : "oklch(0.6 0.05 260)",
            boxShadow:
              deviceTab === "nearby"
                ? "0 1px 12px oklch(0.82 0.15 195 / 0.15), inset 0 1px 0 oklch(0.82 0.15 195 / 0.1)"
                : "none",
            border:
              deviceTab === "nearby"
                ? "1px solid oklch(0.82 0.15 195 / 0.2)"
                : "1px solid transparent",
          }}
          onClick={() => setDeviceTab("nearby")}
          data-ocid="devices.nearby_tab"
        >
          <Bluetooth size={14} />
          Nearby
        </button>
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-semibold transition-all duration-200"
          style={{
            background:
              deviceTab === "blocked"
                ? "linear-gradient(135deg, oklch(0.72 0.18 60 / 0.2), oklch(0.55 0.22 25 / 0.2))"
                : "transparent",
            color:
              deviceTab === "blocked"
                ? "oklch(0.88 0.16 65)"
                : "oklch(0.6 0.05 260)",
            boxShadow:
              deviceTab === "blocked"
                ? "0 1px 12px oklch(0.72 0.18 60 / 0.15), inset 0 1px 0 oklch(0.72 0.18 60 / 0.1)"
                : "none",
            border:
              deviceTab === "blocked"
                ? "1px solid oklch(0.72 0.18 60 / 0.25)"
                : "1px solid transparent",
          }}
          onClick={() => setDeviceTab("blocked")}
          data-ocid="devices.blocked_tab"
        >
          <Ban size={14} />
          Blocked
          {blockedDevices.length > 0 && (
            <span
              className="ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1"
              style={{
                background: "oklch(0.72 0.18 60 / 0.3)",
                color: "oklch(0.88 0.16 65)",
                border: "1px solid oklch(0.72 0.18 60 / 0.4)",
              }}
            >
              {blockedDevices.length}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {deviceTab === "nearby" ? (
          <motion.div
            key="nearby"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            {/* Bluetooth permission denied banner */}
            <AnimatePresence>
              {btPermissionDenied && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.22 }}
                  className="rounded-xl px-4 py-3 flex items-start gap-3 border"
                  style={{
                    background: "oklch(0.22 0.06 60 / 0.45)",
                    borderColor: "oklch(0.72 0.18 60 / 0.45)",
                    backdropFilter: "blur(8px)",
                  }}
                  data-ocid="devices.error_state"
                >
                  <AlertTriangle
                    size={16}
                    className="shrink-0 mt-0.5"
                    style={{ color: "oklch(0.82 0.18 70)" }}
                  />
                  <div className="flex-1 space-y-1">
                    <p
                      className="text-xs font-semibold"
                      style={{ color: "oklch(0.88 0.14 70)" }}
                    >
                      Bluetooth access was blocked
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "oklch(0.72 0.08 60)" }}
                    >
                      To fix: tap the{" "}
                      <span
                        className="font-semibold"
                        style={{ color: "oklch(0.88 0.14 70)" }}
                      >
                        lock / info icon
                      </span>{" "}
                      in your browser's address bar →{" "}
                      <span
                        className="font-semibold"
                        style={{ color: "oklch(0.88 0.14 70)" }}
                      >
                        Site settings
                      </span>{" "}
                      →{" "}
                      <span
                        className="font-semibold"
                        style={{ color: "oklch(0.88 0.14 70)" }}
                      >
                        Bluetooth
                      </span>{" "}
                      → Allow. Then try again.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBtPermissionDenied(false)}
                    className="shrink-0 rounded-lg p-1 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2"
                    style={{ color: "oklch(0.72 0.08 60)" }}
                    aria-label="Dismiss"
                    data-ocid="devices.close_button"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {btSupported && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl px-4 py-2 flex items-center gap-3 border border-blue-500/20"
              >
                <Bluetooth size={14} className="text-blue-400 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Tap{" "}
                  <span className="text-blue-400 font-semibold">Bluetooth</span>{" "}
                  to detect real nearby devices.{" "}
                  <span className="text-primary/70">Hold a device card</span> to
                  block or remove it.
                </p>
              </motion.div>
            )}

            {!btSupported && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl px-4 py-2 flex items-center gap-3 border border-yellow-500/20"
              >
                <BluetoothOff size={14} className="text-yellow-400 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Real Bluetooth scanning requires{" "}
                  <span className="text-yellow-400 font-semibold">
                    Chrome or Edge
                  </span>{" "}
                  on desktop or Android.
                </p>
              </motion.div>
            )}

            <motion.div
              className="glass rounded-3xl p-5 flex flex-col items-center gap-3"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {isLoading ? (
                <div
                  className="w-[260px] h-[260px] rounded-full flex items-center justify-center"
                  style={{ background: "oklch(0.13 0.025 260 / 0.5)" }}
                  data-ocid="devices.loading_state"
                >
                  <RefreshCw size={32} className="text-primary animate-spin" />
                </div>
              ) : (
                <RadarScanner
                  dots={radarDots}
                  size={260}
                  onDotClick={(name) => setSendTarget(name)}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Tap a device on radar to send a file
              </p>
              {/* Demo note */}
              {visibleDemoDevices.length > 0 && (
                <p
                  className="text-[10px] text-center px-3"
                  style={{ color: "oklch(0.55 0.04 260)" }}
                >
                  Demo devices shown for preview. Tap{" "}
                  <span style={{ color: "oklch(0.65 0.1 240)" }}>
                    Bluetooth
                  </span>{" "}
                  to find real devices.
                </p>
              )}
            </motion.div>

            {displayDevices.length === 0 && !isLoading ? (
              <div
                className="glass rounded-2xl p-8 text-center"
                data-ocid="devices.empty_state"
              >
                <WifiOff
                  size={32}
                  className="text-muted-foreground mx-auto mb-3"
                />
                <p className="text-sm font-medium">No devices found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tap Bluetooth to scan for real nearby devices
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-1">
                  Discovered Devices
                </p>
                <AnimatePresence>
                  {displayDevices.map((device, i) => (
                    <motion.div
                      key={device.name}
                      className="glass rounded-xl p-4 flex items-center gap-3 select-none cursor-pointer relative"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20, scale: 0.95 }}
                      transition={{ delay: i * 0.06 }}
                      data-ocid={`devices.item.${i + 1}`}
                      onPointerDown={() => startLongPress(device.name)}
                      onPointerUp={cancelLongPress}
                      onPointerLeave={cancelLongPress}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setLongPressTarget(device.name);
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                          background: device.isConnected
                            ? "oklch(0.78 0.18 145 / 0.2)"
                            : device.real
                              ? "oklch(0.65 0.15 240 / 0.2)"
                              : device.isDemo
                                ? "oklch(0.45 0.02 260 / 0.35)"
                                : "oklch(0.82 0.15 195 / 0.15)",
                        }}
                      >
                        {device.isConnected ? (
                          <Check size={18} className="text-emerald-400" />
                        ) : device.real ? (
                          <Bluetooth size={18} className="text-blue-400" />
                        ) : device.isDemo ? (
                          <Smartphone
                            size={18}
                            style={{ color: "oklch(0.62 0.04 260)" }}
                          />
                        ) : (
                          <Send size={18} className="text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{device.name}</p>
                          {device.real && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              REAL
                            </span>
                          )}
                          {device.isDemo && (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border"
                              style={{
                                background: "oklch(0.45 0.02 260 / 0.25)",
                                color: "oklch(0.62 0.04 260)",
                                borderColor: "oklch(0.52 0.03 260 / 0.35)",
                              }}
                            >
                              DEMO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {device.isConnected
                            ? "● Connected"
                            : device.real
                              ? "Bluetooth · Nearby"
                              : device.isDemo
                                ? "Available · Demo device"
                                : "Available · Hold to manage"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="rounded-lg text-xs gap-1 font-semibold"
                          style={{
                            background:
                              "linear-gradient(135deg, oklch(0.82 0.15 195), oklch(0.65 0.2 295))",
                            color: "oklch(0.08 0.015 260)",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSendTarget(device.name);
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          data-ocid={`devices.primary_button.${i + 1}`}
                        >
                          <Send size={12} /> Send
                        </Button>
                        {!device.isConnected && !device.isDemo && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg text-xs border-primary/40 text-primary hover:bg-primary/15"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConnect(device.name);
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            disabled={connecting === device.name}
                            data-ocid={`devices.secondary_button.${i + 1}`}
                          >
                            {connecting === device.name ? "..." : "Pair"}
                          </Button>
                        )}
                        {device.isConnected && (
                          <span
                            className="text-xs font-semibold text-emerald-400"
                            style={{
                              filter:
                                "drop-shadow(0 0 6px oklch(0.78 0.18 145 / 0.6))",
                            }}
                          >
                            Paired
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            <div className="glass rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Add Device Manually
              </p>
              <div className="flex gap-2">
                <Input
                  className="flex-1 glass border-border/40 rounded-xl text-sm"
                  placeholder="Device name..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddDevice()}
                  data-ocid="devices.input"
                />
                <Button
                  size="sm"
                  className="rounded-xl px-3"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.82 0.15 195), oklch(0.65 0.2 295))",
                    color: "oklch(0.08 0.015 260)",
                  }}
                  onClick={handleAddDevice}
                  disabled={!customName.trim()}
                  data-ocid="devices.submit_button"
                >
                  <Plus size={16} />
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="blocked"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.18 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 px-1">
              <Ban size={13} style={{ color: "oklch(0.72 0.18 60)" }} />
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Blocked Devices
              </p>
            </div>

            {blockedDevices.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
                data-ocid="blocked.empty_state"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
                  style={{ background: "oklch(0.72 0.18 60 / 0.1)" }}
                >
                  <ShieldOff
                    size={26}
                    style={{ color: "oklch(0.72 0.18 60 / 0.5)" }}
                  />
                </div>
                <p className="text-sm font-semibold">No blocked devices</p>
                <p className="text-xs text-muted-foreground max-w-[200px]">
                  Hold a device card in the Nearby tab to block it
                </p>
              </motion.div>
            ) : (
              <AnimatePresence>
                {blockedDevices.map((name, i) => (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass rounded-xl p-4 flex items-center gap-3 border"
                    style={{
                      borderColor: "oklch(0.72 0.18 60 / 0.2)",
                      background: "oklch(0.13 0.025 260 / 0.6)",
                    }}
                    data-ocid={`blocked.item.${i + 1}`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "oklch(0.72 0.18 60 / 0.15)" }}
                    >
                      <Ban size={18} style={{ color: "oklch(0.82 0.18 60)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{name}</p>
                      <p
                        className="text-xs"
                        style={{ color: "oklch(0.65 0.1 60)" }}
                      >
                        Blocked · Hidden from radar
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg text-xs font-semibold shrink-0"
                      style={{
                        borderColor: "oklch(0.72 0.18 60 / 0.4)",
                        color: "oklch(0.88 0.16 65)",
                        background: "oklch(0.72 0.18 60 / 0.08)",
                      }}
                      onClick={() => handleUnblockDevice(name)}
                      data-ocid={`blocked.unblock_button.${i + 1}`}
                    >
                      Unblock
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <DeviceSendDialog
        open={!!sendTarget}
        deviceName={sendTarget ?? ""}
        onClose={() => setSendTarget(null)}
      />

      {/* Long press context menu overlay */}
      <AnimatePresence>
        {longPressTarget && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                background: "oklch(0.05 0.02 260 / 0.6)",
                backdropFilter: "blur(2px)",
              }}
              onClick={() => setLongPressTarget(null)}
            />
            {/* Menu */}
            <motion.div
              ref={menuRef}
              className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-8"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              data-ocid="devices.dialog"
            >
              <div
                className="rounded-2xl overflow-hidden border"
                style={{
                  background: "oklch(0.12 0.025 260 / 0.97)",
                  borderColor: "oklch(0.82 0.15 195 / 0.25)",
                  boxShadow:
                    "0 -8px 40px oklch(0.82 0.15 195 / 0.12), 0 0 0 1px oklch(0.82 0.15 195 / 0.08)",
                  backdropFilter: "blur(24px)",
                }}
              >
                {/* Device label */}
                <div
                  className="px-5 py-3 border-b"
                  style={{ borderColor: "oklch(0.82 0.15 195 / 0.12)" }}
                >
                  <p className="text-xs text-muted-foreground">Device</p>
                  <p className="text-sm font-semibold truncate">
                    {longPressTarget}
                  </p>
                </div>

                {/* Block option */}
                <button
                  type="button"
                  className="w-full flex items-center gap-4 px-5 py-4 transition-colors hover:bg-amber-500/10 active:bg-amber-500/15"
                  onClick={() => handleBlockDevice(longPressTarget)}
                  data-ocid="devices.block_button"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "oklch(0.72 0.18 60 / 0.15)" }}
                  >
                    <Ban size={18} style={{ color: "oklch(0.82 0.18 60)" }} />
                  </div>
                  <div className="text-left">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "oklch(0.88 0.16 65)" }}
                    >
                      Block Device
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Hide this device from the list
                    </p>
                  </div>
                </button>

                {/* Divider */}
                <div
                  style={{
                    height: 1,
                    background: "oklch(0.82 0.15 195 / 0.08)",
                  }}
                />

                {/* Delete option */}
                <button
                  type="button"
                  className="w-full flex items-center gap-4 px-5 py-4 transition-colors hover:bg-red-500/10 active:bg-red-500/15"
                  onClick={() => handleDeleteDevice(longPressTarget)}
                  data-ocid="devices.delete_button"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "oklch(0.55 0.22 25 / 0.18)" }}
                  >
                    <Trash2
                      size={18}
                      style={{ color: "oklch(0.72 0.22 25)" }}
                    />
                  </div>
                  <div className="text-left">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "oklch(0.78 0.2 25)" }}
                    >
                      Delete Device
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Remove this device permanently
                    </p>
                  </div>
                </button>

                {/* Cancel */}
                <div
                  style={{
                    height: 1,
                    background: "oklch(0.82 0.15 195 / 0.08)",
                  }}
                />
                <button
                  type="button"
                  className="w-full flex items-center justify-center px-5 py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 active:bg-white/10"
                  onClick={() => setLongPressTarget(null)}
                  data-ocid="devices.cancel_button"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {deleteConfirmDevice && (
          <>
            <motion.div
              className="fixed inset-0 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                background: "oklch(0.05 0.02 260 / 0.7)",
                backdropFilter: "blur(4px)",
              }}
              onClick={() => setDeleteConfirmDevice(null)}
            />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center px-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
            >
              <div
                className="w-full max-w-sm rounded-2xl p-6 space-y-4 border"
                style={{
                  background: "oklch(0.12 0.025 260 / 0.98)",
                  borderColor: "oklch(0.72 0.22 25 / 0.35)",
                  boxShadow: "0 0 40px oklch(0.55 0.22 25 / 0.2)",
                  backdropFilter: "blur(24px)",
                }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                aria-label="Delete confirmation"
                data-ocid="devices.modal"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "oklch(0.55 0.22 25 / 0.2)" }}
                  >
                    <Trash2
                      size={20}
                      style={{ color: "oklch(0.72 0.22 25)" }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Remove Device?</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-semibold text-foreground">
                        {deleteConfirmDevice}
                      </span>{" "}
                      will be removed from the list.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-xl border-border/40"
                    onClick={() => setDeleteConfirmDevice(null)}
                    data-ocid="devices.cancel_button"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 rounded-xl font-semibold"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.55 0.22 25), oklch(0.45 0.2 20))",
                      color: "white",
                    }}
                    onClick={() => confirmDelete(deleteConfirmDevice)}
                    data-ocid="devices.confirm_button"
                  >
                    <Trash2 size={13} /> Remove
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
