import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Clock, Home, User, Users, X } from "lucide-react";
import { Smartphone } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { GetAppDialog } from "./components/GetAppDialog";
import { UploadDialog } from "./components/UploadDialog";
import { useActor } from "./hooks/useActor";
import { HistoryTab } from "./tabs/HistoryTab";
import { HomeTab } from "./tabs/HomeTab";
import { ProfileTab } from "./tabs/ProfileTab";
import { ScannerTab } from "./tabs/ScannerTab";

const qc = new QueryClient();

type Tab = "home" | "history" | "personal";

const TABS: {
  id: Tab;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { id: "home", label: "Home", Icon: Home },
  { id: "history", label: "History", Icon: Clock },
  { id: "personal", label: "Personal", Icon: User },
];

interface OnlineUser {
  name: string;
  initials: string;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [getAppOpen, setGetAppOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [_sendToUser, setSendToUser] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const { actor } = useActor();

  // Register presence and poll online users
  useEffect(() => {
    if (!actor) return;

    const myName =
      localStorage.getItem("ofs_display_name") ||
      localStorage.getItem("ofs_user_name") ||
      "Anonymous";

    // Register presence
    actor.registerPresence(myName).catch(() => {});

    // Fetch online users
    const fetchUsers = () => {
      actor
        .getOnlineUsers()
        .then((users) => {
          const mapped: OnlineUser[] = users.map((u) => ({
            name: u.name,
            initials: getInitials(u.name),
          }));
          setOnlineUsers(mapped);
        })
        .catch(() => {});
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 30_000);
    return () => clearInterval(interval);
  }, [actor]);

  const tabContent: Record<Tab, React.ReactNode> = {
    home: <HomeTab onReceive={() => setShowScanner(true)} />,
    history: <HistoryTab />,
    personal: <ProfileTab />,
  };

  return (
    <div className="app-bg min-h-dvh flex flex-col">
      {/* Top Header */}
      <header className="safe-top px-5 pt-4 pb-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/assets/uploads/Screenshot_2026-03-13-20-56-15-19_40deb401b9ffe8e1df2f1cc5ba480b12-1.jpg"
            alt="OFS"
            className="w-8 h-8 rounded-full object-cover"
            style={{
              filter: "drop-shadow(0 0 8px oklch(0.82 0.15 195 / 0.5))",
              border: "1.5px solid oklch(0.82 0.15 195 / 0.5)",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "/assets/generated/ofs-logo-transparent.dim_120x120.png";
              (e.target as HTMLImageElement).onerror = null;
            }}
          />
          <span className="font-display font-bold text-xl gradient-text">
            OFS
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: "oklch(0.82 0.15 195 / 0.12)",
              border: "1px solid oklch(0.82 0.15 195 / 0.35)",
              color: "oklch(0.82 0.15 195)",
            }}
            onClick={() => setGetAppOpen(true)}
            data-ocid="header.get_app.button"
          >
            <Smartphone size={13} />
            Get App
          </button>

          {/* Online Users Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: "oklch(0.78 0.18 145 / 0.12)",
                  border: "1px solid oklch(0.78 0.18 145 / 0.35)",
                  color: "oklch(0.78 0.18 145)",
                }}
                data-ocid="header.online_users.button"
              >
                <Users size={13} />
                Online ({onlineUsers.length})
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 p-1"
              style={{
                background: "oklch(0.12 0.025 260)",
                border: "1px solid oklch(0.25 0.04 260 / 0.5)",
              }}
            >
              <div
                className="px-3 py-2 text-xs font-semibold"
                style={{ color: "oklch(0.78 0.18 145)" }}
              >
                Online Users
              </div>
              {onlineUsers.length === 0 ? (
                <div
                  className="px-3 py-3 text-xs text-center"
                  style={{ color: "oklch(0.5 0.04 260)" }}
                  data-ocid="online_users.empty_state"
                >
                  No users online
                </div>
              ) : (
                onlineUsers.map((user, i) => (
                  <DropdownMenuItem
                    key={user.name}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg"
                    style={{
                      color: "oklch(0.9 0.01 260)",
                    }}
                    data-ocid={`online_users.item.${i + 1}`}
                    onClick={() => {
                      setSendToUser(user.name);
                      setUploadOpen(true);
                    }}
                  >
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{
                          background: "oklch(0.82 0.15 195 / 0.15)",
                          border: "1px solid oklch(0.82 0.15 195 / 0.3)",
                          color: "oklch(0.82 0.15 195)",
                        }}
                      >
                        {user.initials}
                      </div>
                      <div
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                        style={{
                          background: "oklch(0.78 0.18 145)",
                          border: "1.5px solid oklch(0.12 0.025 260)",
                          boxShadow: "0 0 4px oklch(0.78 0.18 145 / 0.8)",
                        }}
                      />
                    </div>
                    <span className="flex-1 text-sm truncate">{user.name}</span>
                    <span
                      className="text-[10px] font-semibold"
                      style={{ color: "oklch(0.82 0.15 195)" }}
                    >
                      Send
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: "oklch(0.78 0.18 145)",
                boxShadow: "0 0 8px oklch(0.78 0.18 145 / 0.8)",
              }}
            />
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
        </div>
      </header>

      {/* Tab content */}
      <main className="flex-1 overflow-y-auto px-4 py-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {tabContent[activeTab]}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav
        className="safe-bottom flex-shrink-0"
        style={{
          background: "oklch(0.1 0.02 260 / 0.9)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid oklch(0.25 0.04 260 / 0.5)",
        }}
        data-ocid="nav.panel"
      >
        <div className="flex items-stretch h-16">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className="flex-1 flex flex-col items-center justify-center gap-1 transition-all"
                style={{
                  color: isActive
                    ? "oklch(0.82 0.15 195)"
                    : "oklch(0.55 0.04 260)",
                }}
                onClick={() => setActiveTab(tab.id)}
                data-ocid={`nav.${tab.id}.tab`}
              >
                <tab.Icon size={20} className={isActive ? "" : "opacity-60"} />
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    opacity: isActive ? 1 : 0.5,
                  }}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-0 w-8 h-0.5 rounded-full"
                    style={{ background: "oklch(0.82 0.15 195)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Scanner Overlay */}
      <AnimatePresence>
        {showScanner && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: "oklch(0.07 0.02 260)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="safe-top px-5 pt-4 pb-3 flex items-center gap-3"
              style={{ borderBottom: "1px solid oklch(0.25 0.04 260 / 0.5)" }}
            >
              <button
                type="button"
                onClick={() => setShowScanner(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: "oklch(0.82 0.15 195 / 0.1)",
                  border: "1px solid oklch(0.82 0.15 195 / 0.3)",
                  color: "oklch(0.82 0.15 195)",
                }}
                data-ocid="scanner.close_button"
              >
                <X size={18} />
              </button>
              <span className="font-display font-bold gradient-text">
                Scan to Receive
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ScannerTab onClose={() => setShowScanner(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Get App Dialog */}
      <GetAppDialog open={getAppOpen} onClose={() => setGetAppOpen(false)} />

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          setSendToUser(null);
        }}
      />

      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AppShell />
    </QueryClientProvider>
  );
}
