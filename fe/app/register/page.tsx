"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/api/services/auth-service";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await registerUser({ username, password });
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Đăng ký thất bại");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-amber-50">
      <form
        onSubmit={handleRegister}
        className="bg-white p-8 rounded shadow-md w-80"
      >
        <h2 className="text-2xl font-bold mb-4 text-center">Đăng ký</h2>
        <input
          className="w-full p-2 mb-3 border rounded"
          placeholder="Tên đăng nhập"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={isLoading}
        />
        <input
          className="w-full p-2 mb-3 border rounded"
          placeholder="Mật khẩu"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />
        {error && (
          <div className="text-red-500 mb-2 p-2 bg-red-50 rounded border border-red-200">
            {error}
          </div>
        )}
        <button
          className={`w-full py-2 rounded text-white ${
            isLoading ? "bg-gray-400" : "bg-amber-600 hover:bg-amber-700"
          }`}
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Đang xử lý..." : "Đăng ký"}
        </button>
        <div className="mt-4 text-center">
          Đã có tài khoản?{" "}
          <a href="/login" className="text-amber-600 underline">
            Đăng nhập
          </a>
        </div>
      </form>
    </div>
  );
}
