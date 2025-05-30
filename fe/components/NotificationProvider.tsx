"use client";
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { Toast } from "primereact/toast";

interface Notification {
  severity: "success" | "info" | "warn" | "error";
  summary: string;
  detail: string;
  life?: number;
}

interface ChallengeState {
  id: string;
  challenger: string;
  onAccept: (challenger: string) => void;
  onReject: (challenger: string) => void;
}

interface NotificationContextType {
  showNotification: (notification: Notification) => void;
  showChallengeDialog: (
    challenger: string,
    onAccept: (challenger: string) => void,
    onReject: (challenger: string) => void
  ) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const NotificationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const toast = useRef<Toast>(null);
  const [challengeToasts, setChallengeToasts] = useState<ChallengeState[]>([]);

  const showNotification = useCallback((notification: Notification) => {
    if (toast.current) {
      toast.current.show({
        severity: notification.severity,
        summary: notification.summary,
        detail: notification.detail,
        life: notification.life || 3000,
      });
    }
  }, []);

  // Callback này sẽ được WebSocketProvider truyền vào khi cần
  const showChallengeDialog = useCallback(
    (
      challenger: string,
      onAccept: (challenger: string) => void,
      onReject: (challenger: string) => void
    ) => {
      setChallengeToasts((prev) => {
        if (prev.some((c) => c.challenger === challenger)) return prev;
        return [
          ...prev,
          {
            id: `${challenger}-${Date.now()}-${Math.random()}`,
            challenger,
            onAccept,
            onReject,
          },
        ];
      });
    },
    []
  );

  const handleAccept = (id: string, challenger: string) => {
    const toast = challengeToasts.find((c) => c.id === id);
    if (toast && toast.onAccept) toast.onAccept(challenger);
    setChallengeToasts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleReject = (id: string, challenger: string) => {
    const toast = challengeToasts.find((c) => c.id === id);
    if (toast && toast.onReject) toast.onReject(challenger);
    setChallengeToasts((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showChallengeDialog,
      }}
    >
      <Toast ref={toast} position="top-right" />
      {children}
      {/* Challenge Toasts */}
      <div className="fixed top-4 right-4 z-[1000] flex flex-col gap-3 items-end">
        {challengeToasts.map((challenge) => (
          <div
            key={challenge.id}
            className="bg-white border border-blue-200 shadow-lg rounded-lg px-6 py-4 min-w-[320px] max-w-xs flex flex-col animate-fade-in"
          >
            <div className="font-bold text-blue-700 mb-1">
              Lời mời chơi game
            </div>
            <div className="mb-3">
              {challenge.challenger} muốn thách đấu với bạn!
            </div>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={() => handleAccept(challenge.id, challenge.challenger)}
              >
                Chấp nhận
              </button>
              <button
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                onClick={() => handleReject(challenge.id, challenge.challenger)}
              >
                Từ chối
              </button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};
