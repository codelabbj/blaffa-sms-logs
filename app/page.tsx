"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ProtectedRoute } from "@/components/protected-route"
import { cn } from "@/lib/utils"
import { fetchUniqueSenders, type UniqueSender } from "@/lib/api"
import { fetchUniquePackages, type UniquePackage } from "@/lib/fcm-api"
import { fetchPinnedSenders, type PinnedSendersResponse, type PinnedSender } from "@/lib/pin-api"
import { Users, Pin, ChevronRight, Search, Bell, BellOff } from "lucide-react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useNotifications } from "@/contexts/notification-context"
import { useConversationTimestamps } from "@/hooks/use-conversation-timestamps"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function HomePage() {
  const router = useRouter()
  const { logout } = useAuth()
  const { 
    totalUnreadCount, 
    hasNewMessages, 
    markAsChecked,
    isEnabled,
    setIsEnabled,
    refreshNotifications,
    lastNotificationSender,
    clearLastNotificationSender,
  } = useNotifications()
  const { getTimestamp } = useConversationTimestamps()
  const [searchQuery, setSearchQuery] = useState("")
  
  // Variable pour activer/désactiver le tri par date
  const ENABLE_DATE_SORTING = false // Mettre à true pour activer le tri par date

  // Marquer comme vérifié quand on arrive sur la page
  useEffect(() => {
    markAsChecked()
  }, [markAsChecked])

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

  const getPackageDisplayName = (packageName: string) => {
    // Mapper les noms de packages vers des noms affichables
    const displayNames: Record<string, string> = {
      "com.wave.business": "Wave Business",
      "com.whatsapp": "WhatsApp",
      "com.telegram": "Telegram",
      "com.facebook.orca": "Messenger",
      // Ajouter d'autres mappings si nécessaire
    }
    return displayNames[packageName] || packageName
  }

  const getPackageInitials = (packageName: string) => {
    const displayName = getPackageDisplayName(packageName)
    return displayName.slice(0, 1).toUpperCase()
  }

  const getPackageColor = (packageName: string) => {
    // Couleurs par package
    const colors: Record<string, string> = {
      "com.wave.business": "bg-emerald-100 text-emerald-700",
      "com.whatsapp": "bg-green-100 text-green-700",
      "com.telegram": "bg-blue-100 text-blue-700",
      "com.facebook.orca": "bg-purple-100 text-purple-700",
    }
    return colors[packageName] || "bg-gray-100 text-gray-700"
  }

  const handleSelectConversation = (sender: string, isWave: boolean = false) => {
    // Effacer l'indicateur si c'est le sender qui a notifié
    const senderKey = isWave ? `wave-${sender}` : `sms-${sender}`
    if (lastNotificationSender === senderKey) {
      clearLastNotificationSender()
    }
    router.push(`/conversation?id=${encodeURIComponent(sender)}&wave=${isWave}`)
  }

  const filteredSenders = senders?.filter((sender) =>
    sender.sender.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  // Tri intelligent: Épinglés > Non lus > Date du dernier message (cache local) > Nombre de non lus
  const sortedSenders = filteredSenders.sort((a, b) => {
    const aPinned = pinnedSenders.has(a.sender)
    const bPinned = pinnedSenders.has(b.sender)
    
    // 1. Les épinglés en premier
    if (aPinned && !bPinned) return -1
    if (!aPinned && bPinned) return 1
    
    // 2. Les non lus avant les lus
    if (a.unread_count > 0 && b.unread_count === 0) return -1
    if (a.unread_count === 0 && b.unread_count > 0) return 1
    
    // Si le tri par date est désactivé, on s'arrête ici
    if (!ENABLE_DATE_SORTING) {
      // Tri simple par nombre de non lus, puis par count
      if (a.unread_count !== b.unread_count) {
        return b.unread_count - a.unread_count
      }
      return b.count - a.count
    }
    
    // 3. Tri par date du dernier message (API ou cache local)
    const aDate = a.last_message_date || getTimestamp(a.sender, false)
    const bDate = b.last_message_date || getTimestamp(b.sender, false)
    
    if (aDate && bDate) {
      return new Date(bDate).getTime() - new Date(aDate).getTime()
    }
    
    // Si un seul a une date, il passe en premier
    if (aDate && !bDate) return -1
    if (!aDate && bDate) return 1
    
    // 4. Si pas de date mais les deux ont des non lus, celui avec plus de non lus en premier
    if (a.unread_count > 0 && b.unread_count > 0) {
      return b.unread_count - a.unread_count
    }
    
    // 5. Fallback: tri par nombre total de messages
    return b.count - a.count
  })
  
  // LOG: Afficher les 10 premiers senders triés (seulement en dev)
  if (process.env.NODE_ENV === 'development') {
    console.log(`📋 TRI SMS - Top 10 (Date sorting: ${ENABLE_DATE_SORTING ? 'ON' : 'OFF'}):`)
    sortedSenders.slice(0, 10).forEach((sender, index) => {
      const timestamp = getTimestamp(sender.sender, false)
      console.log(`  ${index + 1}. ${sender.sender}`)
      console.log(`     - unread: ${sender.unread_count}, count: ${sender.count}`)
      if (ENABLE_DATE_SORTING) {
        console.log(`     - timestamp: ${timestamp || "AUCUN"}`)
      }
      console.log(`     - pinned: ${pinnedSenders.has(sender.sender)}`)
    })
  }
  
  // Tri des packages Wave avec le même système
  const sortedWavePackages = wavePackages?.sort((a, b) => {
    // 1. Non lus avant lus
    if (a.unread_count > 0 && b.unread_count === 0) return -1
    if (a.unread_count === 0 && b.unread_count > 0) return 1
    
    // Si le tri par date est désactivé, on s'arrête ici
    if (!ENABLE_DATE_SORTING) {
      // Tri simple par nombre de non lus, puis par count
      if (a.unread_count !== b.unread_count) {
        return b.unread_count - a.unread_count
      }
      return b.count - a.count
    }
    
    // 2. Tri par date (API ou cache local)
    const aDate = a.last_message_date || getTimestamp(a.package_name, true)
    const bDate = b.last_message_date || getTimestamp(b.package_name, true)
    
    if (aDate && bDate) {
      return new Date(bDate).getTime() - new Date(aDate).getTime()
    }
    
    if (aDate && !bDate) return -1
    if (!aDate && bDate) return 1
    
    // 3. Fallback: plus de non lus
    if (a.unread_count > 0 && b.unread_count > 0) {
      return b.unread_count - a.unread_count
    }
    
    // 4. Fallback final: nombre total
    return b.count - a.count
  }) || []
  
  // LOG: Afficher les services triés (seulement en dev)
  if (process.env.NODE_ENV === 'development') {
    console.log(`📋 TRI SERVICES (Date sorting: ${ENABLE_DATE_SORTING ? 'ON' : 'OFF'}):`)
    sortedWavePackages.forEach((pkg, index) => {
      const timestamp = getTimestamp(pkg.package_name, true)
      console.log(`  ${index + 1}. ${getPackageDisplayName(pkg.package_name)}`)
      console.log(`     - unread: ${pkg.unread_count}, count: ${pkg.count}`)
      if (ENABLE_DATE_SORTING) {
        console.log(`     - timestamp: ${timestamp || "AUCUN"}`)
      }
    })
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-muted/30">
        {/* Header - WhatsApp Style */}
        <div className="flex-shrink-0 bg-primary shadow-md">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center relative">
                <span className="text-white font-bold text-sm">BS</span>
                {totalUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 border-2 border-primary">
                    {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-semibold text-white">Blaffa SMS</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEnabled(!isEnabled)}
                className="text-white/90 hover:text-white hover:bg-white/10 p-2"
                title={isEnabled ? "Désactiver les notifications" : "Activer les notifications"}
              >
                {isEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-white/90 hover:text-white hover:bg-white/10"
              >
                Déconnexion
              </Button>
            </div>
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
              {sortedWavePackages && sortedWavePackages.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 bg-muted/40">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Services
                    </p>
                  </div>
                  <div className="divide-y divide-border/30">
                    {sortedWavePackages.map((pkg) => (
                      <button
                        key={`service-${pkg.package_name}`}
                        onClick={() => handleSelectConversation(pkg.package_name, true)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 active:bg-muted/50 transition-colors bg-white relative",
                          lastNotificationSender === `wave-${pkg.package_name}` && "bg-green-50 border-l-4 border-green-500"
                        )}
                      >
                        <Avatar className="h-11 w-11 flex-shrink-0">
                          <AvatarFallback className={cn("text-base font-semibold", getPackageColor(pkg.package_name))}>
                            {getPackageInitials(pkg.package_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-semibold text-foreground truncate text-[15px]">
                            {getPackageDisplayName(pkg.package_name)}
                          </p>
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
                        {lastNotificationSender === `wave-${pkg.package_name}` && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <span className="flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                          </div>
                        )}
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
                      const isLastNotification = lastNotificationSender === `sms-${sender.sender}`
                      return (
                        <button
                          key={sender.sender}
                          onClick={() => handleSelectConversation(sender.sender, false)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 active:bg-muted/50 transition-colors bg-white relative",
                            isLastNotification && "bg-green-50 border-l-4 border-green-500"
                          )}
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
                          {isLastNotification && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                              <span className="flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                              </span>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {sortedSenders.length === 0 && !sortedWavePackages?.length && (
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
