"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Calendar, Users, Trophy, Clock } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/brand"
import { ListSkeleton } from "@/components/list-states"
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
        return <Badge className="bg-success/15 text-success hover:bg-success/15">Chờ đăng ký</Badge>
      case "ongoing":
        return <Badge className="bg-warning/15 text-warning hover:bg-warning/15">Đang thi đấu</Badge>
      case "completed":
        return <Badge className="bg-secondary text-muted-foreground hover:bg-secondary">Đã xong</Badge>
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-10">
        <ListSkeleton rows={4} />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:pt-10">
      <div>
        <PageHeader title="Giải đấu" backHref="/thach-dau" />

        <div className="grid gap-4 md:grid-cols-2">
          {tournaments.map((tournament) => (
            <Card
              key={tournament.id}
              className={`overflow-hidden border-l-4 ${
                tournament.status === "open"
                  ? "border-l-success"
                  : tournament.status === "ongoing"
                    ? "border-l-warning"
                    : "border-l-muted-foreground"
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
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>
                      {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{tournament.rounds} vòng đấu</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{tournament.participants} người tham gia</span>
                  </div>
                  {tournament.champion && (
                    <div className="flex items-center text-sm">
                      <Trophy className="h-4 w-4 mr-2 text-primary" />
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
                      className="w-full"
                      onClick={() => handleRegister(tournament.id)}
                    >
                      Đăng ký tham gia
                    </Button>
                  )
                ) : tournament.status === "ongoing" ? (
                  <Button className="w-full" variant="secondary">Xem giải đấu</Button>
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
