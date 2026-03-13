"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { SmsLog } from "@/lib/api"
import type { FcmLog } from "@/lib/fcm-api"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign,
  Calendar,
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Copy,
  Check,
  Ban,
} from "lucide-react"
import { useEffect, useRef, useCallback, useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface MessageThreadProps {
  messages: (SmsLog | FcmLog)[]
  sender: string | null
  onUpdateStatus: (uid: string, status: "approved" | "no_order") => void
  isLoading?: boolean
  isUpdating?: boolean
  hasNextPage?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
  currentPage?: number
  isWaveMode?: boolean
  newMessageIds?: Set<string>
  onMarkAsRead?: (uids: string[]) => void
  restoreScrollTop?: number
  onScrollPositionChange?: (scrollTop: number) => void
}

export function MessageThread({
  messages,
  sender,
  onUpdateStatus,
  isLoading,
  isUpdating,
  hasNextPage,
  isLoadingMore,
  onLoadMore,
  currentPage,
  isWaveMode,
  newMessageIds = new Set(),
  onMarkAsRead,
  restoreScrollTop = 0,
  onScrollPositionChange,
}: MessageThreadProps) {
  const [copiedUid, setCopiedUid] = useState<string | null>(null)
  const { toast } = useToast()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastMessageCountRef = useRef<number>(0)
  const isLoadingInternalRef = useRef<boolean>(false)
  const lastRestoredRef = useRef<number | null>(null)
  const suppressLoadMoreRef = useRef<boolean>(false)

  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`expanded-messages-${sender || "default"}`)
      return saved ? new Set(JSON.parse(saved)) : new Set()
    }
    return new Set()
  })

  useEffect(() => {
    if (typeof window !== "undefined" && sender) {
      localStorage.setItem(`expanded-messages-${sender}`, JSON.stringify(Array.from(expandedMessages)))
    }
  }, [expandedMessages, sender])

  useEffect(() => {
    if (newMessageIds.size > 0 && onMarkAsRead) {
      const timer = setTimeout(() => {
        const visibleUids = messages
          .filter((msg) => newMessageIds.has(msg.uid))
          .slice(0, 5)
          .map((msg) => msg.uid)
        if (visibleUids.length > 0) onMarkAsRead(visibleUids)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [newMessageIds, messages, onMarkAsRead])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (onScrollPositionChange) onScrollPositionChange(scrollTop)
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    const aggressiveThreshold = scrollHeight * 0.7
    const canLoad = hasNextPage && !isLoadingMore && !isLoadingInternalRef.current && !suppressLoadMoreRef.current && onLoadMore
    if (canLoad && distanceFromBottom < aggressiveThreshold) {
      isLoadingInternalRef.current = true
      onLoadMore?.()
    }
  }

  useEffect(() => {
    if (!scrollContainerRef.current) return
    isLoadingInternalRef.current = false
    suppressLoadMoreRef.current = false
    if (restoreScrollTop > 0 && lastRestoredRef.current !== restoreScrollTop) {
      lastRestoredRef.current = restoreScrollTop
      suppressLoadMoreRef.current = true
      const container = scrollContainerRef.current
      requestAnimationFrame(() => {
        container.scrollTop = restoreScrollTop
        setTimeout(() => { suppressLoadMoreRef.current = false }, 500)
      })
    } else if (restoreScrollTop === 0 && messages.length > 0 && lastMessageCountRef.current === 0) {
      scrollContainerRef.current.scrollTop = 0
    }
    lastMessageCountRef.current = messages.length
  }, [sender, messages.length, restoreScrollTop])

  useEffect(() => {
    if (!isLoadingMore && isLoadingInternalRef.current) isLoadingInternalRef.current = false
  }, [isLoadingMore])

  const toggleMessageExpansion = useCallback((uid: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }, [])

  const isMessageExpanded = useCallback(
    (uid: string) => expandedMessages.has(uid),
    [expandedMessages]
  )

  const isFcmLog = (message: any): message is FcmLog => "package_name" in message
  const getMessageAmount = (message: any) => message.amount || message.extracted_data?.amount || null
  const getMessagePhone = (message: any) => (message as any).phone || (message as any).extracted_data?.phone || null
  const getMessageDate = (message: any) => (isFcmLog(message) ? message.created_at : message.received_at)
  const getMessageContent = (message: any) => (isFcmLog(message) ? message.body : message.content)
  const formatTimestamp = (ts: string) => {
    try {
      return format(new Date(ts), "d MMM yyyy, HH:mm", { locale: fr })
    } catch {
      return ts
    }
  }
  const shouldShowExpand = (message: SmsLog | FcmLog) => {
    const content = getMessageContent(message)
    return content && content.length > 300
  }

  const copyToClipboard = (text: string, uid: string) => {
    navigator.clipboard.writeText(text)
    setCopiedUid(uid)
    toast({
      variant: "success",
      description: "Numéro copié dans le presse-papier",
    })
    setTimeout(() => setCopiedUid(null), 2000)
  }

  const statusConfig: Record<string, { label: string; icon: React.ReactNode; badgeClass: string; rowClass: string }> = {
    approved: {
      label: "Approuvé",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      rowClass: "border-l-emerald-400",
    },
    no_order: {
      label: "Sans commande",
      icon: <XCircle className="h-3.5 w-3.5" />,
      badgeClass: "bg-red-50 text-red-700 border-red-200",
      rowClass: "border-l-red-400",
    },
    pending: {
      label: "En attente",
      icon: <Clock className="h-3.5 w-3.5" />,
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      rowClass: "border-l-amber-400",
    },
  }

  if (!sender)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center bg-muted/30 px-6">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Aucune conversation sélectionnée</p>
          <p className="text-xs text-muted-foreground mt-1">
            Sélectionnez un expéditeur dans la liste pour afficher ses messages.
          </p>
        </div>
      </div>
    )

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-muted/20">
      {/* Message list */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-3xl mx-auto px-3 py-3 space-y-2">
          {messages.map((message) => {
            const config = statusConfig[message.status] ?? statusConfig.pending
            const amount = getMessageAmount(message)
            const content = getMessageContent(message)
            const expanded = isMessageExpanded(message.uid)
            const isNew = newMessageIds.has(message.uid)

            return (
              <div
                key={message.uid}
                className={cn(
                  "bg-white border border-border/50 rounded-lg border-l-4 transition-shadow shadow-sm",
                  config.rowClass,
                  isNew && "ring-1 ring-primary/30"
                )}
              >
                {/* Card header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border",
                      config.badgeClass
                    )}>
                      {config.icon}
                      {message.status_display || config.label}
                    </span>
                    {isNew && (
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        Nouveau
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {getMessagePhone(message) && (
                      <button
                        onClick={() => copyToClipboard(getMessagePhone(message), message.uid)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/5 border border-primary/20 px-1.5 py-0.5 rounded hover:bg-primary/10 transition-colors"
                      >
                        {copiedUid === message.uid ? (
                          <Check className="h-2.5 w-2.5" />
                        ) : (
                          <Copy className="h-2.5 w-2.5" />
                        )}
                        {getMessagePhone(message)}
                      </button>
                    )}
                    {amount && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        <DollarSign className="h-2.5 w-2.5" />
                        {Number(amount).toLocaleString("fr-FR")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Message body */}
                <div className="px-3 py-2.5">
                  <p className={cn(
                    "text-[13px] text-foreground leading-relaxed whitespace-pre-wrap break-words",
                    shouldShowExpand(message) && !expanded && "line-clamp-4"
                  )}>
                    {content}
                  </p>
                  {shouldShowExpand(message) && (
                    <button
                      onClick={() => toggleMessageExpansion(message.uid)}
                      className="mt-1.5 flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                    >
                      {expanded ? (
                        <><ChevronUp className="h-3 w-3" /> Réduire</>
                      ) : (
                        <><ChevronDown className="h-3 w-3" /> Voir plus</>
                      )}
                    </button>
                  )}
                </div>

                {/* Timestamp */}
                <div className="px-3 pb-2">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatTimestamp(getMessageDate(message))}
                  </span>
                </div>

                {/* Card footer - Direct actions */}
                <div className="px-3 py-2 border-t border-border/40 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateStatus(message.uid, "no_order")}
                    disabled={isUpdating || message.status === "no_order"}
                    className={cn(
                      "h-7 text-[11px] gap-1 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 px-2.5",
                      message.status === "no_order" && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Ban className="h-3 w-3" />
                    Rejeter
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onUpdateStatus(message.uid, "approved")}
                    disabled={isUpdating || message.status === "approved"}
                    className={cn(
                      "h-7 text-[11px] gap-1 bg-primary hover:bg-primary/90 text-white px-2.5",
                      message.status === "approved" && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Approuver
                  </Button>
                </div>
              </div>
            )
          })}

          {isLoadingMore && (
            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-[13px]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement…
            </div>
          )}

          {!isLoadingMore && hasNextPage && (
            <p className="text-center text-[11px] text-muted-foreground py-3">
              Faites défiler pour charger plus
            </p>
          )}
        </div>
      </div>

    </div>
  )
}
