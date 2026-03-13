import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Grid3X3, List, Search, Send, Trash2, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import {
  FileIcon,
  formatFileSize,
  formatTimestamp,
} from "../components/FileIcon";
import { SendDialog } from "../components/SendDialog";
import { UploadDialog } from "../components/UploadDialog";
import { useDeleteFile, useGetMyFiles } from "../hooks/useLocalFiles";
import { recognizeFile } from "../utils/aiAnalysis";
import type { LocalFileMetadata } from "../utils/localFileStore";

function categoryBadgeStyle(category: string): { bg: string; text: string } {
  switch (category) {
    case "Image":
      return {
        bg: "oklch(0.82 0.15 195 / 0.15)",
        text: "oklch(0.82 0.15 195)",
      };
    case "Video":
      return { bg: "oklch(0.65 0.2 295 / 0.15)", text: "oklch(0.65 0.2 295)" };
    case "Audio":
      return {
        bg: "oklch(0.75 0.18 145 / 0.15)",
        text: "oklch(0.75 0.18 145)",
      };
    case "Document":
      return { bg: "oklch(0.78 0.16 60 / 0.15)", text: "oklch(0.78 0.16 60)" };
    case "Spreadsheet":
      return {
        bg: "oklch(0.72 0.17 150 / 0.15)",
        text: "oklch(0.72 0.17 150)",
      };
    case "Presentation":
      return { bg: "oklch(0.76 0.18 30 / 0.15)", text: "oklch(0.76 0.18 30)" };
    case "Archive":
      return { bg: "oklch(0.72 0.14 50 / 0.15)", text: "oklch(0.72 0.14 50)" };
    case "Code":
      return {
        bg: "oklch(0.78 0.18 270 / 0.15)",
        text: "oklch(0.78 0.18 270)",
      };
    default:
      return {
        bg: "oklch(0.65 0.08 250 / 0.15)",
        text: "oklch(0.65 0.08 250)",
      };
  }
}

function FileCategoryBadge({
  fileType,
  fileName,
}: { fileType: string; fileName: string }) {
  const fakeFile = { type: fileType, name: fileName } as File;
  const rec = recognizeFile(fakeFile);
  const { bg, text } = categoryBadgeStyle(rec.category);
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0"
      style={{ background: bg, color: text }}
    >
      {rec.category}
    </span>
  );
}

export function FilesTab() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sendFile, setSendFile] = useState<LocalFileMetadata | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");

  const { data: files = [], isLoading } = useGetMyFiles();
  const deleteFile = useDeleteFile();

  const filtered = files.filter((f) =>
    f.fileName.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleDelete(id: string) {
    try {
      await deleteFile.mutateAsync(id);
      toast.success("File deleted");
    } catch {
      toast.error("Failed to delete file");
    }
  }

  return (
    <div className="tab-content space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl">My Files</h2>
          <p className="text-xs text-muted-foreground">
            {files.length} files stored
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-xl font-semibold gap-2"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.82 0.15 195), oklch(0.65 0.2 295))",
            color: "oklch(0.08 0.015 260)",
          }}
          onClick={() => setUploadOpen(true)}
          data-ocid="files.upload_button"
        >
          <Upload size={15} />
          Upload
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="pl-9 glass border-border/40 rounded-xl text-sm"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-ocid="files.search_input"
          />
        </div>
        <div className="glass rounded-xl flex overflow-hidden border border-border/40">
          <button
            type="button"
            className={`px-3 py-2 transition-colors ${view === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setView("list")}
            data-ocid="files.tab"
          >
            <List size={15} />
          </button>
          <button
            type="button"
            className={`px-3 py-2 transition-colors ${view === "grid" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setView("grid")}
            data-ocid="files.tab"
          >
            <Grid3X3 size={15} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2" data-ocid="files.loading_state">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="glass rounded-2xl p-10 flex flex-col items-center gap-3"
          data-ocid="files.empty_state"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "oklch(0.82 0.15 195 / 0.12)" }}
          >
            <Upload size={28} className="text-primary" />
          </div>
          <p className="font-semibold text-foreground">No files yet</p>
          <p className="text-xs text-muted-foreground text-center">
            Upload your first file to get started
          </p>
          <Button
            size="sm"
            onClick={() => setUploadOpen(true)}
            className="mt-1 rounded-xl"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.82 0.15 195), oklch(0.65 0.2 295))",
              color: "oklch(0.08 0.015 260)",
            }}
          >
            Upload File
          </Button>
        </div>
      ) : view === "list" ? (
        <AnimatePresence>
          <div className="space-y-2">
            {filtered.map((file, i) => (
              <motion.div
                key={file.id}
                className="glass file-card rounded-xl p-3 flex items-center gap-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.04 }}
                data-ocid={`files.item.${i + 1}`}
              >
                <FileIcon fileType={file.fileType} size={18} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.fileName}
                    </p>
                    <FileCategoryBadge
                      fileType={file.fileType}
                      fileName={file.fileName}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(Number(file.fileSize))} ·{" "}
                    {formatTimestamp(file.uploadedAt)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-primary hover:bg-primary/15 transition-colors"
                    onClick={() => setSendFile(file)}
                    data-ocid={`files.secondary_button.${i + 1}`}
                  >
                    <Send size={14} />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/15 transition-colors"
                        data-ocid={`files.delete_button.${i + 1}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent
                      className="glass border-border/50"
                      data-ocid="files.dialog"
                    >
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete file?</AlertDialogTitle>
                        <AlertDialogDescription>
                          <span className="font-medium text-foreground">
                            {file.fileName}
                          </span>{" "}
                          will be permanently deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-ocid="files.cancel_button">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground"
                          onClick={() => handleDelete(file.id)}
                          data-ocid="files.confirm_button"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filtered.map((file, i) => (
            <motion.div
              key={file.id}
              className="glass file-card rounded-xl p-3 flex flex-col gap-2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              data-ocid={`files.item.${i + 1}`}
            >
              <div className="flex items-center justify-between">
                <FileIcon fileType={file.fileType} size={20} />
                <FileCategoryBadge
                  fileType={file.fileType}
                  fileName={file.fileName}
                />
              </div>
              <p className="text-xs font-medium truncate">{file.fileName}</p>
              <p className="text-[10px] text-muted-foreground">
                {formatFileSize(Number(file.fileSize))}
              </p>
              <div className="flex gap-1 mt-auto">
                <button
                  type="button"
                  className="flex-1 h-7 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 text-primary hover:bg-primary/15 transition-colors"
                  onClick={() => setSendFile(file)}
                  data-ocid={`files.secondary_button.${i + 1}`}
                >
                  <Send size={11} /> Send
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/15 transition-colors"
                      data-ocid={`files.delete_button.${i + 1}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent
                    className="glass border-border/50"
                    data-ocid="files.dialog"
                  >
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete file?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {file.fileName} will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-ocid="files.cancel_button">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground"
                        onClick={() => handleDelete(file.id)}
                        data-ocid="files.confirm_button"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <SendDialog
        open={!!sendFile}
        file={sendFile as never}
        onClose={() => setSendFile(null)}
      />
    </div>
  );
}
