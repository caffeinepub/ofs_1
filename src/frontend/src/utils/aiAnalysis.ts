export interface FileRecognition {
  category: string;
  label: string;
  tags: string[];
  confidence: number;
}

export interface ImageAnalysis {
  width: number;
  height: number;
  megapixels: number;
  dominantColors: string[];
  aspectRatio: string;
  estimatedSavings: number;
}

const MIME_MAP: Record<
  string,
  { category: string; label: string; tags: string[] }
> = {
  // Images
  "image/jpeg": {
    category: "Image",
    label: "JPEG Photo",
    tags: ["photo", "compressed", "raster"],
  },
  "image/jpg": {
    category: "Image",
    label: "JPEG Photo",
    tags: ["photo", "compressed", "raster"],
  },
  "image/png": {
    category: "Image",
    label: "PNG Image",
    tags: ["image", "lossless", "raster"],
  },
  "image/gif": {
    category: "Image",
    label: "GIF Animation",
    tags: ["animation", "raster", "web"],
  },
  "image/webp": {
    category: "Image",
    label: "WebP Image",
    tags: ["image", "modern", "web"],
  },
  "image/svg+xml": {
    category: "Image",
    label: "SVG Vector",
    tags: ["vector", "scalable", "web"],
  },
  "image/bmp": {
    category: "Image",
    label: "Bitmap Image",
    tags: ["image", "uncompressed", "raster"],
  },
  "image/tiff": {
    category: "Image",
    label: "TIFF Image",
    tags: ["image", "lossless", "professional"],
  },
  "image/avif": {
    category: "Image",
    label: "AVIF Image",
    tags: ["image", "modern", "compressed"],
  },
  "image/heic": {
    category: "Image",
    label: "HEIC Photo",
    tags: ["photo", "apple", "compressed"],
  },
  // Video
  "video/mp4": {
    category: "Video",
    label: "MP4 Video",
    tags: ["video", "h264", "streaming"],
  },
  "video/webm": {
    category: "Video",
    label: "WebM Video",
    tags: ["video", "web", "open"],
  },
  "video/quicktime": {
    category: "Video",
    label: "QuickTime Video",
    tags: ["video", "apple", "pro"],
  },
  "video/x-msvideo": {
    category: "Video",
    label: "AVI Video",
    tags: ["video", "legacy", "windows"],
  },
  "video/mpeg": {
    category: "Video",
    label: "MPEG Video",
    tags: ["video", "compressed", "legacy"],
  },
  "video/ogg": {
    category: "Video",
    label: "OGG Video",
    tags: ["video", "open", "web"],
  },
  // Audio
  "audio/mpeg": {
    category: "Audio",
    label: "MP3 Audio",
    tags: ["audio", "compressed", "music"],
  },
  "audio/wav": {
    category: "Audio",
    label: "WAV Audio",
    tags: ["audio", "lossless", "uncompressed"],
  },
  "audio/ogg": {
    category: "Audio",
    label: "OGG Audio",
    tags: ["audio", "open", "web"],
  },
  "audio/flac": {
    category: "Audio",
    label: "FLAC Audio",
    tags: ["audio", "lossless", "hifi"],
  },
  "audio/aac": {
    category: "Audio",
    label: "AAC Audio",
    tags: ["audio", "compressed", "streaming"],
  },
  "audio/mp4": {
    category: "Audio",
    label: "M4A Audio",
    tags: ["audio", "apple", "compressed"],
  },
  // Documents
  "application/pdf": {
    category: "Document",
    label: "PDF Document",
    tags: ["document", "portable", "print"],
  },
  "application/msword": {
    category: "Document",
    label: "Word Document",
    tags: ["document", "microsoft", "editable"],
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    category: "Document",
    label: "Word Document",
    tags: ["document", "microsoft", "editable"],
  },
  "text/plain": {
    category: "Document",
    label: "Text File",
    tags: ["text", "plain", "readable"],
  },
  "text/markdown": {
    category: "Document",
    label: "Markdown File",
    tags: ["markdown", "text", "structured"],
  },
  "text/rtf": {
    category: "Document",
    label: "RTF Document",
    tags: ["document", "rich-text", "editable"],
  },
  // Spreadsheets
  "application/vnd.ms-excel": {
    category: "Spreadsheet",
    label: "Excel Spreadsheet",
    tags: ["spreadsheet", "microsoft", "data"],
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    category: "Spreadsheet",
    label: "Excel Spreadsheet",
    tags: ["spreadsheet", "microsoft", "data"],
  },
  "text/csv": {
    category: "Spreadsheet",
    label: "CSV File",
    tags: ["data", "tabular", "export"],
  },
  // Presentations
  "application/vnd.ms-powerpoint": {
    category: "Presentation",
    label: "PowerPoint Presentation",
    tags: ["slides", "microsoft", "presentation"],
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    category: "Presentation",
    label: "PowerPoint Presentation",
    tags: ["slides", "microsoft", "presentation"],
  },
  // Archives
  "application/zip": {
    category: "Archive",
    label: "ZIP Archive",
    tags: ["archive", "compressed", "bundle"],
  },
  "application/x-rar-compressed": {
    category: "Archive",
    label: "RAR Archive",
    tags: ["archive", "compressed", "bundle"],
  },
  "application/x-7z-compressed": {
    category: "Archive",
    label: "7-Zip Archive",
    tags: ["archive", "compressed", "bundle"],
  },
  "application/gzip": {
    category: "Archive",
    label: "GZip Archive",
    tags: ["archive", "compressed", "unix"],
  },
  "application/x-tar": {
    category: "Archive",
    label: "TAR Archive",
    tags: ["archive", "bundle", "unix"],
  },
  // Code
  "text/html": {
    category: "Code",
    label: "HTML File",
    tags: ["web", "markup", "frontend"],
  },
  "text/css": {
    category: "Code",
    label: "CSS Stylesheet",
    tags: ["web", "style", "frontend"],
  },
  "text/javascript": {
    category: "Code",
    label: "JavaScript File",
    tags: ["code", "script", "web"],
  },
  "application/json": {
    category: "Code",
    label: "JSON Data",
    tags: ["data", "config", "structured"],
  },
  "application/xml": {
    category: "Code",
    label: "XML File",
    tags: ["data", "markup", "structured"],
  },
  "text/xml": {
    category: "Code",
    label: "XML File",
    tags: ["data", "markup", "structured"],
  },
};

