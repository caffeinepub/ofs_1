import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bluetooth,
  BluetoothOff,
  Check,
  Plus,
  RefreshCw,
  Send,
  Wifi,
  WifiOff,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DeviceSendDialog } from "../components/DeviceSendDialog";
import { RadarScanner } from "../components/RadarScanner";
import {
  useAddNearbyDevice,
  useConnectToDevice,
  useGetNearbyDevices,
} from "../hooks/useLocalFiles";

const SEED_DEVICES = [
  "Galaxy S25",
  "MacBook Pro",
  "iPhone 16",
  "Pixel 9",
  "iPad Air",
];

interface BluetoothDeviceLocal {
  name: string;
  real: boolean;
}

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

  const { data: devices = [], isLoading, refetch } = useGetNearbyDevices();
  const addDevice = useAddNearbyDevice();
  const connectDevice = useConnectToDevice();

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally omit mutate fn
  useEffect(() => {
    if (!isLoading && devices.length === 0) {
      const shuffled = [...SEED_DEVICES]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      for (const name of shuffled) addDevice.mutate(name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, devices.length]);

  const allDevices = [
    ...devices.map((d) => ({
      name: d.name,
      isConnected: d.isConnected,
      real: false,
    })),
    ...bluetoothDevices
      .filter((b) => !devices.some((d) => d.name === b.name))
      .map((b) => ({ name: b.name, isConnected: false, real: true })),
  ];

  const radarDots = allDevices.slice(0, 6).map((d, i) => {
    const angle = (i / Math.max(allDevices.length, 1)) * 2 * Math.PI + 0.3;
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
        // User cancelled
      } else if (error?.name === "SecurityError") {
        toast.error("Bluetooth permission denied");
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

  return (
    <div className="tab-content space-y-5 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl">Nearby Devices</h2>
          <p className="text-xs text-muted-foreground">
            {allDevices.length} devices detected
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

      {btSupported && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl px-4 py-2 flex items-center gap-3 border border-blue-500/20"
        >
          <Bluetooth size={14} className="text-blue-400 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Tap <span className="text-blue-400 font-semibold">Bluetooth</span>{" "}
            to detect real nearby devices, then tap{" "}
            <span className="text-primary font-semibold">Send</span> to transfer
            a file.
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
        className="glass rounded-3xl p-5 flex flex-col items-center gap-4"
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
      </motion.div>

      {allDevices.length === 0 && !isLoading ? (
        <div
          className="glass rounded-2xl p-8 text-center"
          data-ocid="devices.empty_state"
        >
          <WifiOff size={32} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">No devices found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Make sure other devices have OFS open
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-1">
            Discovered Devices
          </p>
          <AnimatePresence>
            {allDevices.map((device, i) => (
              <motion.div
                key={device.name}
                className="glass rounded-xl p-4 flex items-center gap-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                data-ocid={`devices.item.${i + 1}`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: device.isConnected
                      ? "oklch(0.78 0.18 145 / 0.2)"
                      : device.real
                        ? "oklch(0.65 0.15 240 / 0.2)"
                        : "oklch(0.82 0.15 195 / 0.15)",
                  }}
                >
                  {device.isConnected ? (
                    <Check size={18} className="text-emerald-400" />
                  ) : device.real ? (
                    <Bluetooth size={18} className="text-blue-400" />
                  ) : (
                    <Wifi size={18} className="text-primary" />
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
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {device.isConnected
                      ? "● Connected"
                      : device.real
                        ? "Bluetooth · Nearby"
                        : "Available"}
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
                    onClick={() => setSendTarget(device.name)}
                    data-ocid={`devices.primary_button.${i + 1}`}
                  >
                    <Send size={12} /> Send
                  </Button>
                  {!device.isConnected && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg text-xs border-primary/40 text-primary hover:bg-primary/15"
                      onClick={() => handleConnect(device.name)}
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

      <DeviceSendDialog
        open={!!sendTarget}
        deviceName={sendTarget ?? ""}
        onClose={() => setSendTarget(null)}
      />
    </div>
  );
}
