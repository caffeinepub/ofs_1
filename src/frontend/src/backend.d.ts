import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface PresenceInfo {
    name: string;
    lastSeen: Time;
}
export type Time = bigint;
export interface FileMetadata {
    id: ExternalBlob;
    fileName: string;
    fileSize: bigint;
    fileType: string;
    blobId: ExternalBlob;
    uploadedAt: Time;
    uploadedBy: Principal;
}
export interface TransferRecord {
    status: Variant_completed_failed;
    fileName: string;
    fileSize: bigint;
    sender: Principal;
    transferredAt: Time;
    receiver: string;
}
export interface Device {
    name: string;
    isConnected: boolean;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_completed_failed {
    completed = "completed",
    failed = "failed"
}
export interface backendInterface {
    addNearbyDevice(deviceName: string): Promise<void>;
    addTransferRecord(receiver: string, fileName: string, fileSize: bigint, status: Variant_completed_failed): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    connectToDevice(deviceName: string): Promise<void>;
    deleteFile(fileId: ExternalBlob): Promise<void>;
    getCallerUserRole(): Promise<UserRole>;
    getFileById(fileId: ExternalBlob): Promise<FileMetadata>;
    getMyFiles(): Promise<Array<FileMetadata>>;
    getNearbyDevices(): Promise<Array<Device>>;
    getOnlineUsers(): Promise<Array<PresenceInfo>>;
    getTransferHistory(): Promise<Array<TransferRecord>>;
    isCallerAdmin(): Promise<boolean>;
    registerPresence(name: string): Promise<void>;
    uploadFile(fileName: string, fileSize: bigint, fileType: string, blobId: ExternalBlob): Promise<ExternalBlob>;
}
