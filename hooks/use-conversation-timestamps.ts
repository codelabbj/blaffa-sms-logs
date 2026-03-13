import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ConversationTimestamp {
  sender: string
  lastMessageDate: string
  isWaveMode: boolean
}

interface ConversationTimestampsState {
  timestamps: Map<string, ConversationTimestamp>
  updateTimestamp: (sender: string, isWaveMode: boolean, date?: string) => void
  getTimestamp: (sender: string, isWaveMode: boolean) => string | null
  clearTimestamps: () => void
}

// Fonction helper pour créer une clé unique
const getKey = (sender: string, isWaveMode: boolean) => {
  return `${isWaveMode ? 'wave' : 'sms'}-${sender}`
}

export const useConversationTimestamps = create<ConversationTimestampsState>()(
  persist(
    (set, get) => ({
      timestamps: new Map(),

      updateTimestamp: (sender: string, isWaveMode: boolean, date?: string) => {
        const key = getKey(sender, isWaveMode)
        const timestamp: ConversationTimestamp = {
          sender,
          lastMessageDate: date || new Date().toISOString(),
          isWaveMode,
        }

        set((state) => {
          const newTimestamps = new Map(state.timestamps)
          newTimestamps.set(key, timestamp)
          return { timestamps: newTimestamps }
        })

        console.log(`📅 Timestamp mis à jour: ${key} → ${timestamp.lastMessageDate}`)
      },

      getTimestamp: (sender: string, isWaveMode: boolean) => {
        const key = getKey(sender, isWaveMode)
        const timestamp = get().timestamps.get(key)
        return timestamp?.lastMessageDate || null
      },

      clearTimestamps: () => {
        set({ timestamps: new Map() })
        console.log("🧹 Timestamps cleared")
      },
    }),
    {
      name: "conversation-timestamps",
      // Convertir Map en objet pour la persistance
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          const { state } = JSON.parse(str)
          return {
            state: {
              ...state,
              timestamps: new Map(Object.entries(state.timestamps || {})),
            },
          }
        },
        setItem: (name, value) => {
          const timestamps = Object.fromEntries(value.state.timestamps)
          localStorage.setItem(
            name,
            JSON.stringify({
              state: {
                ...value.state,
                timestamps,
              },
            })
          )
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
)
