import { User } from "@/lib/types/user";
import { useWebSocket } from "@/lib/websocket-context";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export async function registerUser(data: {
  username: string;
  password: string;
}): Promise<User> {
  try {
    const res = await fetch("http://localhost:8080/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const response: ApiResponse<User> = await res.json();

    if (!response.success) {
      throw new Error(response.message);
    }

    if (!response.data) {
      throw new Error("Không nhận được dữ liệu người dùng");
    }

    // Lưu vào localStorage thay vì cookie
    localStorage.setItem("user", JSON.stringify(response.data));
    return response.data;
  } catch (error: any) {
    throw new Error(error.message || "Đăng ký thất bại");
  }
}

export async function loginUser(data: {
  username: string;
  password: string;
}): Promise<User> {
  const res = await fetch("http://localhost:8080/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const response: ApiResponse<User> = await res.json();

  if (!response.success) {
    throw new Error(response.message);
  }

  if (!response.data) {
    throw new Error("Không nhận được dữ liệu người dùng");
  }

  // Lưu user vào localStorage
  localStorage.setItem("user", JSON.stringify(response.data));
  // Thêm cookie để middleware có thể đọc
  document.cookie = `user=${JSON.stringify(response.data)}; path=/`;

  return response.data;
}
