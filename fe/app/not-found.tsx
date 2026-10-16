import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">
      <BrandMark size={56} />
      <h1 className="font-display text-4xl font-bold">Không tìm thấy trang</h1>
      <p className="text-muted-foreground">Đường dẫn này không có hoặc đã đổi. Quay về trang chủ để chọn lại.</p>
      <Button asChild>
        <Link href="/">Về trang chủ</Link>
      </Button>
    </div>
  );
}
