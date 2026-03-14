import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Clock, Home, User, X } from "lucide-react";
import { Smartphone } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { GetAppDialog } from "./components/GetAppDialog";
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

function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [getAppOpen, setGetAppOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

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
        <div className="flex items-center gap-3">
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

      <GetAppDialog open={getAppOpen} onClose={() => setGetAppOpen(false)} />

      {/* Scanner fullscreen overlay */}
      <AnimatePresence>
        {showScanner && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: "oklch(0.07 0.015 260)" }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* Scanner header */}
            <div
              className="flex items-center gap-3 px-5 pt-5 pb-3 flex-shrink-0"
              style={{ borderBottom: "1px solid oklch(0.2 0.03 260 / 0.5)" }}
            >
              <button
                type="button"
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: "oklch(0.15 0.025 260)",
                  border: "1px solid oklch(0.25 0.04 260 / 0.5)",
                  color: "oklch(0.82 0.15 195)",
                }}
                onClick={() => setShowScanner(false)}
                data-ocid="scanner.close_button"
              >
                <X size={18} />
              </button>
              <div>
                <h1 className="font-display text-lg font-bold gradient-text">
                  Receive File
                </h1>
                <p className="text-xs text-muted-foreground">
                  Point camera at sender's QR code
                </p>
              </div>
            </div>
            {/* Scanner content */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <ScannerTab />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