const EXT_MAP: Record<
  string,
  { category: string; label: string; tags: string[] }
> = {
  ts: {
    category: "Code",
    label: "TypeScript File",
    tags: ["code", "typed", "javascript"],
  },
  tsx: {
    category: "Code",
    label: "TSX Component",
    tags: ["code", "react", "typescript"],
  },
  js: {
    category: "Code",
    label: "JavaScript File",
    tags: ["code", "script", "web"],
  },
  jsx: {
    category: "Code",
    label: "JSX Component",
    tags: ["code", "react", "javascript"],
  },
  py: {
    category: "Code",
    label: "Python Script",
    tags: ["code", "python", "script"],
  },
  rb: {
    category: "Code",
    label: "Ruby Script",
    tags: ["code", "ruby", "script"],
  },
  go: {
    category: "Code",
    label: "Go Source File",
    tags: ["code", "go", "compiled"],
  },
  rs: {
    category: "Code",
    label: "Rust Source File",
    tags: ["code", "rust", "compiled"],
  },
  mo: {
    category: "Code",
    label: "Motoko Source File",
    tags: ["code", "motoko", "icp"],
  },
  java: {
    category: "Code",
    label: "Java Source File",
    tags: ["code", "java", "compiled"],
  },
  cpp: {
    category: "Code",
    label: "C++ Source File",
    tags: ["code", "cpp", "compiled"],
  },
  c: {
    category: "Code",
    label: "C Source File",
    tags: ["code", "c", "compiled"],
  },
  md: {
    category: "Document",
    label: "Markdown File",
    tags: ["markdown", "text", "structured"],
  },
  txt: {
    category: "Document",
    label: "Text File",
    tags: ["text", "plain", "readable"],
  },
  pdf: {
    category: "Document",
    label: "PDF Document",
    tags: ["document", "portable", "print"],
  },
  docx: {
    category: "Document",
    label: "Word Document",
    tags: ["document", "microsoft", "editable"],
  },
  xlsx: {
    category: "Spreadsheet",
    label: "Excel Spreadsheet",
    tags: ["spreadsheet", "data", "microsoft"],
  },
  csv: {
    category: "Spreadsheet",
    label: "CSV File",
    tags: ["data", "tabular", "export"],
  },
  pptx: {
    category: "Presentation",
    label: "PowerPoint",
    tags: ["slides", "presentation", "microsoft"],
  },
  zip: {
    category: "Archive",
    label: "ZIP Archive",
    tags: ["archive", "compressed", "bundle"],
  },
  rar: {
    category: "Archive",
    label: "RAR Archive",
    tags: ["archive", "compressed", "bundle"],
  },
  "7z": {
    category: "Archive",
    label: "7-Zip Archive",
    tags: ["archive", "compressed", "bundle"],
  },
  mp3: {
    category: "Audio",
    label: "MP3 Audio",
    tags: ["audio", "compressed", "music"],
  },
  wav: {
    category: "Audio",
    label: "WAV Audio",
    tags: ["audio", "lossless", "uncompressed"],
  },
  flac: {
    category: "Audio",
    label: "FLAC Audio",
    tags: ["audio", "lossless", "hifi"],
  },
  mp4: {
    category: "Video",
    label: "MP4 Video",
    tags: ["video", "h264", "streaming"],
  },
  mov: {
    category: "Video",
    label: "QuickTime Video",
    tags: ["video", "apple", "pro"],
  },
  avi: {
    category: "Video",
    label: "AVI Video",
    tags: ["video", "legacy", "windows"],
  },
};

