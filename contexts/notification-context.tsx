"use client"

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react"
import { fetchUniqueSenders, type UniqueSender } from "@/lib/api"
import { fetchUniquePackages, type UniquePackage } from "@/lib/fcm-api"
import { useNotificationSound } from "@/hooks/use-notification-sound"
import { useConversationTimestamps } from "@/hooks/use-conversation-timestamps"
import { useAuth } from "@/contexts/auth-context"

interface NotificationContextType {
  totalUnreadCount: number
  unreadBySender: Map<string, number>
  hasNewMessages: boolean
  markAsChecked: () => void
  refreshNotifications: () => Promise<void>
  isEnabled: boolean
  setIsEnabled: (enabled: boolean) => void
  lastNotificationSender: string | null
  clearLastNotificationSender: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [totalUnreadCount, setTotalUnreadCount] = useState(0)
  const [unreadBySender, setUnreadBySender] = useState<Map<string, number>>(new Map())
  const [hasNewMessages, setHasNewMessages] = useState(false)
  const [isEnabled, setIsEnabled] = useState(true)
  
  const previousCountRef = useRef<number>(0)
  const previousSenderCountsRef = useRef<Map<string, number>>(new Map())
  const previousPackageCountsRef = useRef<Map<string, number>>(new Map())
  const isFirstLoadRef = useRef(true)
  const isInitializedRef = useRef(false)
  const { playSound } = useNotificationSound({ enabled: isEnabled, volume: 0.7 })
  const { updateTimestamp } = useConversationTimestamps()
  const [lastNotificationSender, setLastNotificationSender] = useState<string | null>(null)
  
  // Variable pour activer/désactiver la détection de nouveaux messages
  const ENABLE_MESSAGE_DETECTION = false // Mettre à true pour activer la détection

  // Fonction pour récupérer les notifications
  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      // Récupérer les expéditeurs SMS et packages en parallèle
      const [senders, wavePackages] = await Promise.all([
        fetchUniqueSenders(),
        fetchUniquePackages().catch(() => [] as UniquePackage[])
      ])

      // Calculer le total des messages non lus
      let total = 0
      const unreadMap = new Map<string, number>()

      // SMS - Comparer le COUNT (nombre total de messages)
      senders.forEach((sender: UniqueSender) => {
        if (sender.unread_count > 0) {
          total += sender.unread_count
          unreadMap.set(sender.sender, sender.unread_count)
        }
        
        // Comparer le count (nombre total de messages) - SEULEMENT si la détection est activée
        if (ENABLE_MESSAGE_DETECTION) {
          const previousCount = previousSenderCountsRef.current.get(sender.sender) || 0
          
          if (isInitializedRef.current && sender.count > previousCount) {
            // Nouveau message détecté !
            const now = new Date().toISOString()
            updateTimestamp(sender.sender, false, now)
            console.log(`🆕 NOUVEAU MESSAGE SMS`)
            console.log(`   Sender: ${sender.sender}`)
            console.log(`   Count: ${previousCount} → ${sender.count}`)
            console.log(`   Timestamp enregistré: ${now}`)
          }
          
          // Mettre à jour le count
          previousSenderCountsRef.current.set(sender.sender, sender.count)
        }
      })

      // Services - Même logique avec count
      wavePackages.forEach((pkg: UniquePackage) => {
        if (pkg.unread_count > 0) {
          total += pkg.unread_count
          unreadMap.set(pkg.package_name, pkg.unread_count)
        }
        
        const previousCount = previousPackageCountsRef.current.get(pkg.package_name) || 0
        
        if (isInitializedRef.current && pkg.count > previousCount) {
          const now = new Date().toISOString()
          updateTimestamp(pkg.package_name, true, now)
          console.log(`🆕 NOUVEAU MESSAGE SERVICE`)
          console.log(`   Package: ${pkg.package_name}`)
          console.log(`   Count: ${previousCount} → ${pkg.count}`)
          console.log(`   Timestamp enregistré: ${now}`)
        }
        
        previousPackageCountsRef.current.set(pkg.package_name, pkg.count)
      })

