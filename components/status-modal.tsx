"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import type { SmsLog } from "@/lib/api"
import type { FcmLog } from "@/lib/fcm-api"

interface StatusModalProps {
  isOpen: boolean
  onClose: () => void
  message: (SmsLog | FcmLog) | null
  onStatusChange: (uid: string, status: "approved" | "no_order") => void
  isUpdating?: boolean
}

export function StatusModal({ isOpen, onClose, message, onStatusChange, isUpdating }: StatusModalProps) {
  if (!message || !isOpen) return null

  const handleStatusSelect = (status: "approved" | "no_order") => {
    onStatusChange(message.uid, status)
    onClose()
  }

  const content = "body" in message ? message.body : message.content

  const options = [
    {
      status: "approved" as const,
      label: "Marquer comme approuvé",
      description: "La transaction a été vérifiée et validée.",
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
      className: "hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-950/30",
      labelClass: "text-emerald-700",
    },
    {
      status: "no_order" as const,
      label: "Sans commande associée",
      description: "Aucune commande correspondante n'a été trouvée.",
      icon: <AlertCircle className="h-4 w-4 text-red-600" />,
      className: "hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950/30",
      labelClass: "text-red-700",
    },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card border border-border rounded-lg shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Mettre à jour le statut</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Sélectionnez le nouveau statut pour ce message.</p>
        </div>

        {/* Message preview */}
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Aperçu du message
          </p>
          <p className="text-xs text-foreground font-mono leading-relaxed line-clamp-4 break-words">
            {content}
          </p>
          {(message as any).extracted_data?.amount && (
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              {Number((message as any).extracted_data.amount).toLocaleString("fr-FR")} FCFA
            </span>
          )}
        </div>

        {/* Options */}
        <div className="px-5 py-4 space-y-2">
          {options.map((opt) => (
            <button
              key={opt.status}
              onClick={() => handleStatusSelect(opt.status)}
              disabled={isUpdating}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-md border border-border text-left transition-colors",
                opt.className
              )}
            >
              <div className="mt-0.5 flex-shrink-0">{opt.icon}</div>
              <div>
                <p className={cn("text-sm font-medium", opt.labelClass)}>{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isUpdating}
            className="text-xs text-muted-foreground"
          >
            Annuler
          </Button>
        </div>
      </div>
    </div>
  )
}
