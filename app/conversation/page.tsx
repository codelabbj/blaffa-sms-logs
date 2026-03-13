"use client"

import { MessageThread } from "@/components/message-thread-v2"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/contexts/auth-context"
import {
  fetchSmsLogs,
  updateSmsStatus,
  type SmsLogsResponse,
} from "@/lib/api"
import {
  fetchFcmLogs,
  updateFcmStatus,
  type FcmLogsResponse,
} from "@/lib/fcm-api"
import { useState, useCallback, useEffect, useRef, Suspense } from "react"
import useSWR from "swr"
import { useMessagesV2 } from "@/hooks/use-messages-v2"
import { useConversationStore } from "@/hooks/use-conversation-store"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, MoreVertical } from "lucide-react"

function MessagesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const sender = searchParams.get("id")
  const isWaveMode = searchParams.get("wave") === "true"
  
  const [statusFilter, setStatusFilter] = useState("all")
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useCacheOnly, setUseCacheOnly] = useState(false)
  const [restoreScrollTop, setRestoreScrollTop] = useState(0)
  const currentScrollTopRef = useRef(0)

  const {
    messages: allMessages,
    addMessages,
    updateMessage,
    clearMessages,
    newMessageIds,
    markMessagesAsRead,
    getMessagesMap,
    getOrderArray,
    restoreState,
  } = useMessagesV2({
    onNewMessages: (newMessages) => {
      console.log(`✨ ${newMessages.length} nouveau(x) message(s) détecté(s)`)
    },
  })

  const saveConversation = useConversationStore(state => state.saveConversation)
  const loadConversation = useConversationStore(state => state.loadConversation)

  const {
    data: messagesData,
    isLoading: messagesLoading,
    mutate: mutateMessages,
  } = useSWR(
    sender ? `messages-${isWaveMode ? 'wave' : 'sms'}-${sender}-${statusFilter}` : null,
    async () => {
      if (!sender) return null
      console.log("🔄 SWR fetching page 1 for:", sender)

      if (isWaveMode) {
        return await fetchFcmLogs({
          package_name: sender,
          status: statusFilter !== "all" ? statusFilter : undefined,
          ordering: "-created_at",
          page: 1,
          page_size: 20,
        })
      } else {
        return await fetchSmsLogs({
          sender: sender,
          status: statusFilter !== "all" ? statusFilter : undefined,
          ordering: "-created_at",
          page: 1,
          page_size: 20,
        })
      }
    },
    {
      refreshInterval: currentPage === 1 && !useCacheOnly ? 60000 : 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: !useCacheOnly,
      revalidateOnMount: !useCacheOnly,
      revalidateIfStale: !useCacheOnly,
      dedupingInterval: 30000,
      onSuccess: (data: SmsLogsResponse | FcmLogsResponse | null) => {
        if (data) {
          if (currentPage === 1) {
            console.log("📥 Loading page 1:", data.results.length, "messages")
            clearMessages()
            addMessages(data.results, 'top')
          }
          setHasNextPage(!!data.next)
        }
      },
    },
  )

  const handleUpdateStatus = async (uid: string, status: "approved" | "no_order") => {
    setIsUpdating(true)
    setError(null)
    try {
      if (isWaveMode) {
        await updateFcmStatus(uid, status)
      } else {
        await updateSmsStatus(uid, status)
      }
      
      const message = allMessages.find(m => m.uid === uid)
      if (message) {
        updateMessage(uid, {
          status: status,
          status_display: status === "approved" ? "Approuvé" : "Pas de commande"
        })
      }

      mutateMessages()

      toast({
        variant: "success",
        title: status === "approved" ? "Message approuvé" : "Message rejeté",
        description: `Le statut du message a été mis à jour avec succès.`,
      })
    } catch (error) {
      console.error("Échec de la mise à jour du statut:", error)

      let errorMessage = "Erreur lors de la mise à jour du statut. Veuillez réessayer."

      if (error instanceof Error) {
        errorMessage = error.message
      }

      toast({
        variant: "destructive",
        title: "Erreur",
        description: errorMessage,
      })
      setError(errorMessage)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleLoadMore = useCallback(async () => {
    if (!hasNextPage || isLoadingMore || !sender) {
      console.log("⛔ LoadMore bloqué:", { hasNextPage, isLoadingMore, sender })
      return
    }

    console.log(`📥 Chargement page ${currentPage + 1}...`)
    setIsLoadingMore(true)
    setError(null)

    try {
      const nextPage = currentPage + 1
      let data: SmsLogsResponse | FcmLogsResponse

      if (isWaveMode) {
        data = await fetchFcmLogs({
          package_name: sender,
          status: statusFilter !== "all" ? statusFilter : undefined,
          ordering: "-created_at",
          page: nextPage,
          page_size: 20,
        })
      } else {
        data = await fetchSmsLogs({
          sender: sender,
          status: statusFilter !== "all" ? statusFilter : undefined,
          ordering: "-created_at",
          page: nextPage,
          page_size: 20,
        })
      }

      console.log(`✅ Page ${nextPage} chargée:`, data.results.length, "messages")

      addMessages(data.results, 'bottom')
      setCurrentPage(nextPage)
      setHasNextPage(!!data.next)

    } catch (error) {
      console.error("❌ Erreur chargement page:", error)
      let errorMessage = "Erreur lors du chargement des messages."
      if (error instanceof Error) {
        errorMessage = error.message
      }
      setError(errorMessage)
    } finally {
      setTimeout(() => {
        setIsLoadingMore(false)
      }, 800)
    }
  }, [hasNextPage, isLoadingMore, sender, currentPage, statusFilter, isWaveMode, addMessages])

  useEffect(() => {
    if (sender) {
      const conversationKey = `${isWaveMode ? 'wave' : 'sms'}-${sender}`
      const cached = loadConversation(conversationKey)

      if (cached) {
        console.log("✅ Conversation trouvée en cache, restauration...")
        setUseCacheOnly(true)
        restoreState(cached.messageMap, cached.orderArray)
        setCurrentPage(cached.currentPage)
        setHasNextPage(cached.hasNextPage)
        setRestoreScrollTop(cached.scrollPosition)
        currentScrollTopRef.current = cached.scrollPosition
      } else {
        console.log("❌ Pas de cache, nouvelle conversation")
        setUseCacheOnly(false)
        clearMessages()
        setCurrentPage(1)
        setHasNextPage(false)
        setRestoreScrollTop(0)
        currentScrollTopRef.current = 0
      }
    }
  }, [sender, isWaveMode])

  useEffect(() => {
    return () => {
      if (sender) {
        const conversationKey = `${isWaveMode ? 'wave' : 'sms'}-${sender}`
        const scrollPosition = currentScrollTopRef.current

        saveConversation(conversationKey, {
          messages: allMessages,
          currentPage,
          hasNextPage,
          scrollPosition,
          messageMap: getMessagesMap(),
          orderArray: getOrderArray(),
        })
      }
    }
  }, [sender, isWaveMode, allMessages, currentPage, hasNextPage])

  if (!sender) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Aucune conversation sélectionnée</p>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-muted/30">
        {/* Header - WhatsApp Style */}
        <div className="flex-shrink-0 bg-primary shadow-md">
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="p-1.5 text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0 flex items-center gap-2.5">
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarFallback className="bg-white/20 text-white text-sm font-semibold">
                  {isWaveMode ? "W" : sender?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-[15px] font-semibold text-white truncate">
                  {isWaveMode ? "Wave Business" : sender}
                </h1>
                <p className="text-[11px] text-white/80">
                  {allMessages.length} message{allMessages.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="p-1.5 text-white hover:bg-white/10">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-3 m-2 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-2 flex-1 min-w-0">
                <p className="text-xs text-red-700 break-words">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-1 text-xs text-red-600 hover:text-red-500 underline"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 min-h-0">
          <MessageThread
            key={`${isWaveMode ? 'wave' : 'sms'}-${sender}`}
            messages={allMessages}
            sender={sender}
            onUpdateStatus={handleUpdateStatus}
            isLoading={messagesLoading}
            isUpdating={isUpdating}
            hasNextPage={hasNextPage}
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
            currentPage={currentPage}
            isWaveMode={isWaveMode}
            newMessageIds={newMessageIds}
            onMarkAsRead={markMessagesAsRead}
            restoreScrollTop={restoreScrollTop}
            onScrollPositionChange={(pos) => {
              currentScrollTopRef.current = pos
            }}
          />
        </div>
      </div>
    </ProtectedRoute>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Chargement...</div>}>
      <MessagesPageContent />
    </Suspense>
  )
}
