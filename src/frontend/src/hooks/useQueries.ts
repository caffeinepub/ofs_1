import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Device, FileMetadata, TransferRecord } from "../backend";
import { ExternalBlob, type Variant_completed_failed } from "../backend";
import { useActor } from "./useActor";

// ---- Files ----
export function useGetMyFiles() {
  const { actor, isFetching } = useActor();
  return useQuery<FileMetadata[]>({
    queryKey: ["myFiles"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyFiles();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUploadFile() {
  const { actor } = useActor();
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
      data: Uint8Array<ArrayBuffer>;
      onProgress?: (pct: number) => void;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      let blob = ExternalBlob.fromBytes(data);
      if (onProgress) blob = blob.withUploadProgress(onProgress);
      return actor.uploadFile(fileName, fileSize, fileType, blob);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myFiles"] }),
  });
}

export function useDeleteFile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fileId: ExternalBlob) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.deleteFile(fileId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myFiles"] }),
  });
}

// ---- Devices ----
export function useGetNearbyDevices() {
  const { actor, isFetching } = useActor();
  return useQuery<Device[]>({
    queryKey: ["nearbyDevices"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getNearbyDevices();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useAddNearbyDevice() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deviceName: string) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.addNearbyDevice(deviceName);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nearbyDevices"] }),
  });
}

export function useConnectToDevice() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deviceName: string) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.connectToDevice(deviceName);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nearbyDevices"] }),
  });
}

// ---- Transfer History ----
export function useGetTransferHistory() {
  const { actor, isFetching } = useActor();
  return useQuery<TransferRecord[]>({
    queryKey: ["transferHistory"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTransferHistory();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddTransferRecord() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      receiver,
      fileName,
      fileSize,
      status,
    }: {
      receiver: string;
      fileName: string;
      fileSize: bigint;
      status: Variant_completed_failed;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.addTransferRecord(receiver, fileName, fileSize, status);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transferHistory"] }),
  });
}
