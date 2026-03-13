import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addLocalFile,
  deleteLocalFile,
  getLocalFiles,
} from "../utils/localFileStore";

// --- Files ---
export function useGetMyFiles() {
  return useQuery({
    queryKey: ["localFiles"],
    queryFn: getLocalFiles,
    staleTime: 0,
  });
}

export function useUploadFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      fileName,
      fileSize,
      fileType,
      data,
      onProgress,
    }: {
      fileName: string;
      fileSize: bigint;
      fileType: string;
      data: Uint8Array;
      onProgress?: (pct: number) => void;
    }) => {
      return addLocalFile(fileName, fileSize, fileType, data, onProgress);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["localFiles"] }),
  });
}

export function useDeleteFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      deleteLocalFile(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["localFiles"] }),
  });
}

// --- Devices (simulated local) ---
const SEED_DEVICES = [
  { name: "Galaxy S25", isConnected: false },
  { name: "MacBook Pro", isConnected: false },
  { name: "iPhone 16", isConnected: true },
  { name: "Pixel 9", isConnected: false },
  { name: "iPad Pro", isConnected: false },
];

let localDevices = [
  ...SEED_DEVICES.sort(() => Math.random() - 0.5).slice(0, 3),
];

export function useGetNearbyDevices() {
  return useQuery({
    queryKey: ["localDevices"],
    queryFn: () => localDevices,
    staleTime: 10000,
    refetchInterval: 10000,
  });
}

export function useAddNearbyDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deviceName: string) => {
      localDevices = [
        ...localDevices,
        { name: deviceName, isConnected: false },
      ];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["localDevices"] }),
  });
}

export function useConnectToDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deviceName: string) => {
      localDevices = localDevices.map((d) =>
        d.name === deviceName ? { ...d, isConnected: true } : d,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["localDevices"] }),
  });
}

// --- Transfer History (local) ---
export interface LocalTransferRecord {
  sender: string;
  receiver: string;
  fileName: string;
  fileSize: bigint;
  transferredAt: bigint;
  status: "completed" | "failed";
}

const HISTORY_KEY = "ofs_transfer_history";

function loadHistory(): LocalTransferRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((r: Record<string, unknown>) => ({
      ...r,
      fileSize: BigInt(r.fileSize as string),
      transferredAt: BigInt(r.transferredAt as string),
    }));
  } catch {
    return [];
  }
}

function saveHistory(records: LocalTransferRecord[]) {
  try {
    const s = records.map((r) => ({
      ...r,
      fileSize: r.fileSize.toString(),
      transferredAt: r.transferredAt.toString(),
    }));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function useGetTransferHistory() {
  return useQuery({
    queryKey: ["localHistory"],
    queryFn: loadHistory,
    staleTime: 0,
  });
}

export function useAddTransferRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: {
      receiver: string;
      fileName: string;
      fileSize: bigint;
      status: "completed" | "failed";
    }) => {
      const record: LocalTransferRecord = {
        sender: "me",
        receiver: r.receiver,
        fileName: r.fileName,
        fileSize: r.fileSize,
        transferredAt: BigInt(Date.now()) * BigInt(1_000_000),
        status: r.status,
      };
      const existing = loadHistory();
      saveHistory([record, ...existing]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["localHistory"] }),
  });
}
