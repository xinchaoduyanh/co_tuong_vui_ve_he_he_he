import { OnlinePlayer } from "@/lib/api/hooks/use-online-players";

export async function fetchOnlinePlayers(): Promise<OnlinePlayer[]> {
  const res = await fetch("http://localhost:8080/api/online-players");
  if (!res.ok) throw new Error("Không thể lấy danh sách online");
  return res.json();
}
