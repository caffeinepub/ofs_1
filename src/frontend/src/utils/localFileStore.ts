// Local file store - stores file metadata in localStorage and file data as object URLs

export interface LocalFileMetadata {
  id: string;
  fileName: string;
  fileSize: bigint;
  fileType: string;
  uploadedAt: bigint;
  objectUrl: string;
}

const STORAGE_KEY = "ofs_local_files";

function loadMeta(): Omit<LocalFileMetadata, "objectUrl">[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((f: Record<string, unknown>) => ({
      ...f,
      fileSize: BigInt(f.fileSize as string),
      uploadedAt: BigInt(f.uploadedAt as string),
    }));
  } catch {
    return [];
  }
}

function saveMeta(files: Omit<LocalFileMetadata, "objectUrl">[]) {
  try {
    const serializable = files.map((f) => ({
      ...f,
      fileSize: f.fileSize.toString(),
      uploadedAt: f.uploadedAt.toString(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // ignore
  }
}

const objectUrls = new Map<string, string>();

export function getLocalFiles(): LocalFileMetadata[] {
  const metas = loadMeta();
  return metas.map((m) => ({
    ...m,
    objectUrl: objectUrls.get(m.id) ?? "",
  }));
}

export function addLocalFile(
  fileName: string,
  fileSize: bigint,
  fileType: string,
  data: Uint8Array,
  onProgress?: (pct: number) => void,
): Promise<LocalFileMetadata> {
  return new Promise((resolve) => {
    let pct = 0;
    const tick = setInterval(() => {
      pct = Math.min(pct + 20 + Math.random() * 20, 95);
      onProgress?.(pct);
      if (pct >= 95) clearInterval(tick);
    }, 120);

    setTimeout(() => {
      clearInterval(tick);
      onProgress?.(100);

      const id = `file_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      // Use ArrayBuffer directly to avoid Uint8Array type variance issue
      const ab = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength,
      ) as ArrayBuffer;
      const blob = new Blob([ab], {
        type: fileType || "application/octet-stream",
      });
      const objectUrl = URL.createObjectURL(blob);
      objectUrls.set(id, objectUrl);

      const meta: Omit<LocalFileMetadata, "objectUrl"> = {
        id,
        fileName,
        fileSize,
        fileType,
        uploadedAt: BigInt(Date.now()) * BigInt(1_000_000),
      };

      const existing = loadMeta();
      saveMeta([...existing, meta]);
      resolve({ ...meta, objectUrl });
    }, 700);
  });
}

export function deleteLocalFile(id: string): void {
  const files = loadMeta().filter((f) => f.id !== id);
  saveMeta(files);
  const url = objectUrls.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrls.delete(id);
  }
}
