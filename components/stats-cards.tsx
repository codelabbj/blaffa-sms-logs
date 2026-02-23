"use client"

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { SmsStats } from "@/lib/api"
import { CheckCircle2, Clock, MessageSquare, XCircle } from "lucide-react"

interface StatsCardsProps {
  stats: SmsStats | null
  isLoading?: boolean
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
            <Skeleton className="h-7 w-16 mb-2" />
            <Skeleton className="h-2.5 w-28" />
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const cards = [
    {
      title: "Total messages",
      value: stats.total,
      icon: MessageSquare,
      iconClass: "text-blue-600 bg-blue-50",
      description: "Tous les messages reçus",
    },
    {
      title: "En attente",
      value: stats.by_status.pending,
      icon: Clock,
      iconClass: "text-amber-600 bg-amber-50",
      description: "À traiter",
    },
    {
      title: "Approuvés",
      value: stats.by_status.approved,
      icon: CheckCircle2,
      iconClass: "text-emerald-600 bg-emerald-50",
      description: "Confirmés",
    },
    {
      title: "Sans commande",
      value: stats.by_status.no_order || 0,
      icon: XCircle,
      iconClass: "text-red-600 bg-red-50",
      description: "Aucune correspondance",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  {card.title}
                </p>
                <p className="text-2xl font-semibold text-foreground tabular-nums">
                  {card.value.toLocaleString("fr-FR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </div>
              <div className={`p-2 rounded-md ${card.iconClass}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}