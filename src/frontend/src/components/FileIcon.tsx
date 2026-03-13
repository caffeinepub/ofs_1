import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
} from "lucide-react";

interface FileIconProps {
  fileType: string;
  className?: string;
  size?: number;
}

function getFileCategory(fileType: string): {
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bg: string;
  label: string;
} {
  const t = fileType.toLowerCase();
  if (t.startsWith("image/"))
    return {
      Icon: FileImage,
      color: "text-sky-400",
      bg: "bg-sky-400/15",
      label: "Image",
    };
  if (t.startsWith("video/"))
    return {
      Icon: FileVideo,
      color: "text-violet-400",
      bg: "bg-violet-400/15",
      label: "Video",
    };
  if (t.startsWith("audio/"))
    return {
      Icon: FileAudio,
      color: "text-emerald-400",
      bg: "bg-emerald-400/15",
      label: "Audio",
    };
  if (t === "application/pdf" || t.includes("word") || t.includes("document"))
    return {
      Icon: FileText,
      color: "text-orange-400",
      bg: "bg-orange-400/15",
      label: "Doc",
    };
  if (t.includes("spreadsheet") || t.includes("excel") || t.includes("csv"))
    return {
      Icon: FileSpreadsheet,
      color: "text-green-400",
      bg: "bg-green-400/15",
      label: "Sheet",
    };
  if (
    t === "application/zip" ||
    t.includes("archive") ||
    t.includes("compressed") ||
    t.includes("tar") ||
    t.includes("gzip")
  )
    return {
      Icon: FileArchive,
      color: "text-yellow-400",
      bg: "bg-yellow-400/15",
      label: "Archive",
    };
  if (
    t.includes("javascript") ||
    t.includes("typescript") ||
    t.includes("json") ||
    t.includes("html") ||
    t.includes("css") ||
    t.includes("xml")
  )
    return {
      Icon: FileCode,
      color: "text-pink-400",
      bg: "bg-pink-400/15",
      label: "Code",
    };
  return {
    Icon: File,
    color: "text-slate-400",
    bg: "bg-slate-400/15",
    label: "File",
  };
}

export function FileIcon({
  fileType,
  className = "",
  size = 22,
}: FileIconProps) {
  const { Icon, color, bg } = getFileCategory(fileType);
  return (
    <div
      className={`rounded-xl flex items-center justify-center ${bg} ${className}`}
      style={{ width: size * 1.9, height: size * 1.9 }}
    >
      <Icon size={size} className={color} />
    </div>
  );
}

export function getFileCategoryInfo(fileType: string) {
  return getFileCategory(fileType);
}

export function formatFileSize(bytes: bigint | number): string {
  const n = typeof bytes === "bigint" ? Number(bytes) : bytes;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatTimestamp(ns: bigint): string {
  const ms = Number(ns / BigInt(1_000_000));
  const date = new Date(ms);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
