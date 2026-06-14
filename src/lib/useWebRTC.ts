import { useEffect, useState, useRef } from "react";
import { WebRTCManager, Device, TransferState } from "./peerManager";

export type ChatMessage = {
  sender: "me" | "peer";
  text: string;
  timestamp: number;
};

export function useWebRTC() {
  const managerRef = useRef<WebRTCManager | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [myDevice, setMyDevice] = useState<Device | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [incomingRequest, setIncomingRequest] = useState<Device | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  const [transferState, setTransferState] = useState<TransferState>({
    status: "idle",
    progress: 0,
    speed: 0,
    eta: 0,
    isConnected: false
  });

  useEffect(() => {
    const mgr = new WebRTCManager();
    managerRef.current = mgr;

    mgr.on("my-device-updated", (device: Device) => {
      setMyDevice(device);
      setIsReady(true);
    });

    mgr.on("devices-updated", (newDevices: Device[]) => {
      setDevices(newDevices);
    });

    mgr.on("connection-requested", (device: Device) => {
      setIncomingRequest(device);
      setTransferState(prev => ({ ...prev, status: "incoming", peerInfo: device }));
    });

    mgr.on("connection-accepted", () => {
      setTransferState(prev => ({ ...prev, status: "connecting" }));
    });
    
    mgr.on("connection-rejected", () => {
      setTransferState({ status: "idle", progress: 0, speed: 0, eta: 0, isConnected: false });
      setIncomingRequest(null);
    });

    mgr.on("connecting", () => {
       setTransferState(prev => ({ ...prev, status: "connecting" }));
    });

    mgr.on("data-channel-open", () => {
      setTransferState(prev => ({ ...prev, status: "idle", isConnected: true }));
      setChatMessages([]); // clear chat on new connection
    });

    mgr.on("chat-message", (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg]);
    });

    mgr.on("transfer-start", (data: { role: "sender"| "receiver", fileMeta: any }) => {
      setTransferState(prev => ({
        ...prev,
        status: "transferring",
        role: data.role,
        fileInfo: data.fileMeta,
        progress: 0,
        speed: 0,
        eta: 0
      }));
    });

    mgr.on("transfer-progress", (data: { progress: number, speed: number, eta: number }) => {
      setTransferState(prev => ({
        ...prev,
        progress: data.progress,
        speed: data.speed,
        eta: data.eta
      }));
    });

    mgr.on("transfer-complete", () => {
      setTransferState(prev => ({
        ...prev,
        status: "completed",
        progress: 1
      }));
      
      // Auto reset after 3s
      setTimeout(() => {
        setTransferState(prev => ({
           ...prev,
           status: "idle",
           progress: 0,
           speed: 0,
           eta: 0,
           fileInfo: undefined
        }));
      }, 3000);
    });

    mgr.on("disconnected", () => {
      setTransferState({ status: "idle", progress: 0, speed: 0, eta: 0, isConnected: false, peerInfo: undefined });
      setIncomingRequest(null);
    });

    return () => {
      mgr.disconnect();
    };
  }, []);

  const requestConnection = (targetId: string) => {
    const target = devices.find(d => d.id === targetId);
    if (target) {
      setTransferState(prev => ({ ...prev, status: "requesting", peerInfo: target }));
      managerRef.current?.requestConnection(targetId);
    }
  };

  const acceptConnection = () => {
    managerRef.current?.acceptConnection();
    setIncomingRequest(null);
  };

  const rejectConnection = () => {
    managerRef.current?.rejectConnection();
    setTransferState({ status: "idle", progress: 0, speed: 0, eta: 0 });
    setIncomingRequest(null);
  };

  const sendFile = (file: File) => {
    managerRef.current?.setFileToSend(file);
    if (managerRef.current && transferState.status === "idle" && transferState.peerInfo) {
      managerRef.current.setFileToSend(file);
    }
  };
  
  const sendChatMessage = (text: string) => {
    managerRef.current?.sendChatMessage(text);
  };

  const disconnect = () => {
     managerRef.current?.disconnect();
  }

  return {
    isReady,
    myDevice,
    devices,
    transferState,
    incomingRequest,
    chatMessages,
    requestConnection,
    acceptConnection,
    rejectConnection,
    sendFile,
    sendChatMessage,
    disconnect
  };
}
