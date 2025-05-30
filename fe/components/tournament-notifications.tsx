"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, Clock, Trophy, Users, Medal, CheckCircle2, Award } from "lucide-react"
import Link from "next/link"

// Registration Success Notification
export function RegistrationSuccessDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-green-600">Đăng ký tham gia thành công!</DialogTitle>
          <DialogDescription className="text-center">
            Bạn đã đăng ký thành công vào Giải Cờ Tướng Mùa Xuân 2023
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h3 className="font-semibold text-amber-800 mb-3">Thông tin vòng đấu</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-amber-600" />
              <span>Round 1 bắt đầu: 15/05/2023 - 09:00</span>
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-amber-600" />
              <span>Đối thủ của bạn:</span>
            </div>
            <div className="flex items-center gap-3 bg-white p-2 rounded-md">
              <Avatar className="h-10 w-10 border border-amber-300">
                <AvatarImage src="/placeholder.svg" alt="ChessKing" />
                <AvatarFallback className="bg-amber-100 text-amber-800">CK</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">ChessKing</p>
                <div className="flex items-center text-sm text-gray-500">
                  <Trophy className="h-3 w-3 mr-1 text-amber-500" />
                  <span>1720 điểm</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center">
                <Trophy className="h-4 w-4 mr-2 text-amber-600" />
                <span>Điểm hiện tại: 1250</span>
              </div>
              <div className="text-gray-500">Thứ hạng: 32/32</div>
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Link href="/giai-dau">
            <Button>Xem giải đấu</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Match Reminder Notification
export function MatchReminderDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-amber-600">Đến giờ thi đấu!</DialogTitle>
          <DialogDescription className="text-center">
            Round 1 - Giải Cờ Tướng Mùa Xuân 2023 đã bắt đầu
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex justify-center mb-3">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <p className="text-center mb-4">
            Trận đấu của bạn với <span className="font-semibold">ChessKing</span> đã sẵn sàng.
          </p>
          <div className="flex items-center justify-center gap-6 bg-white p-3 rounded-md">
            <div className="flex flex-col items-center">
              <Avatar className="h-12 w-12 border-2 border-amber-500">
                <AvatarImage src="/placeholder.svg" alt="Player1" />
                <AvatarFallback className="bg-amber-100 text-amber-800">P1</AvatarFallback>
              </Avatar>
              <p className="font-medium mt-1">Player1</p>
              <div className="flex items-center text-sm text-gray-500">
                <Trophy className="h-3 w-3 mr-1 text-amber-500" />
                <span>1250</span>
              </div>
            </div>
            <div className="text-xl font-bold text-amber-800">VS</div>
            <div className="flex flex-col items-center">
              <Avatar className="h-12 w-12 border border-gray-300">
                <AvatarImage src="/placeholder.svg" alt="ChessKing" />
                <AvatarFallback className="bg-gray-100 text-gray-800">CK</AvatarFallback>
              </Avatar>
              <p className="font-medium mt-1">ChessKing</p>
              <div className="flex items-center text-sm text-gray-500">
                <Trophy className="h-3 w-3 mr-1 text-amber-500" />
                <span>1720</span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Để sau
          </Button>
          <Link href="/tournament-game">
            <Button className="bg-amber-600 hover:bg-amber-700">Vào thi đấu ngay</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Match End Notification (Victory)
export function MatchVictoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
          <DialogTitle className="text-center text-green-600">Chiến thắng!</DialogTitle>
          <DialogDescription className="text-center">
            Bạn đã thắng Round 1 - Giải Cờ Tướng Mùa Xuân 2023
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h3 className="font-semibold text-amber-800 mb-3">Kết quả trận đấu</h3>
          <div className="flex items-center justify-center gap-6 bg-white p-3 rounded-md mb-4">
            <div className="flex flex-col items-center">
              <Avatar className="h-12 w-12 border-2 border-amber-500">
                <AvatarImage src="/placeholder.svg" alt="Player1" />
                <AvatarFallback className="bg-amber-100 text-amber-800">P1</AvatarFallback>
              </Avatar>
              <p className="font-medium mt-1">Player1</p>
              <div className="flex items-center text-sm text-green-600 font-semibold">
                <span>Thắng</span>
              </div>
            </div>
            <div className="text-xl font-bold text-amber-800">VS</div>
            <div className="flex flex-col items-center">
              <Avatar className="h-12 w-12 border border-gray-300">
                <AvatarImage src="/placeholder.svg" alt="ChessKing" />
                <AvatarFallback className="bg-gray-100 text-gray-800">CK</AvatarFallback>
              </Avatar>
              <p className="font-medium mt-1">ChessKing</p>
              <div className="flex items-center text-sm text-red-600">
                <span>Thua</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Trophy className="h-4 w-4 mr-2 text-green-600" />
                <span>Điểm nhận được: +25</span>
              </div>
              <div className="text-gray-500">Điểm mới: 1275</div>
            </div>

            <div className="border-t border-amber-200 my-3 pt-3">
              <h4 className="font-semibold text-amber-800 mb-2">Round 2</h4>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-amber-600" />
                <span>Bắt đầu: 17/05/2023 - 09:00</span>
              </div>
              <div className="flex items-center mt-2">
                <Users className="h-4 w-4 mr-2 text-amber-600" />
                <span>Đối thủ: XiangqiMaster (1900 điểm)</span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Link href="/giai-dau">
            <Button className="bg-amber-600 hover:bg-amber-700">Xem giải đấu</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Tournament End Notification
export function TournamentEndDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <Award className="h-12 w-12 text-amber-500" />
          </div>
          <DialogTitle className="text-center text-amber-600">Giải đấu kết thúc!</DialogTitle>
          <DialogDescription className="text-center">Giải Cờ Tướng Mùa Xuân 2023 đã kết thúc</DialogDescription>
        </DialogHeader>
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex justify-center mb-4">
            <div className="flex flex-col items-center">
              <div className="bg-amber-600 text-white w-16 h-16 rounded-full flex items-center justify-center mb-2">
                <Medal className="h-8 w-8" />
              </div>
              <p className="font-bold text-amber-800">Hạng 3</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Trophy className="h-4 w-4 mr-2 text-amber-600" />
                <span>Tổng điểm: 1350</span>
              </div>
              <div className="text-gray-500">+100 từ giải đấu</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                <span>Thắng: 8</span>
              </div>
              <div className="flex items-center text-red-600">
                <span>Thua: 1</span>
              </div>
            </div>

            <div className="border-t border-amber-200 my-3 pt-3">
              <h4 className="font-semibold text-amber-800 mb-2">Giải thưởng</h4>
              <div className="flex items-center">
                <Medal className="h-4 w-4 mr-2 text-amber-600" />
                <span>Huy chương Đồng</span>
              </div>
              <div className="flex items-center mt-2">
                <Trophy className="h-4 w-4 mr-2 text-amber-600" />
                <span>100 điểm thưởng</span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Link href="/">
            <Button className="bg-amber-600 hover:bg-amber-700">Về trang chủ</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
