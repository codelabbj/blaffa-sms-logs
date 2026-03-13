"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ProtectedRoute } from "@/components/protected-route"
import { cn } from "@/lib/utils"
import { fetchUniqueSenders, type UniqueSender } from "@/lib/api"
import { fetchUniquePackages, type UniquePackage } from "@/lib/fcm-api"
import { fetchPinnedSenders, type PinnedSendersResponse, type PinnedSender } from "@/lib/pin-api"
import { Users, Pin, ChevronRight, Search, Menu } from "lucide-react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ConversationsPage() {
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
    router.push(`/messages?sender=${encodeURIComponent(sender)}&wave=${isWave}`)
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
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 brand-gradient rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xs">BS</span>
              </div>
              <h1 className="text-lg font-semibold text-foreground">Conversations</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-muted-foreground hover:text-foreground"
            >
              Déconnexion
            </Button>
          </div>

          {/* Search Bar */}
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher une conversation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {sendersLoading || wavePackagesLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Wave Packages */}
              {wavePackages && wavePackages.length > 0 && (
                <div className="bg-muted/30">
                  <div className="px-4 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Services
                    </p>
                  </div>
                  {wavePackages.map((pkg) => (
                    <button
                      key={`wave-${pkg.package_name}`}
                      onClick={() => handleSelectConversation("com.wave.business", true)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors"
                    >
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold">
                          W
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-medium text-foreground truncate">Wave Business</p>
                        <p className="text-sm text-muted-foreground">
                          {pkg.count} message{pkg.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {pkg.unread_count > 0 && (
                          <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5">
                            {pkg.unread_count}
                          </Badge>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* SMS Senders */}
              <div>
                <div className="px-4 py-2 bg-muted/30">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    SMS ({sortedSenders.length})
                  </p>
                </div>
                {sortedSenders.map((sender) => {
                  const isPinned = pinnedSenders.has(sender.sender)
                  return (
                    <button
                      key={sender.sender}
                      onClick={() => handleSelectConversation(sender.sender, false)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors"
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-semibold">
                            {getInitials(sender.sender)}
                          </AvatarFallback>
                        </Avatar>
                        {isPinned && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-background flex items-center justify-center">
                            <Pin className="h-2 w-2 text-white" />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-medium text-foreground truncate">{sender.sender}</p>
                        <p className="text-sm text-muted-foreground">
                          {sender.count} message{sender.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {sender.unread_count > 0 && (
                          <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5">
                            {sender.unread_count}
                          </Badge>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Empty State */}
              {sortedSenders.length === 0 && !wavePackages?.length && (
                <div className="py-16 text-center px-4">
                  <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-base font-medium text-muted-foreground">
                    {searchQuery ? "Aucune conversation trouvée" : "Aucune conversation"}
                  </p>
                  <p className="text-sm text-muted-foreground/60 mt-2">
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