      // Détecter les nouveaux messages
      const hasNew = total > previousCountRef.current

      // Ne jouer le son que si ce n'est pas le premier chargement
      if (hasNew && !isFirstLoadRef.current && isEnabled) {
        console.log(`🔔 Nouveaux messages détectés: ${total - previousCountRef.current}`)
        playSound()
        setHasNewMessages(true)

        // Trouver le sender/package qui a un nouveau message
        let newMessageSender: string | null = null
        
        // Chercher dans les SMS
        for (const sender of senders) {
          const prevUnread = previousCountRef.current > 0 ? (unreadBySender.get(sender.sender) || 0) : 0
          if (sender.unread_count > prevUnread) {
            newMessageSender = `sms-${sender.sender}`
            break
          }
        }
        
        // Si pas trouvé dans SMS, chercher dans les services
        if (!newMessageSender) {
          for (const pkg of wavePackages) {
            const prevUnread = previousCountRef.current > 0 ? (unreadBySender.get(pkg.package_name) || 0) : 0
            if (pkg.unread_count > prevUnread) {
              newMessageSender = `wave-${pkg.package_name}`
              break
            }
          }
        }
        
        if (newMessageSender) {
          setLastNotificationSender(newMessageSender)
          console.log(`🎯 Dernier message de: ${newMessageSender}`)
        }

        // Notification native si disponible
        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification("Nouveau message", {
              body: `Vous avez ${total - previousCountRef.current} nouveau(x) message(s)`,
              icon: "/placeholder-logo.png",
              badge: "/placeholder-logo.png",
              tag: "new-message",
            })
          }
        }
      }

      // Mettre à jour l'état
      setTotalUnreadCount(total)
      setUnreadBySender(unreadMap)
      previousCountRef.current = total
      
      // Marquer comme initialisé après le premier chargement
      if (isFirstLoadRef.current) {
        isFirstLoadRef.current = false
        isInitializedRef.current = true
        console.log("✅ Initialisation terminée - Détection des nouveaux messages activée")
      }

      console.log(`📊 RÉSUMÉ: ${total} messages non lus au total`)
      console.log(`📊 ${senders.length} senders SMS, ${wavePackages.length} services`)
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des notifications:", error)
    }
  }, [isAuthenticated, isEnabled, playSound, updateTimestamp])

  // Marquer comme vérifié (retire le badge "nouveau")
  const markAsChecked = useCallback(() => {
    setHasNewMessages(false)
  }, [])
  
  // Effacer l'indicateur du dernier sender
  const clearLastNotificationSender = useCallback(() => {
    setLastNotificationSender(null)
  }, [])

  // Polling automatique toutes les 30 secondes
  useEffect(() => {
    if (!isAuthenticated) return

    // Premier chargement immédiat
    refreshNotifications()

    // Polling toutes les 30 secondes
    const interval = setInterval(() => {
      refreshNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [isAuthenticated, refreshNotifications])

  // Demander la permission pour les notifications natives
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          console.log(`🔔 Permission notifications: ${permission}`)
        })
      }
    }
  }, [])

  // Mettre à jour le badge de l'app (si supporté)
  useEffect(() => {
    if (typeof navigator !== "undefined" && "setAppBadge" in navigator) {
      if (totalUnreadCount > 0) {
        (navigator as any).setAppBadge(totalUnreadCount).catch(() => {
          // Silently fail if not supported
        })
      } else {
        (navigator as any).clearAppBadge().catch(() => {
          // Silently fail if not supported
        })
      }
    }
  }, [totalUnreadCount])

  const value: NotificationContextType = {
    totalUnreadCount,
    unreadBySender,
    hasNewMessages,
    markAsChecked,
    refreshNotifications,
    isEnabled,
    setIsEnabled,
    lastNotificationSender,
    clearLastNotificationSender,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}
