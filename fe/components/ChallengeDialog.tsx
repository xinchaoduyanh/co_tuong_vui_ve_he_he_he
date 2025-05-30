import React from "react";

interface ChallengeDialogProps {
  open: boolean;
  challenger: string;
  onAccept: () => void;
  onReject: () => void;
}

const ChallengeDialog: React.FC<ChallengeDialogProps> = ({
  open,
  challenger,
  onAccept,
  onReject,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px]">
        <h2 className="text-lg font-bold mb-2 text-blue-700">
          Lời mời chơi game
        </h2>
        <p className="mb-4">{challenger} muốn thách đấu với bạn!</p>
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            onClick={onAccept}
          >
            Chấp nhận
          </button>
          <button
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={onReject}
          >
            Từ chối
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChallengeDialog;
