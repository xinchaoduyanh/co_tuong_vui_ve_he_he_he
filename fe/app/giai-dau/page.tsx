"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Calendar, Users, Trophy, Clock } from "lucide-react"
import Link from "next/link"
import { RegistrationSuccessDialog, MatchReminderDialog } from "@/components/tournament-notifications"
import { useTournaments } from "@/lib/api/hooks/use-tournaments"

export default function TournamentList() {
  const [registeredTournaments, setRegisteredTournaments] = useState<number[]>([])
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false)
  const [showMatchReminder, setShowMatchReminder] = useState(false)
  const { data: tournaments, isLoading } = useTournaments()

  // Format date to display in a more readable format
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" }
    return new Date(dateString).toLocaleDateString("vi-VN", options)
  }

  // Handle tournament registration
  const handleRegister = (tournamentId: number) => {
    if (!registeredTournaments.includes(tournamentId)) {
      setRegisteredTournaments([...registeredTournaments, tournamentId])
      setShowRegistrationSuccess(true)

      // Show match reminder after 5 seconds (for demo purposes)
      setTimeout(() => {
        setShowMatchReminder(true)
      }, 5000)
    }
  }

  // Get status badge based on tournament status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-green-500 hover:bg-green-600">Chờ đăng ký</Badge>
      case "ongoing":
        return <Badge className="bg-amber-500 hover:bg-amber-600">Đang thi đấu</Badge>
      case "completed":
        return <Badge className="bg-gray-500 hover:bg-gray-600">Đã xong</Badge>
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-amber-50 to-amber-100">
        <div className="text-amber-800">Đang tải...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 p-4">
      <div className="w-full max-w-3xl">
        <div className="flex items-center mb-6">
          <Link href="/thach-dau">
            <Button variant="ghost" size="icon" className="mr-2">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-amber-800">Giải đấu</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {tournaments.map((tournament) => (
            <Card
              key={tournament.id}
              className={`overflow-hidden border-l-4 ${
                tournament.status === "open"
                  ? "border-l-green-500"
                  : tournament.status === "ongoing"
                    ? "border-l-amber-500"
                    : "border-l-gray-400"
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{tournament.name}</CardTitle>
                    <CardDescription className="mt-1">{tournament.description}</CardDescription>
                  </div>
                  {getStatusBadge(tournament.status)}
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="grid gap-2">
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <span>
                      {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{tournament.rounds} vòng đấu</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Users className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{tournament.participants} người tham gia</span>
                  </div>
                  {tournament.champion && (
                    <div className="flex items-center text-sm">
                      <Trophy className="h-4 w-4 mr-2 text-amber-500" />
                      <span>Vô địch: {tournament.champion}</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                {tournament.status === "open" ? (
                  registeredTournaments.includes(tournament.id) ? (
                    <Button className="w-full" variant="outline" disabled>
                      Đã đăng ký
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => handleRegister(tournament.id)}
                    >
                      Đăng ký tham gia
                    </Button>
                  )
                ) : tournament.status === "ongoing" ? (
                  <Button className="w-full bg-amber-600 hover:bg-amber-700">Xem giải đấu</Button>
                ) : (
                  <Button className="w-full" variant="outline">
                    Xem kết quả
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Registration Success Dialog */}
      <RegistrationSuccessDialog open={showRegistrationSuccess} onOpenChange={setShowRegistrationSuccess} />

      {/* Match Reminder Dialog */}
      <MatchReminderDialog open={showMatchReminder} onOpenChange={setShowMatchReminder} />
    </div>
  )
}
