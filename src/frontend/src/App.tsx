import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Clock, FolderOpen, Home, Send, User, Wifi } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { DevicesTab } from "./tabs/DevicesTab";
import { FilesTab } from "./tabs/FilesTab";
import { HistoryTab } from "./tabs/HistoryTab";
import { HomeTab } from "./tabs/HomeTab";
import { ProfileTab } from "./tabs/ProfileTab";

const qc = new QueryClient();

type Tab = "home" | "files" | "devices" | "history" | "profile";

const TABS: {
  id: Tab;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { id: "home", label: "Home", Icon: Home },
  { id: "files", label: "Files", Icon: FolderOpen },
  { id: "devices", label: "Devices", Icon: Wifi },
  { id: "history", label: "History", Icon: Clock },
  { id: "profile", label: "Profile", Icon: User },
];

function LoginScreen() {
  const { login, loginStatus } = useInternetIdentity();
  const isLoggingIn = loginStatus === "logging-in";

  return (
    <div className="app-bg min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      {/* Background decorative elements */}
      <div
        className="absolute top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(0.82 0.15 195 / 0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <motion.div
        className="relative z-10 flex flex-col items-center gap-8 max-w-xs"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Logo */}
        <motion.div
          className="relative"
          animate={{ y: [0, -8, 0] }}
          transition={{
            repeat: Number.POSITIVE_INFINITY,
            duration: 4,
            ease: "easeInOut",
          }}
        >
          <img
            src="/assets/generated/ofs-logo-transparent.dim_120x120.png"
            alt="OFS Logo"
            className="w-24 h-24"
            style={{
              filter: "drop-shadow(0 0 24px oklch(0.82 0.15 195 / 0.6))",
            }}
          />
        </motion.div>

        {/* Title */}
        <div>
          <h1 className="font-display font-bold text-5xl tracking-tight gradient-text">
            OFS
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            Open File Sharing
          </p>
          <p className="text-muted-foreground/70 mt-1 text-sm">
            Fast · Secure · Anywhere
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {[
            { emoji: "⚡", text: "Lightning Fast" },
            { emoji: "🔒", text: "End-to-End Secure" },
            { emoji: "🤖", text: "AI Compression" },
            { emoji: "📡", text: "Nearby Devices" },
          ].map((f) => (
            <div
              key={f.text}
              className="glass rounded-xl p-3 flex items-center gap-2"
            >
              <span className="text-base">{f.emoji}</span>
              <span className="text-xs font-medium text-foreground/80">
                {f.text}
              </span>
            </div>
          ))}
        </div>

        {/* Login button */}
        <Button
          size="lg"
          className="w-full h-14 rounded-2xl text-base font-semibold"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.82 0.15 195), oklch(0.65 0.2 295))",
            color: "oklch(0.08 0.015 260)",
            boxShadow: "0 8px 32px oklch(0.82 0.15 195 / 0.4)",
          }}
          onClick={login}
          disabled={isLoggingIn}
          data-ocid="login.primary_button"
        >
          {isLoggingIn ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              Connecting...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Send size={18} />
              Get Started
            </span>
          )}
        </Button>
      </motion.div>
    </div>
  );
}

function AppShell() {
  const { identity, isInitializing } = useInternetIdentity();
  const [activeTab, setActiveTab] = useState<Tab>("home");

  if (isInitializing) {
    return (
      <div className="app-bg min-h-dvh flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <img
            src="/assets/generated/ofs-logo-transparent.dim_120x120.png"
            alt="OFS"
            className="w-16 h-16"
            style={{
              filter: "drop-shadow(0 0 16px oklch(0.82 0.15 195 / 0.5))",
            }}
          />
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 1,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (!identity) return <LoginScreen />;

  const tabContent: Record<Tab, React.ReactNode> = {
    home: <HomeTab />,
    files: <FilesTab />,
    devices: <DevicesTab />,
    history: <HistoryTab />,
    profile: <ProfileTab />,
  };

  return (
    <div className="app-bg min-h-dvh flex flex-col">
      {/* Top Header */}
      <header className="safe-top px-5 pt-4 pb-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/assets/generated/ofs-logo-transparent.dim_120x120.png"
            alt="OFS"
            className="w-8 h-8"
            style={{
              filter: "drop-shadow(0 0 8px oklch(0.82 0.15 195 / 0.5))",
            }}
          />
          <span className="font-display font-bold text-xl gradient-text">
            OFS
          </span>
        </div>
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
                type="button"
                key={tab.id}
                className="flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors"
                onClick={() => setActiveTab(tab.id)}
                data-ocid={`nav.${tab.id}.tab`}
              >
                <motion.div
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    y: isActive ? -1 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="flex flex-col items-center gap-1"
                >
                  <span
                    style={
                      isActive
                        ? {
                            filter:
                              "drop-shadow(0 0 6px oklch(0.82 0.15 195 / 0.7))",
                          }
                        : {}
                    }
                  >
                    <tab.Icon
                      size={20}
                      className={`transition-colors ${
                        isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </span>
                  <span
                    className={`text-[10px] font-medium transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {tab.label}
                  </span>
                </motion.div>
                {isActive && (
                  <motion.div
                    className="nav-active-dot"
                    layoutId="nav-indicator"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AppShell />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "oklch(0.13 0.025 260)",
            border: "1px solid oklch(0.25 0.04 260)",
            color: "oklch(0.96 0.005 260)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
