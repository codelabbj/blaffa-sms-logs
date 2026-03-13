"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ProtectedRoute } from "@/components/protected-route"
import { cn } from "@/lib/utils"
import { fetchUniqueSenders, type UniqueSender } from "@/lib/api"
import { fetchUniquePackages, type UniquePackage } from "@/lib/fcm-api"
import { fetchPinnedSenders, type PinnedSendersResponse, type PinnedSender } from "@/lib/pin-api"
import { Users, Pin, ChevronRight, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function HomePage() {
  const router = useRouter()
  const { logout } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")

  const { data: senders, isLoading: sendersLoading } = useSWR<UniqueSender[]>(
    "senders",
    fetchUniqueSenders,
    { refreshInterval: 60000 }
  )

  const { data: wavePackages, isLoading: wavePackagesLoading } = useSWR<UniquePackage[]>(
    "wave-packages",
    fetchUniquePackages,
    { refreshInterval: 60000 }
  )

  const { data: pinnedSendersData } = useSWR<PinnedSendersResponse>(
    "pinned-senders",
    fetchPinnedSenders,
    { refreshInterval: 60000 }
  )

  const pinnedSenders = new Set<string>(
    pinnedSendersData?.pinned_senders?.map((p: PinnedSender) => p.sender) || []
  )

  const getInitials = (sender: string) => {
    if (sender.startsWith("+")) return sender.slice(1, 4)
    return sender.slice(0, 2).toUpperCase()
  }

  const handleSelectConversation = (sender: string, isWave: boolean = false) => {
    router.push(`/conversation?id=${encodeURIComponent(sender)}&wave=${isWave}`)
  }

  const filteredSenders = senders?.filter((sender) =>
    sender.sender.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const sortedSenders = filteredSenders.sort((a, b) => {
    const aPinned = pinnedSenders.has(a.sender)
    const bPinned = pinnedSenders.has(b.sender)
    if (aPinned && !bPinned) return -1
    if (!aPinned && bPinned) return 1
    return 0
  })

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-muted/30">
        {/* Header - WhatsApp Style */}
        <div className="flex-shrink-0 bg-primary shadow-md">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">BS</span>
              </div>
              <h1 className="text-xl font-semibold text-white">Blaffa SMS</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-white/90 hover:text-white hover:bg-white/10"
            >
              Déconnexion
            </Button>
          </div>

          {/* Search Bar - WhatsApp Style */}
          <div className="px-4 pb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher une conversation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-10 bg-white rounded-full border-0 shadow-sm focus-visible:ring-2 focus-visible:ring-white/50"
              />
            </div>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto bg-white">
          {sendersLoading || wavePackagesLoading ? (
            <div className="p-2 space-y-1">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 bg-white">
                  <Skeleton className="h-11 w-11 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {/* Wave Packages Section */}
              {wavePackages && wavePackages.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 bg-muted/40">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Services
                    </p>
                  </div>
                  <div className="divide-y divide-border/30">
                    {wavePackages.map((pkg) => (
                      <button
                        key={`wave-${pkg.package_name}`}
                        onClick={() => handleSelectConversation("com.wave.business", true)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 active:bg-muted/50 transition-colors bg-white"
                      >
                        <Avatar className="h-11 w-11 flex-shrink-0">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-base font-semibold">
                            W
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-semibold text-foreground truncate text-[15px]">Wave Business</p>
                          <p className="text-[13px] text-muted-foreground truncate">
                            {pkg.count} message{pkg.count !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {pkg.unread_count > 0 && (
                            <Badge className="bg-primary text-white text-[11px] px-1.5 py-0.5 rounded-full min-w-[20px] h-5 flex items-center justify-center">
                              {pkg.unread_count}
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SMS Senders Section */}
              {sortedSenders.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-muted/40">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      SMS ({sortedSenders.length})
                    </p>
                  </div>
                  <div className="divide-y divide-border/30">
                    {sortedSenders.map((sender) => {
                      const isPinned = pinnedSenders.has(sender.sender)
                      return (
                        <button
                          key={sender.sender}
                          onClick={() => handleSelectConversation(sender.sender, false)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 active:bg-muted/50 transition-colors bg-white"
                        >
                          <div className="relative flex-shrink-0">
                            <Avatar className="h-11 w-11">
                              <AvatarFallback className="bg-muted text-foreground text-base font-semibold">
                                {getInitials(sender.sender)}
                              </AvatarFallback>
                            </Avatar>
                            {isPinned && (
                              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                                <Pin className="h-2 w-2 text-white fill-white" />
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-semibold text-foreground truncate text-[15px]">{sender.sender}</p>
                            <p className="text-[13px] text-muted-foreground truncate">
                              {sender.count} message{sender.count !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            {sender.unread_count > 0 && (
                              <Badge className="bg-primary text-white text-[11px] px-1.5 py-0.5 rounded-full min-w-[20px] h-5 flex items-center justify-center">
                                {sender.unread_count}
                              </Badge>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {sortedSenders.length === 0 && !wavePackages?.length && (
                <div className="py-20 text-center px-4 bg-white">
                  <Users className="h-14 w-14 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-base font-medium text-muted-foreground">
                    {searchQuery ? "Aucune conversation trouvée" : "Aucune conversation"}
                  </p>
                  <p className="text-[13px] text-muted-foreground/70 mt-1.5">
                    {searchQuery
                      ? "Essayez une autre recherche"
                      : "Les messages apparaîtront ici dès réception"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
