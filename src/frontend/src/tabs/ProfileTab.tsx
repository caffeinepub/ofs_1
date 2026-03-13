import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  Edit2,
  HardDrive,
  LogOut,
  Save,
  Shield,
  User,
  Wifi,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { formatFileSize } from "../components/FileIcon";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetMyFiles,
  useGetNearbyDevices,
  useGetTransferHistory,
} from "../hooks/useQueries";

const NAME_KEY = "ofs_display_name";

export function ProfileTab() {
  const { clear, identity } = useInternetIdentity();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(
    () => localStorage.getItem(NAME_KEY) || "OFS User",
  );
  const [nameInput, setNameInput] = useState(name);

  const principal = identity?.getPrincipal().toString() ?? "";
  const shortPrincipal = principal
    ? `${principal.slice(0, 10)}…${principal.slice(-6)}`
    : "Anonymous";

  const { data: files = [] } = useGetMyFiles();
  const { data: devices = [] } = useGetNearbyDevices();
  const { data: history = [] } = useGetTransferHistory();

  const totalSize = files.reduce((acc, f) => acc + Number(f.fileSize), 0);
  const connectedDevices = devices.filter((d) => d.isConnected).length;
  const completedTransfers = history.filter(
    (h) => String(h.status) === "completed",
  ).length;

  function saveName() {
    localStorage.setItem(NAME_KEY, nameInput.trim() || "OFS User");
    setName(nameInput.trim() || "OFS User");
    setEditing(false);
  }

  async function handleLogout() {
    await clear();
    qc.clear();
  }

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="tab-content space-y-5 pb-4">
      {/* Profile card */}
      <motion.div
        className="glass rounded-3xl p-6 flex flex-col items-center gap-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Avatar */}
        <div className="relative">
          <Avatar
            className="w-20 h-20"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.82 0.15 195), oklch(0.65 0.2 295))",
              boxShadow: "0 0 24px oklch(0.82 0.15 195 / 0.4)",
            }}
          >
            <AvatarFallback
              className="text-2xl font-display font-bold"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.82 0.15 195), oklch(0.65 0.2 295))",
                color: "oklch(0.08 0.015 260)",
              }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              background: "oklch(0.78 0.18 145)",
              boxShadow: "0 0 8px oklch(0.78 0.18 145 / 0.6)",
            }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-background" />
          </div>
        </div>

        {/* Name */}
        {editing ? (
          <div className="flex gap-2 w-full max-w-[220px]">
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              className="glass border-primary/40 rounded-xl text-center text-sm"
              autoFocus
              data-ocid="profile.input"
            />
            <Button
              size="icon"
              className="rounded-xl flex-shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.82 0.15 195), oklch(0.65 0.2 295))",
                color: "oklch(0.08 0.015 260)",
              }}
              onClick={saveName}
              data-ocid="profile.save_button"
            >
              <Save size={15} />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-2xl">{name}</h2>
            <button
              type="button"
              className="text-muted-foreground hover:text-primary transition-colors"
              onClick={() => {
                setNameInput(name);
                setEditing(true);
              }}
              data-ocid="profile.edit_button"
            >
              <Edit2 size={14} />
            </button>
          </div>
        )}

        {/* Principal */}
        <div className="flex items-center gap-2 glass rounded-full px-4 py-1.5">
          <Shield size={12} className="text-primary" />
          <span className="text-xs font-mono text-muted-foreground">
            {shortPrincipal}
          </span>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            icon: HardDrive,
            label: "Storage",
            value: formatFileSize(totalSize),
            color: "text-sky-400",
          },
          {
            icon: Wifi,
            label: "Devices",
            value: connectedDevices.toString(),
            color: "text-violet-400",
          },
          {
            icon: Clock,
            label: "Transfers",
            value: completedTransfers.toString(),
            color: "text-emerald-400",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="glass rounded-2xl p-3 flex flex-col items-center gap-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <stat.icon size={18} className={stat.color} />
            <p className="text-lg font-display font-bold">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Settings section */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Account
          </p>
        </div>
        <div className="divide-y divide-border/20">
          <div className="p-4 flex items-center gap-3">
            <User size={16} className="text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Display Name</p>
              <p className="text-xs text-muted-foreground">{name}</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <Shield size={16} className="text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Principal ID</p>
              <p className="text-xs text-muted-foreground font-mono truncate">
                {principal || "Not connected"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full rounded-2xl h-12 border-destructive/40 text-destructive hover:bg-destructive/10 font-semibold gap-2"
        onClick={handleLogout}
        data-ocid="profile.button"
      >
        <LogOut size={16} />
        Sign Out
      </Button>
    </div>
  );
}