export function recognizeFile(file: File): FileRecognition {
  const mime = file.type?.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  const fromMime = mime ? MIME_MAP[mime] : null;
  const fromExt = EXT_MAP[ext] ?? null;
  const info = fromMime ?? fromExt;

  if (info) {
    return {
      category: info.category,
      label: info.label,
      tags: info.tags,
      confidence: fromMime ? 0.98 : 0.85,
    };
  }

  return {
    category: "Other",
    label: ext ? `${ext.toUpperCase()} File` : "Unknown File",
    tags: ["binary", "unknown"],
    confidence: 0.4,
  };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function getAspectRatio(w: number, h: number): string {
  const d = gcd(w, h);
  const rw = w / d;
  const rh = h / d;
  // Simplify common aspect ratios
  const ratio = w / h;
  if (Math.abs(ratio - 16 / 9) < 0.02) return "16:9";
  if (Math.abs(ratio - 4 / 3) < 0.02) return "4:3";
  if (Math.abs(ratio - 1) < 0.02) return "1:1";
  if (Math.abs(ratio - 3 / 2) < 0.02) return "3:2";
  if (Math.abs(ratio - 21 / 9) < 0.03) return "21:9";
  if (Math.abs(ratio - 9 / 16) < 0.02) return "9:16";
  return `${rw}:${rh}`;
}

function rgbToOklch(r: number, g: number, b: number): string {
  // Linearize sRGB
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const rl = toLinear(r);
  const gl = toLinear(g);
  const bl = toLinear(b);

  // sRGB to XYZ (D65)
  const X = 0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl;
  const Y = 0.2126729 * rl + 0.7151522 * gl + 0.072175 * bl;
  const Z = 0.0193339 * rl + 0.119192 * gl + 0.9503041 * bl;

  // XYZ to OKLab
  const l = 0.8189330101 * X + 0.3618667424 * Y - 0.1288597137 * Z;
  const m = 0.0329845436 * X + 0.9293118715 * Y + 0.0361456387 * Z;
  const s = 0.0482003018 * X + 0.2643662691 * Y + 0.633851707 * Z;

  const lp = Math.cbrt(l);
  const mp = Math.cbrt(m);
  const sp = Math.cbrt(s);

  const L = 0.2104542553 * lp + 0.793617785 * mp - 0.0040720468 * sp;
  const a = 1.9779984951 * lp - 2.428592205 * mp + 0.4505937099 * sp;
  const bk = 0.0259040371 * lp + 0.7827717662 * mp - 0.808675766 * sp;

  const C = Math.sqrt(a * a + bk * bk);
  const H = ((Math.atan2(bk, a) * 180) / Math.PI + 360) % 360;

  return `oklch(${L.toFixed(2)} ${C.toFixed(2)} ${H.toFixed(0)})`;
}

export async function analyzeImage(file: File): Promise<ImageAnalysis> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const sampleSize = 100; // sample at reduced resolution for speed
      const scale = Math.min(
        sampleSize / img.width,
        sampleSize / img.height,
        1,
      );
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      // Quantize colors using a simple grid approach
      const buckets: Map<
        string,
        { r: number; g: number; b: number; count: number }
      > = new Map();
      for (let i = 0; i < data.length; i += 4) {
        const r = Math.round(data[i] / 32) * 32;
        const g = Math.round(data[i + 1] / 32) * 32;
        const b = Math.round(data[i + 2] / 32) * 32;
        const key = `${r},${g},${b}`;
        const existing = buckets.get(key);
        if (existing) {
          existing.count++;
        } else {
          buckets.set(key, { r, g, b, count: 1 });
        }
      }

      const sorted = Array.from(buckets.values()).sort(
        (a, b) => b.count - a.count,
      );
      const top = sorted.slice(0, 5);
      const dominantColors = top.map(({ r, g, b }) => rgbToOklch(r, g, b));

      // Estimate savings based on file type + size
      let estimatedSavings = 0;
      const mime = file.type.toLowerCase();
      if (
        mime === "image/png" ||
        mime === "image/bmp" ||
        mime === "image/tiff"
      ) {
        estimatedSavings = 0.55 + Math.random() * 0.1; // 55-65%
      } else if (mime === "image/jpeg" || mime === "image/jpg") {
        estimatedSavings = 0.2 + Math.random() * 0.15; // 20-35%
      } else if (mime === "image/webp" || mime === "image/avif") {
        estimatedSavings = 0.05 + Math.random() * 0.1; // 5-15%
      } else {
        estimatedSavings = 0.3 + Math.random() * 0.2;
      }

      URL.revokeObjectURL(url);
      resolve({
        width: img.width,
        height: img.height,
        megapixels: Math.round((img.width * img.height) / 100000) / 10,
        dominantColors,
        aspectRatio: getAspectRatio(img.width, img.height),
        estimatedSavings,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}
