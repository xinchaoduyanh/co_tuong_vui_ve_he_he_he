"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/api/services/auth-service";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <AuthShell title="Đăng ký" subtitle="Tạo tài khoản để bắt đầu tính điểm Elo.">
      <form onSubmit={handleRegister} className="flex flex-col gap-5" noValidate>
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
            autoComplete="new-password"
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
          {isLoading ? "Đang tạo tài khoản…" : "Đăng ký"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Đăng nhập
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
