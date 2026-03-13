import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { Variant_completed_failed } from "../backend";
import {
  FileIcon,
  formatFileSize,
  formatTimestamp,
} from "../components/FileIcon";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetTransferHistory } from "../hooks/useQueries";

export function HistoryTab() {
  const { data: history = [], isLoading } = useGetTransferHistory();
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();

  return (
    <div className="tab-content space-y-4 pb-4">
      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-xl">Transfer History</h2>
        <p className="text-xs text-muted-foreground">
          {history.length} transfers recorded
        </p>
      </div>

      {/* Stats */}
      {history.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-xl p-3">
            <p className="text-2xl font-display font-bold text-emerald-400">
              {
                history.filter(
                  (h) => h.status === Variant_completed_failed.completed,
                ).length
              }
            </p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="text-2xl font-display font-bold text-destructive">
              {
                history.filter(
                  (h) => h.status === Variant_completed_failed.failed,
                ).length
              }
            </p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
        </div>
      )}

      {/* History list */}
      {isLoading ? (
        <div className="space-y-2" data-ocid="history.loading_state">
          {[0, 1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div
          className="glass rounded-2xl p-10 flex flex-col items-center gap-3"
          data-ocid="history.empty_state"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "oklch(0.65 0.2 295 / 0.12)" }}
          >
            <Clock size={28} className="text-secondary" />
          </div>
          <p className="font-semibold">No transfers yet</p>
          <p className="text-xs text-muted-foreground text-center">
            Send a file to a nearby device to see history
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100dvh-280px)]">
          <div className="space-y-2 pr-1">
            {history.map((record, i) => {
              const isSender = record.sender.toString() === myPrincipal;
              const isCompleted =
                record.status === Variant_completed_failed.completed;
              return (
                <motion.div
                  key={
                    String(record.transferredAt) +
                    record.fileName +
                    record.receiver
                  }
                  className="glass rounded-xl p-4 flex items-start gap-3"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  data-ocid={`history.item.${i + 1}`}
                >
                  <FileIcon fileType="" size={16} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">
                        {record.fileName}
                      </p>
                      <Badge
                        className="text-[10px] px-2 py-0 rounded-full"
                        style={{
                          background: isCompleted
                            ? "oklch(0.78 0.18 145 / 0.2)"
                            : "oklch(0.65 0.22 25 / 0.2)",
                          color: isCompleted
                            ? "oklch(0.78 0.18 145)"
                            : "oklch(0.75 0.2 25)",
                          border: "none",
                        }}
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle size={10} className="mr-1" />
                            Completed
                          </>
                        ) : (
                          <>
                            <XCircle size={10} className="mr-1" />
                            Failed
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatFileSize(record.fileSize)}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {isSender ? (
                        <ArrowUpRight
                          size={11}
                          className="text-primary flex-shrink-0"
                        />
                      ) : (
                        <ArrowDownLeft
                          size={11}
                          className="text-secondary flex-shrink-0"
                        />
                      )}
                      <p className="text-[11px] text-muted-foreground truncate">
                        {isSender
                          ? `To: ${record.receiver}`
                          : `From: ${record.sender.toString().slice(0, 12)}…`}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {formatTimestamp(record.transferredAt)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
