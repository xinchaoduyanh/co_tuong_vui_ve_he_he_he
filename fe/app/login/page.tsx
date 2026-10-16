"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/api/services/auth-service";
import { useAuth } from "@/lib/api/context/AuthContext";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const user = await loginUser({ username, password });
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);
      router.push("/");
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Đăng nhập thất bại");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell title="Đăng nhập" subtitle="Vào phòng cờ và tìm đối thủ.">
      <form onSubmit={handleLogin} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="username">Tên đăng nhập</Label>
          <Input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={isLoading}
            aria-invalid={!!error}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Mật khẩu</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            aria-invalid={!!error}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-primary">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={isLoading}>
          {isLoading ? "Đang đăng nhập…" : "Đăng nhập"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
            Đăng ký
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
