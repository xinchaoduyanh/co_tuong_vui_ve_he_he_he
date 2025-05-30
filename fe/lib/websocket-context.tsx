"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { Client } from "@stomp/stompjs";
import { toast } from "sonner";
import { useAuth } from "./api/context/AuthContext";
import { useNotification } from "@/components/NotificationProvider";

interface WebSocketContextType {
  stompClient: Client | null;
  onlineUsers: any[];
  isConnected: boolean;
  sessionId: string | null;
  setOnlineUsers: (users: any[]) => void;
  pendingChallenges: string[];
}

export const WebSocketContext = createContext<WebSocketContextType>({
  stompClient: null,
  onlineUsers: [],
  isConnected: false,
  sessionId: null,
  setOnlineUsers: () => {},
  pendingChallenges: [],
});

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasSentConnect, setHasSentConnect] = useState(false);
  const [pendingChallenges, setPendingChallenges] = useState<string[]>([]);
  const { showNotification, showChallengeDialog } = useNotification();
  const stompClientRef = useRef<Client | null>(null);

  useEffect(() => {
    stompClientRef.current = stompClient;
  }, [stompClient]);

  // Lưu sessionId vào localStorage khi nhận được
  useEffect(() => {
    if (sessionId) {
      console.log("[FE] Saving sessionId to localStorage:", sessionId);
      localStorage.setItem("websocket_session_id", sessionId);
    }
  }, [sessionId]);

  // Lấy sessionId từ localStorage khi component mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem("websocket_session_id");
    if (savedSessionId) {
      setSessionId(savedSessionId);
      console.log("[FE] Found saved sessionId:", savedSessionId);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      // Nếu không có user, reset trạng thái và disconnect socket
      if (stompClient && stompClient.active) {
        console.log("[FE] User logged out, disconnecting WebSocket...");
        stompClient.deactivate();
      }
      setStompClient(null);
      setIsConnected(false);
      setOnlineUsers([]);
      setHasSentConnect(false);
      localStorage.removeItem("websocket_session_id");
      setSessionId(null);
      return;
    }

    if (isConnecting) {
      console.log("[FE] Already connecting, skipping...");
      return;
    }

    const connectWebSocket = () => {
      setIsConnecting(true);
      console.log("[FE] Starting WebSocket connection...");

      const client = new Client({
        brokerURL: `ws://localhost:8080/ws?username=${user.username}`,
        connectHeaders: {
          username: user.username,
        },
        debug: function (str) {
          console.log("STOMP Debug:", str);
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: async (frame) => {
          const username = user.username;
          console.log("[FE] Connected to WebSocket");
          setIsConnected(true);
          setStompClient(client);
          setRetryCount(0);
          setIsConnecting(false);

          // Đăng ký lắng nghe sessionId từ backend theo username
          const sessionPromise = new Promise<string>((resolve) => {
            client.subscribe(`/queue/session-${username}`, (message) => {
              const newSessionId = message.body;
              console.log("[FE] Received sessionId:", newSessionId);
              setSessionId(newSessionId);
              localStorage.setItem("websocket_session_id", newSessionId);
              resolve(newSessionId);
            });
          });

          // Gửi thông báo kết nối để nhận danh sách người chơi online
          console.log(
            "[FE] Sending user.connect with username:",
            user.username
          );
          client.publish({
            destination: "/app/user.connect",
            body: user.username,
          });
          setHasSentConnect(true);

          // Đợi nhận sessionId trước khi tiếp tục
          const sessionId = await sessionPromise;
          console.log("[FE] Got sessionId, proceeding with setup:", sessionId);

          // Đăng ký lắng nghe danh sách người chơi online
          client.subscribe("/topic/users.online", (message) => {
            console.log("[FE] Received online users update:", message.body);
            console.log("[FE] Online users message headers:", message.headers);
            const users = JSON.parse(message.body);
            setOnlineUsers(users);
          });

          // Đăng ký lắng nghe thông báo thách đấu
          console.log(
            "[FE] Setting up challenge subscription for user:",
            user.username
          );
          console.log(
            "[FE] Subscribing to challenge queue with path:",
            `/user/${user.username}/queue/challenge`
          );

          client.subscribe(
            `/user/${user.username}/queue/challenge`,
            (message) => {
              console.log("[FE] ====== WebSocket Message Received ======");
              console.log("[FE] Message headers:", message.headers);
              console.log("[FE] Message body:", message.body);
              console.log("[FE] Current user:", user.username);
              console.log("[FE] Current sessionId:", sessionId);
              console.log("[FE] ======================================");

              const challenge = JSON.parse(message.body);
              console.log("[FE] Parsed challenge data:", challenge);

              if (challenge.type === "CHALLENGE_RECEIVED") {
                console.log("[FE] Processing CHALLENGE_RECEIVED");
                console.log("[FE] Challenge from:", challenge.from);
                console.log(
                  "[FE] Pending challenges:",
                  challenge.pendingChallenges
                );
                setPendingChallenges(challenge.pendingChallenges || []);
                showChallengeDialog(
                  challenge.from,
                  (challenger) => {
                    const client = stompClientRef.current;
                    const username = user?.username;
                    const sid = sessionId;
                    console.log("[FE] Accept challenge:", {
                      challenger,
                      username,
                      sid,
                      clientConnected: !!client?.connected,
                    });
                    if (!client || !username || !sid) {
                      console.error(
                        "[FE] Cannot accept challenge: missing required data",
                        {
                          client: !!client,
                          username: !!username,
                          sid: !!sid,
                        }
                      );
                      return;
                    }
                    client.publish({
                      destination: "/app/challenge.accept",
                      body: challenger,
                      headers: {
                        username: username,
                        sessionId: sid,
                      },
                    });
                  },
                  (challenger) => {
                    const client = stompClientRef.current;
                    const username = user?.username;
                    const sid = sessionId;
                    console.log("[FE] Reject challenge:", {
                      challenger,
                      username,
                      sid,
                      clientConnected: !!client?.connected,
                    });
                    if (!client || !username || !sid) {
                      console.error(
                        "[FE] Cannot reject challenge: missing required data",
                        {
                          client: !!client,
                          username: !!username,
                          sid: !!sid,
                        }
                      );
                      return;
                    }
                    client.publish({
                      destination: "/app/challenge.reject",
                      body: challenger,
                      headers: {
                        username: username,
                        sessionId: sid,
                      },
                    });
                  }
                );
              } else if (challenge.type === "CHALLENGE_REJECTED") {
                console.log("[FE] Challenge rejected by:", challenge.from);
                showNotification({
                  severity: "warn",
                  summary: "Lời mời bị từ chối",
                  detail:
                    challenge.message ||
                    `${challenge.from} đã từ chối lời mời của bạn`,
                  life: 3000,
                });
              } else if (challenge.type === "CHALLENGE_ACCEPTED") {
                console.log("[FE] Challenge accepted by:", challenge.from);
                setPendingChallenges([]);

                // Lưu thông tin trận đấu vào localStorage
                localStorage.setItem(
                  "matchId",
                  String(challenge.matchId || "")
                );
                localStorage.setItem(
                  "player1",
                  JSON.stringify(challenge.player1 || {})
                );
                localStorage.setItem(
                  "player2",
                  JSON.stringify(challenge.player2 || {})
                );
                localStorage.setItem(
                  "currentTurn",
                  String(challenge.currentTurn || "")
                );
                localStorage.setItem(
                  "initialBoardState",
                  String(challenge.initialBoardState || "")
                );

                // Xóa các trường cũ nếu còn
                localStorage.removeItem("player1Id");
                localStorage.removeItem("player2Id");
                localStorage.removeItem("player1Color");
                localStorage.removeItem("player2Color");

                showNotification({
                  severity: "success",
                  summary: "Lời mời được chấp nhận",
                  detail: `${challenge.from} đã chấp nhận thách đấu!`,
                  life: 3000,
                });

                // Chuyển sang màn hình bàn cờ
                window.location.href = `/game-board?matchId=${challenge.matchId}`;
              } else if (challenge.type === "ERROR") {
                console.log("[FE] Challenge error:", challenge.message);
                showNotification({
                  severity: "error",
                  summary: "Lỗi",
                  detail: challenge.message,
                  life: 3000,
                });
              }
            }
          );

          // Đăng ký lắng nghe echo
          client.subscribe("/user/queue/echo", (msg) => {
            console.log("[FE] Received echo:", msg.body);
            console.log("[FE] Echo message headers:", msg.headers);
          });
        },
        onDisconnect: () => {
          console.log("[FE] Disconnected from WebSocket");
          setIsConnected(false);
          setOnlineUsers([]);
          setIsConnecting(false);
          setHasSentConnect(false);

          // Retry connection if disconnected
          if (retryCount < 3) {
            console.log(`[FE] Retrying connection (${retryCount + 1}/3)...`);
            setRetryCount((prev) => prev + 1);
            setTimeout(connectWebSocket, 5000);
          } else {
            toast.error("Không thể kết nối đến server sau nhiều lần thử");
          }
        },
        onStompError: (frame) => {
          console.error("[FE] STOMP error:", frame);
          toast.error("Lỗi kết nối WebSocket: " + frame.headers.message);
          setIsConnected(false);
          setIsConnecting(false);
          setHasSentConnect(false);
        },
        onWebSocketError: (event) => {
          console.error("[FE] WebSocket error:", event);
          toast.error("Lỗi kết nối WebSocket");
          setIsConnected(false);
          setIsConnecting(false);
          setHasSentConnect(false);
        },
      });

      try {
        client.activate();
        console.log("[FE] WebSocket client activated");
      } catch (error) {
        console.error("[FE] Error activating WebSocket client:", error);
        toast.error("Không thể kết nối đến server");
        setIsConnecting(false);
        setHasSentConnect(false);
      }
    };

    connectWebSocket();

    return () => {
      if (stompClient?.connected) {
        stompClient.deactivate();
      }
    };
  }, [user, retryCount, showNotification]);

  useEffect(() => {
    if (!stompClient || !isConnected) return;

    const challengeSub = stompClient.subscribe(
      "/user/queue/challenges",
      (message) => {
        const data = JSON.parse(message.body);
        if (data.type === "CHALLENGE") {
          showChallengeDialog(
            data.challenger,
            (challenger) => {
              // callback accept luôn lấy context mới nhất
              const client = stompClientRef.current;
              const username = user?.username;
              const sid = sessionId;
              console.log("[FE] Accept challenge:", {
                challenger,
                username,
                sid,
                clientConnected: !!client?.connected,
              });
              if (!client || !username || !sid) return;
              client.publish({
                destination: "/app/challenge.accept",
                body: challenger,
                headers: {
                  username: username,
                  sessionId: sid,
                },
              });
            },
            (challenger) => {
              // callback reject luôn lấy context mới nhất
              const client = stompClientRef.current;
              const username = user?.username;
              const sid = sessionId;
              console.log("[FE] Reject challenge:", {
                challenger,
                username,
                sid,
                clientConnected: !!client?.connected,
              });
              if (!client || !username || !sid) return;
              client.publish({
                destination: "/app/challenge.reject",
                body: challenger,
                headers: {
                  username: username,
                  sessionId: sid,
                },
              });
            }
          );
        } else if (data.type === "CHALLENGE_REJECTED") {
          showNotification({
            severity: "warn",
            summary: "Thách đấu bị từ chối",
            detail: `${data.challenged} đã từ chối thách đấu của bạn.`,
          });
        } else if (data.type === "CHALLENGE_ACCEPTED") {
          showNotification({
            severity: "success",
            summary: "Thách đấu được chấp nhận",
            detail: `${data.challenged} đã chấp nhận thách đấu của bạn!`,
          });
        }
      }
    );

    return () => {
      challengeSub.unsubscribe();
    };
  }, [
    stompClient,
    isConnected,
    showNotification,
    showChallengeDialog,
    user,
    sessionId,
  ]);

  return (
    <WebSocketContext.Provider
      value={{
        stompClient,
        onlineUsers,
        isConnected,
        sessionId,
        setOnlineUsers,
        pendingChallenges,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
