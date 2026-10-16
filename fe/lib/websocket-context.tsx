"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Client } from "@stomp/stompjs";
import { useRouter } from "next/navigation";
import { useAuth } from "./api/context/AuthContext";
import { useNotification } from "@/components/NotificationProvider";
import { WS_BASE_URL } from "@/lib/api/config";

interface WebSocketContextType {
  stompClient: Client | null;
  onlineUsers: any[];
  isConnected: boolean;
  isReconnecting: boolean;
  sessionId: string | null;
  setOnlineUsers: (users: any[]) => void;
  // Người mình đã mời và đang chờ phản hồi
  pendingChallenges: string[];
  sendChallenge: (targetUsername: string) => void;
  cancelChallenge: (targetUsername: string) => void;
}

export const WebSocketContext = createContext<WebSocketContextType>({
  stompClient: null,
  onlineUsers: [],
  isConnected: false,
  isReconnecting: false,
  sessionId: null,
  setOnlineUsers: () => {},
  pendingChallenges: [],
  sendChallenge: () => {},
  cancelChallenge: () => {},
});


export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const notification = useNotification();
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingChallenges, setPendingChallenges] = useState<string[]>([]);
  const username = user?.username ?? null;

  // Các hàm dùng trong callback STOMP luôn lấy bản mới nhất, không cần kết nối lại
  const handlersRef = useRef({ router, notification });
  handlersRef.current = { router, notification };

  const clientRef = useRef<Client | null>(null);

  const publish = useCallback((destination: string, body: string) => {
    const client = clientRef.current;
    if (!client?.connected) {
      handlersRef.current.notification.showNotification({
        severity: "error",
        summary: "Chưa kết nối",
        detail: "Không thể kết nối tới máy chủ. Vui lòng thử lại sau.",
      });
      return;
    }
    client.publish({ destination, body });
  }, []);

  const sendChallenge = useCallback(
    (targetUsername: string) => publish("/app/challenge.send", targetUsername),
    [publish]
  );

  const cancelChallenge = useCallback(
    (targetUsername: string) => {
      setPendingChallenges((prev) => prev.filter((u) => u !== targetUsername));
      publish("/app/challenge.cancel", targetUsername);
    },
    [publish]
  );

  useEffect(() => {
    if (!username) {
      setStompClient(null);
      setIsConnected(false);
      setIsReconnecting(false);
      setOnlineUsers([]);
      setPendingChallenges([]);
      setSessionId(null);
      return;
    }

    const me = username;

    const onChallengeMessage = (data: any) => {
      const { notification: n, router: r } = handlersRef.current;
      const accept = (challenger: string) =>
        publish("/app/challenge.accept", challenger);
      const reject = (challenger: string) =>
        publish("/app/challenge.reject", challenger);

      switch (data.type) {
        case "CHALLENGE_RECEIVED":
          n.showChallengeDialog(data.challenger, accept, reject, data.timeoutMs);
          break;

        case "CHALLENGE_SENT":
          setPendingChallenges((prev) =>
            prev.includes(data.target) ? prev : [...prev, data.target]
          );
          n.showNotification({
            severity: "info",
            summary: "Đã gửi lời mời",
            detail: `Đang chờ ${data.target} phản hồi trong ${Math.round(
              (data.timeoutMs ?? 8000) / 1000
            )} giây.`,
            life: data.timeoutMs ?? 8000,
            action: {
              label: "Huỷ lời mời",
              onClick: () => cancelChallenge(data.target),
            },
          });
          break;

        case "CHALLENGE_ERROR":
          n.showNotification({
            severity: "error",
            summary: "Không thể thách đấu",
            detail: data.message,
          });
          break;

        case "CHALLENGE_REJECTED":
          if (data.challenger === me) {
            // Mình là người mời
            setPendingChallenges((prev) => prev.filter((u) => u !== data.target));
            const summary =
              data.reason === "EXPIRED"
                ? "Lời mời đã hết hạn"
                : data.reason === "BUSY"
                ? "Không thể thách đấu"
                : "Lời mời bị từ chối";
            n.showNotification({
              severity: "warn",
              summary,
              detail: data.message,
            });
          } else {
            // Mình là người được mời
            n.dismissChallengeDialog(data.challenger);
            if (data.reason === "EXPIRED") {
              n.showNotification({
                severity: "info",
                summary: "Lời mời đã hết hạn",
                detail: data.message,
              });
            }
          }
          break;

        case "CHALLENGE_CANCELLED":
          if (data.challenger === me) {
            setPendingChallenges((prev) => prev.filter((u) => u !== data.target));
          } else {
            n.dismissChallengeDialog(data.challenger);
            n.showNotification({
              severity: "info",
              summary: "Lời mời đã bị huỷ",
              detail: `${data.challenger} đã huỷ lời mời thách đấu.`,
            });
          }
          break;

        case "CHALLENGE_ACCEPTED": {
          setPendingChallenges([]);
          const isChallenger = data.challengerUsername === me;
          n.showNotification({
            severity: "success",
            summary: "Bắt đầu trận đấu",
            detail: isChallenger
              ? `${data.accepterUsername} đã chấp nhận lời mời của bạn.`
              : `Bạn đã chấp nhận lời mời của ${data.challengerUsername}.`,
          });
          r.push(`/game-board?matchId=${data.matchId}`);
          break;
        }

        default:
          break;
      }
    };

    const client = new Client({
      brokerURL: `${WS_BASE_URL}?username=${encodeURIComponent(me)}`,
      connectHeaders: { username: me },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        clientRef.current = client;
        setStompClient(client);
        setIsConnected(true);
        setIsReconnecting(false);

        client.subscribe(`/queue/session-${me}`, (message) => {
          setSessionId(message.body);
        });
        client.subscribe("/topic/users.online", (message) => {
          setOnlineUsers(JSON.parse(message.body));
        });
        client.subscribe(`/user/${me}/queue/challenge`, (message) => {
          onChallengeMessage(JSON.parse(message.body));
        });
        client.subscribe(`/user/${me}/queue/game.error`, (message) => {
          const data = JSON.parse(message.body);
          handlersRef.current.notification.showNotification({
            severity: "error",
            summary: "Nước đi không hợp lệ",
            detail: data.message,
          });
        });

        client.publish({ destination: "/app/user.connect", body: me });
      },
      onWebSocketClose: () => {
        // Đang tự kết nối lại (reconnectDelay); danh sách online sẽ được gửi lại khi kết nối xong
        setIsConnected(false);
        setIsReconnecting(true);
        setOnlineUsers([]);
      },
      onStompError: (frame) => {
        handlersRef.current.notification.showNotification({
          severity: "error",
          summary: "Lỗi kết nối",
          detail: frame.headers["message"] || "Kết nối tới máy chủ bị lỗi.",
        });
      },
    });

    client.activate();

    return () => {
      clientRef.current = null;
      client.deactivate();
      setStompClient(null);
      setIsConnected(false);
      setIsReconnecting(false);
    };
  }, [username, publish, cancelChallenge]);

  return (
    <WebSocketContext.Provider
      value={{
        stompClient,
        onlineUsers,
        isConnected,
        isReconnecting,
        sessionId,
        setOnlineUsers,
        pendingChallenges,
        sendChallenge,
        cancelChallenge,
      }}
    >
      {children}
      {isReconnecting && (
        <div className="fixed bottom-4 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-amber-600 px-4 py-2 text-sm text-white shadow-lg">
          Đang kết nối lại…
        </div>
      )}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
