import { useRef, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { Client } from "@stomp/stompjs";
import { API_BASE_URL, WS_BASE_URL } from "@/lib/api/config";

let socket: Socket | null = null;
let stompClient: Client | null = null;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!socket) {
      socket = io(API_BASE_URL);
    }
    socketRef.current = socket;
    return () => {
      // Optionally disconnect on unmount
      // socket?.disconnect();
    };
  }, []);

  return socketRef.current!;
}

export function useStompClient() {
  const stompClientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (stompClient) {
      stompClientRef.current = stompClient;
      return;
    }

    const client = new Client({
      brokerURL: WS_BASE_URL,
      debug: (str) => {
        console.log("STOMP Debug:", str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    stompClient = client;
    stompClientRef.current = client;
    client.activate();

    return () => {
      // Không disconnect ở đây để tránh tạo kết nối mới
    };
  }, []);

  return stompClientRef.current;
}
