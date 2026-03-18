import List "mo:core/List";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";

import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import AccessControl "authorization/access-control";



actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  // Types
  public type FileMetadata = {
    id : Storage.ExternalBlob;
    fileName : Text;
    fileSize : Nat;
    fileType : Text;
    uploadedAt : Time.Time;
    uploadedBy : Principal;
    blobId : Storage.ExternalBlob;
  };

  public type TransferRecord = {
    sender : Principal;
    receiver : Text;
    fileName : Text;
    fileSize : Nat;
    transferredAt : Time.Time;
    status : { #completed; #failed };
  };

  public type Device = {
    name : Text;
    isConnected : Bool;
  };

  public type PresenceInfo = {
    name : Text;
    lastSeen : Time.Time;
  };

  // Internal State
  let files = Map.empty<Principal, List.List<FileMetadata>>();
  let transfers = Map.empty<Principal, List.List<TransferRecord>>();
  let nearbyDevices = Map.empty<Principal, List.List<Device>>();
  let presence = Map.empty<Principal, PresenceInfo>();

  // File Management
  public shared ({ caller }) func uploadFile(
    fileName : Text,
    fileSize : Nat,
    fileType : Text,
    blobId : Storage.ExternalBlob,
  ) : async Storage.ExternalBlob {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upload files");
    };

    let fileId = blobId;
    let metadata : FileMetadata = {
      id = fileId;
      fileName;
      fileSize;
      fileType;
      uploadedAt = Time.now();
      uploadedBy = caller;
      blobId;
    };

    // Add file to caller's file list
    switch (files.get(caller)) {
      case (null) {
        let newList = List.empty<FileMetadata>();
        newList.add(metadata);
        files.add(caller, newList);
      };
      case (?existingFiles) {
        existingFiles.add(metadata);
      };
    };

    fileId;
  };

  public query ({ caller }) func getMyFiles() : async [FileMetadata] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view files");
    };

    switch (files.get(caller)) {
      case (null) { [] };
      case (?userFiles) { userFiles.toArray() };
    };
  };

  public shared ({ caller }) func deleteFile(fileId : Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete files");
    };

    switch (files.get(caller)) {
      case (null) { Runtime.trap("No files found for user") };
      case (?userFiles) {
        let filteredFiles = userFiles.filter(
          func(f) { f.id != fileId }
        );
        files.add(caller, filteredFiles);
      };
    };
  };

  public query ({ caller }) func getFileById(fileId : Storage.ExternalBlob) : async FileMetadata {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view files");
    };

    switch (files.get(caller)) {
      case (null) { Runtime.trap("No files found for user") };
      case (?userFiles) {
        let foundFile = userFiles.find(func(f) { f.id == fileId });
        switch (foundFile) {
          case (null) { Runtime.trap("File not found") };
          case (?file) { file };
        };
      };
    };
  };

  // Transfer History
  public shared ({ caller }) func addTransferRecord(
    receiver : Text,
    fileName : Text,
    fileSize : Nat,
    status : { #completed; #failed },
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add transfer records");
    };

    let record : TransferRecord = {
      sender = caller;
      receiver;
      fileName;
      fileSize;
      transferredAt = Time.now();
      status;
    };

    // Add record to caller's transfer history
    switch (transfers.get(caller)) {
      case (null) {
        let newList = List.empty<TransferRecord>();
        newList.add(record);
        transfers.add(caller, newList);
      };
      case (?existingTransfers) {
        existingTransfers.add(record);
      };
    };
  };

  public query ({ caller }) func getTransferHistory() : async [TransferRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view transfer history");
    };

    switch (transfers.get(caller)) {
      case (null) { [] };
      case (?userTransfers) { userTransfers.toArray() };
    };
  };

  // Nearby Devices Management (Simulated)
  public shared ({ caller }) func addNearbyDevice(deviceName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add nearby devices");
    };

    let device : Device = {
      name = deviceName;
      isConnected = false;
    };

    switch (nearbyDevices.get(caller)) {
      case (null) {
        let newList = List.empty<Device>();
        newList.add(device);
        nearbyDevices.add(caller, newList);
      };
      case (?existingDevices) {
        existingDevices.add(device);
      };
    };
  };

  public shared ({ caller }) func connectToDevice(deviceName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can connect to devices");
    };

    switch (nearbyDevices.get(caller)) {
      case (null) { Runtime.trap("No devices found") };
      case (?devices) {
        let updatedDevices = devices.map<Device, Device>(
          func(device) {
            if (device.name == deviceName) {
              {
                name = device.name;
                isConnected = true;
              };
            } else {
              device;
            };
          }
        );
        nearbyDevices.add(caller, updatedDevices);
      };
    };
  };

  public query ({ caller }) func getNearbyDevices() : async [Device] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view nearby devices");
    };

    switch (nearbyDevices.get(caller)) {
      case (null) { [] };
      case (?devices) { devices.toArray() };
    };
  };

  // Presence Tracking
  public shared ({ caller }) func registerPresence(name : Text) : async () {
    let presenceInfo : PresenceInfo = {
      name;
      lastSeen = Time.now();
    };
    presence.add(caller, presenceInfo);
  };

  public query ({ caller }) func getOnlineUsers() : async [PresenceInfo] {
    let now = Time.now();
    let fiveMinutesNano = 5 * 60 * 1_000_000_000;

    let onlineUsers = presence.values().toArray().filter(
      func(info) {
        (now - info.lastSeen) <= fiveMinutesNano;
      }
    );

    onlineUsers;
  };
};
