"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronLeft, TrendingUp, TrendingDown, Minus } from "lucide-react"
import Link from "next/link"
import { useMatchHistory, type MatchHistoryType } from "@/lib/api/hooks/use-match-history"
import { useAuth } from "@/lib/api/context/AuthContext"

export default function MatchHistoryPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<MatchHistoryType>("recent")
  const { data: matches, isLoading, error } = useMatchHistory(user?.username ?? null, activeTab)

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-amber-50 to-amber-100">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <p className="text-lg text-amber-800">Vui lòng đăng nhập để xem lịch sử đấu</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-amber-50 to-amber-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-amber-50 to-amber-100">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <p className="text-red-500">Có lỗi xảy ra: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="mr-2">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-amber-800">Lịch sử đấu</h1>
        </div>

        <Tabs
          defaultValue="recent"
          className="w-full"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as MatchHistoryType)}
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="recent">Gần đây</TabsTrigger>
            <TabsTrigger value="opponent-rank">Đối thủ rank cao</TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="mt-0">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Trận đấu gần đây</CardTitle>
              </CardHeader>
              <CardContent>
                {matches.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">Chưa có lịch sử đấu nào</div>
                ) : (
                  <div className="space-y-3">
                    {matches.map((match) => (
                      <div
                        key={match.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-100 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 flex justify-center">
                            {match.result === "WIN" ? (
                              <TrendingUp className="h-5 w-5 text-green-500" />
                            ) : match.result === "LOSE" ? (
                              <TrendingDown className="h-5 w-5 text-red-500" />
                            ) : (
                              <Minus className="h-5 w-5 text-yellow-500" />
                            )}
                          </div>
                          <Avatar className="h-10 w-10 border border-amber-300">
                            <AvatarImage src="/placeholder.svg" alt={match.opponent.username} />
                            <AvatarFallback className="bg-amber-100 text-amber-800">
                              {match.opponent.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {match.result === "WIN" ? "Thắng" : match.result === "LOSE" ? "Thua" : "Hòa"}
                            </p>
                            <p className="text-xs text-gray-500">
                              vs {match.opponent.username}
                              {typeof match.opponent.elo === "number" && (
                                <span className="ml-2">ELO: {match.opponent.elo}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span
                            className={`font-bold ${
                              match.eloChange > 0
                                ? "text-green-500"
                                : match.eloChange < 0
                                  ? "text-red-500"
                                  : "text-gray-500"
                            }`}
                          >
                            {match.eloChange > 0 ? "+" : ""}
                            {match.eloChange}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="opponent-rank" className="mt-0">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Đối thủ rank cao</CardTitle>
              </CardHeader>
              <CardContent>
                {matches.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">Chưa có lịch sử đấu nào</div>
                ) : (
                  <div className="space-y-3">
                    {matches.map((match) => (
                      <div
                        key={match.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-100 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 flex justify-center">
                            {match.result === "WIN" ? (
                              <TrendingUp className="h-5 w-5 text-green-500" />
                            ) : match.result === "LOSE" ? (
                              <TrendingDown className="h-5 w-5 text-red-500" />
                            ) : (
                              <Minus className="h-5 w-5 text-yellow-500" />
                            )}
                          </div>
                          <Avatar className="h-10 w-10 border border-amber-300">
                            <AvatarImage src="/placeholder.svg" alt={match.opponent.username} />
                            <AvatarFallback className="bg-amber-100 text-amber-800">
                              {match.opponent.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {match.result === "WIN" ? "Thắng" : match.result === "LOSE" ? "Thua" : "Hòa"}
                            </p>
                            <p className="text-xs text-gray-500">
                              vs {match.opponent.username}
                              {typeof match.opponent.elo === "number" && (
                                <span className="ml-2">ELO: {match.opponent.elo}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span
                            className={`font-bold ${
                              match.eloChange > 0
                                ? "text-green-500"
                                : match.eloChange < 0
                                  ? "text-red-500"
                                  : "text-gray-500"
                            }`}
                          >
                            {match.eloChange > 0 ? "+" : ""}
                            {match.eloChange}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
