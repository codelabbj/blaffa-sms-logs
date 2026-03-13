"use client"

import { useNotifications } from "@/contexts/notification-context"
import { cn } from "@/lib/utils"

interface NotificationBadgeProps {
  className?: string
  showZero?: boolean
}

export function NotificationBadge({ className, showZero = false }: NotificationBadgeProps) {
  const { totalUnreadCount } = useNotifications()

  if (totalUnreadCount === 0 && !showZero) {
    return null
  }

  return (
    <span
      className={cn(
        "bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1",
        className
      )}
    >
      {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
    </span>
  )
}
