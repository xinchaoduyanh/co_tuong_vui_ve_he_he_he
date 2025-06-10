"use client";
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
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
  expiresAt?: number;
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
        // Luôn tạo expiresAt mới cho mỗi toast
        const id = `${challenger}-${Date.now()}-${Math.random()}`;
        const expiresAt = Date.now() + 8000;
        setTimeout(() => {
          setChallengeToasts((toasts) => {
            const toast = toasts.find((c) => c.id === id);
            if (toast) {
              // Gọi onReject khi hết hạn
              toast.onReject(challenger);
            }
            return toasts.filter((c) => c.id !== id);
          });
        }, 8000);
        return [
          ...prev,
          {
            id,
            challenger,
            onAccept,
            onReject,
            expiresAt,
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
          <ChallengeToast
            key={challenge.id}
            challenge={challenge}
            onAccept={handleAccept}
            onReject={handleReject}
          />
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

// Thêm component con cho countdown toast
function ChallengeToast({
  challenge,
  onAccept,
  onReject,
}: {
  challenge: ChallengeState;
  onAccept: (id: string, challenger: string) => void;
  onReject: (id: string, challenger: string) => void;
}) {
  const expiresAt = challenge.expiresAt ?? Date.now();
  const [countdown, setCountdown] = React.useState(
    Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
  );
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
    }, 200);
    return () => clearInterval(interval);
  }, [expiresAt]);
  return (
    <div className="bg-white border border-blue-200 shadow-lg rounded-lg px-6 py-4 min-w-[320px] max-w-xs flex flex-col animate-fade-in">
      <div className="font-bold text-blue-700 mb-1">Lời mời chơi game</div>
      <div className="mb-3">{challenge.challenger} muốn thách đấu với bạn!</div>
      <div className="mb-2 text-right text-sm text-gray-500">
        Tự động từ chối sau: <span className="font-bold">{countdown}s</span>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          onClick={() => onAccept(challenge.id, challenge.challenger)}
        >
          Chấp nhận
        </button>
        <button
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          onClick={() => onReject(challenge.id, challenge.challenger)}
        >
          Từ chối
        </button>
      </div>
    </div>
  );
}
