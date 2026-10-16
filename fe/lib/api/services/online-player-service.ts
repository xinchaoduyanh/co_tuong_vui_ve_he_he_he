import { API_BASE_URL } from "@/lib/api/config";
import { OnlinePlayer } from "@/lib/api/hooks/use-online-players";

export async function fetchOnlinePlayers(): Promise<OnlinePlayer[]> {
  const res = await fetch(`${API_BASE_URL}/api/online-players`);
  if (!res.ok) throw new Error("Không thể lấy danh sách online");
  return res.json();
}
