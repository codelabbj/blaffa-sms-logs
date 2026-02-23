"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Search, LogOut, Filter, Menu, X } from "lucide-react"

interface TopBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  onRefresh: () => void
  isRefreshing?: boolean
  onLogout?: () => void
  onMenuClick?: () => void
}

export function TopBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  isRefreshing,
  onLogout,
  onMenuClick,
}: TopBarProps) {
  const STATUS_OPTIONS = [
    { value: "all", label: "Tous les statuts", dot: "bg-muted-foreground/40" },
    { value: "pending", label: "En attente", dot: "bg-amber-400" },
    { value: "approved", label: "Approuvé", dot: "bg-emerald-500" },
    { value: "no_order", label: "Sans commande", dot: "bg-red-500" },
  ]

  const activeOption = STATUS_OPTIONS.find((o) => o.value === statusFilter) ?? STATUS_OPTIONS[0]

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      {/*
        ─────────────────────────────────────────────────────────
        LAYOUT
        Mobile  : two rows  (brand/actions | search+filter)
        Desktop : one row   (brand | search | filter | actions)
        ─────────────────────────────────────────────────────────
      */}

      {/* ── Single desktop row ─────────────────────────────── */}
      <div className="hidden lg:flex items-center gap-3 px-6 h-14">

        {/* Brand */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-7 h-7 brand-gradient rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs tracking-wide select-none">BS</span>
          </div>
          <span className="text-sm font-semibold text-foreground whitespace-nowrap">Blaffa SMS Logs</span>
          <span className="text-xs text-muted-foreground/60 font-normal hidden xl:block">/ Journaux SMS</span>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border mx-1 flex-shrink-0" />

        {/* Search — grows to fill space */}
        <div className="relative flex-1 min-w-0 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Rechercher un message ou un expéditeur…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-9 h-8 text-sm bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border mx-1 flex-shrink-0" />

        {/* Filter */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-40 h-8 text-sm bg-muted/50 border-border focus:ring-1 focus:ring-primary gap-2">
              <span className="flex items-center gap-2 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeOption.dot}`} />
                <span className="truncate">{activeOption.label}</span>
              </span>
            </SelectTrigger>
            <SelectContent className="text-sm">
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${opt.dot}`} />
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {statusFilter !== "all" && (
            <button
              onClick={() => onStatusFilterChange("all")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="Effacer le filtre"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border mx-1 flex-shrink-0" />

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            title={isRefreshing ? "Actualisation…" : "Actualiser"}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          {onLogout && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              title="Déconnexion"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* ── Mobile: row 1 — brand + actions ────────────────── */}
      <div className="lg:hidden flex items-center gap-2 px-4 py-2.5">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="h-8 w-8 text-muted-foreground -ml-1"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 brand-gradient rounded flex items-center justify-center">
            <span className="text-white font-bold text-[10px] select-none">BS</span>
          </div>
          <span className="text-sm font-semibold text-foreground">Blaffa SMS Logs</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 text-muted-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          {onLogout && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* ── Mobile: row 2 — search + filter ─────────────────── */}
      <div className="lg:hidden flex items-center gap-2 px-4 pb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Rechercher…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-8 text-sm bg-muted/50 border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-36 h-8 text-sm bg-muted/50 border-border shrink-0">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeOption.dot}`} />
              <span className="truncate text-xs">{activeOption.label}</span>
            </span>
          </SelectTrigger>
          <SelectContent className="text-sm">
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${opt.dot}`} />
                  {opt.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </header>
  )
}