"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { UniqueSender } from "@/lib/api"
import type { UniquePackage } from "@/lib/fcm-api"
import { Users, Pin, PinOff, Loader2 } from "lucide-react"

interface SenderSidebarProps {
  senders: UniqueSender[]
  selectedSender: string | null
  onSelectSender: (sender: string | null, waveMode?: boolean) => void
  isLoading?: boolean
  wavePackages?: UniquePackage[]
  wavePackagesLoading?: boolean
  pinnedSenders?: Set<string>
  onPinSender?: (sender: string) => void
  onUnpinSender?: (sender: string) => void
  isPinning?: boolean
}

export function SenderSidebar({
  senders,
  selectedSender,
  onSelectSender,
  isLoading,
  wavePackages = [],
  wavePackagesLoading = false,
  pinnedSenders = new Set(),
  onPinSender,
  onUnpinSender,
  isPinning = false,
}: SenderSidebarProps) {
  const getInitials = (sender: string) => {
    if (sender.startsWith("+")) return sender.slice(1, 4)
    return sender.slice(0, 2).toUpperCase()
  }

  if (isLoading) {
    return (
      <aside className="w-72 border-r border-border bg-card h-full flex flex-col min-h-0">
        <div className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Expéditeurs</span>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0 p-3 space-y-1">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-72 border-r border-border bg-card h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Expéditeurs</span>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
          {senders.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-2">
          {/* Wave Packages */}
          {((wavePackages && wavePackages.length > 0) || wavePackagesLoading) && (
            <div className="mb-2">
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Services
              </p>
              {wavePackagesLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                [...wavePackages]
                  .sort((a, b) => {
                    const timeA = new Date(a.latest_message_at || 0).getTime()
                    const timeB = new Date(b.latest_message_at || 0).getTime()
                    return timeB - timeA
                  })
                  .map((pkg) => (
                    <button
                    key={`wave-${pkg.original_package_name}`}
                    onClick={() => onSelectSender(pkg.original_package_name, true)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors text-sm",
                      selectedSender === pkg.original_package_name
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarFallback className={cn(
                        "text-xs font-semibold",
                        selectedSender === pkg.original_package_name
                          ? "bg-white/20 text-primary-foreground"
                          : "bg-emerald-100 text-emerald-700"
                      )}>
                        {pkg.package_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{pkg.package_name}</p>
                      <p className={cn(
                        "text-xs",
                        selectedSender === pkg.original_package_name ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {pkg.count} message{pkg.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {pkg.unread_count > 0 && (
                       <Badge className={cn(
                        "text-[10px] px-1.5 py-0 h-4 font-semibold",
                        selectedSender === pkg.original_package_name ? "bg-white text-primary" : "bg-primary text-primary-foreground"
                      )}>
                        {pkg.unread_count}
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* SMS Senders */}
          <div>
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              SMS
            </p>
            {[...senders]
              .sort((a, b) => {
                const aPinned = pinnedSenders.has(a.original_sender)
                const bPinned = pinnedSenders.has(b.original_sender)
                if (aPinned && !bPinned) return -1
                if (!aPinned && bPinned) return 1
                
                const timeA = new Date(a.latest_message_at || 0).getTime()
                const timeB = new Date(b.latest_message_at || 0).getTime()
                return timeB - timeA
              })
              .map((sender) => {
                const isPinned = pinnedSenders.has(sender.original_sender)
                const isSelected = selectedSender === sender.original_sender
                return (
                  <div key={sender.original_sender} className={cn(
                    "group relative flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors",
                    isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}>
                    <button
                      onClick={() => onSelectSender(sender.original_sender, false)}
                      className="flex-1 flex items-center gap-3 text-left min-w-0"
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className={cn(
                            "text-xs font-semibold",
                            isSelected
                              ? "bg-white/20 text-primary-foreground"
                              : "bg-secondary text-secondary-foreground"
                          )}>
                            {getInitials(sender.sender)}
                          </AvatarFallback>
                        </Avatar>
                        {isPinned && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          isSelected ? "text-primary-foreground" : "text-foreground"
                        )}>
                          {sender.sender}
                        </p>
                        <p className={cn(
                          "text-xs",
                          isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          {sender.count} message{sender.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {sender.unread_count > 0 && (
                        <Badge className={cn(
                          "text-[10px] px-1.5 py-0 h-4 font-semibold",
                          isSelected ? "bg-white text-primary" : "bg-primary text-primary-foreground"
                        )}>
                          {sender.unread_count}
                        </Badge>
                      )}
                    </button>

                    {onPinSender && onUnpinSender && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isPinned) onUnpinSender(sender.original_sender)
                          else onPinSender(sender.original_sender)
                        }}
                        disabled={isPinning}
                        title={isPinned ? "Désépingler" : "Épingler"}
                        className={cn(
                          "h-6 w-6 flex-shrink-0 flex items-center justify-center rounded transition-opacity",
                          "opacity-0 group-hover:opacity-100 focus:opacity-100",
                          isPinned ? "opacity-100 text-amber-500" : isSelected ? "text-primary-foreground/60 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {isPinned
                          ? <PinOff className="h-3 w-3" />
                          : <Pin className="h-3 w-3" />
                        }
                      </button>
                    )}
                  </div>
                )
              })}
          </div>

          {senders.length === 0 && !wavePackagesLoading && (
            <div className="py-12 text-center px-4">
              <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Aucun expéditeur</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Les messages apparaîtront ici dès réception.</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}