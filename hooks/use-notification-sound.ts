import { useEffect, useRef, useCallback } from "react"

interface UseNotificationSoundOptions {
  enabled?: boolean
  volume?: number // 0 à 1
  soundUrl?: string
}

export function useNotificationSound(options: UseNotificationSoundOptions = {}) {
  const {
    enabled = true,
    volume = 0.5,
    soundUrl = "/notification.mp3"
  } = options

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastPlayTimeRef = useRef<number>(0)
  const minTimeBetweenSounds = 1000 // Minimum 1 seconde entre chaque son

  // Initialiser l'audio
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio(soundUrl)
      audioRef.current.volume = volume
      
      // Précharger l'audio
      audioRef.current.load()
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [soundUrl, volume])

  // Fonction pour jouer le son
  const playSound = useCallback(() => {
    if (!enabled || !audioRef.current) return

    const now = Date.now()
    const timeSinceLastPlay = now - lastPlayTimeRef.current

    // Éviter de jouer le son trop souvent
    if (timeSinceLastPlay < minTimeBetweenSounds) {
      console.log("🔇 Son ignoré (trop rapide)")
      return
    }

    try {
      // Réinitialiser l'audio au début
      audioRef.current.currentTime = 0
      
      // Jouer le son
      const playPromise = audioRef.current.play()
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("🔔 Son de notification joué")
            lastPlayTimeRef.current = now
          })
          .catch((error) => {
            // L'erreur peut survenir si l'utilisateur n'a pas encore interagi avec la page
            console.warn("⚠️ Impossible de jouer le son:", error.message)
          })
      }
    } catch (error) {
      console.error("❌ Erreur lors de la lecture du son:", error)
    }
  }, [enabled])

  // Fonction pour tester le son
  const testSound = useCallback(() => {
    console.log("🧪 Test du son de notification")
    playSound()
  }, [playSound])

  return {
    playSound,
    testSound,
    isEnabled: enabled
  }
}
