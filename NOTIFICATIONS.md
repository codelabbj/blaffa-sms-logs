# 🔔 Système de Notifications Global

## Vue d'ensemble

Le système de notifications global permet de détecter et notifier l'arrivée de nouveaux messages **peu importe la page** où se trouve l'utilisateur.

## Architecture

### 1. **NotificationContext** (`contexts/notification-context.tsx`)

Le contexte global qui gère:
- ✅ Polling automatique toutes les 30 secondes
- ✅ Compteur total de messages non lus
- ✅ Compteur par expéditeur
- ✅ Détection des nouveaux messages
- ✅ Son de notification automatique
- ✅ Notifications natives du navigateur
- ✅ Badge sur l'icône de l'app (si supporté)

### 2. **useNotificationSound** (`hooks/use-notification-sound.ts`)

Hook pour jouer un son de notification:
- Volume configurable
- Protection contre les sons trop fréquents (minimum 1 seconde entre chaque)
- Gestion des erreurs (autoplay bloqué par le navigateur)

### 3. **NotificationBadge** (`components/notification-badge.tsx`)

Composant réutilisable pour afficher le badge de notification.

## Fonctionnalités

### 🔊 Son de Notification

- Joue automatiquement quand de nouveaux messages arrivent
- Fonctionne **sur toutes les pages** (liste et conversation)
- Volume: 70% par défaut
- Peut être activé/désactivé via le bouton cloche

### 📱 Notifications Natives

- Demande automatiquement la permission au premier lancement
- Affiche une notification système quand de nouveaux messages arrivent
- Fonctionne même si l'app est en arrière-plan (dans le navigateur)

### 🔴 Badge sur l'Icône

- Affiche le nombre de messages non lus sur l'icône de l'app
- Utilise l'API `navigator.setAppBadge()` (Chrome/Edge sur Android)
- Se met à jour automatiquement

### 📊 Compteurs en Temps Réel

- Badge rouge sur le logo (page d'accueil)
- Compteur par conversation
- Mise à jour toutes les 30 secondes

## Utilisation

### Dans un composant

```typescript
import { useNotifications } from "@/contexts/notification-context"

function MyComponent() {
  const { 
    totalUnreadCount,      // Nombre total de messages non lus
    unreadBySender,        // Map<sender, count>
    hasNewMessages,        // true si nouveaux messages depuis dernière visite
    markAsChecked,         // Marquer comme vérifié
    refreshNotifications,  // Forcer un refresh
    isEnabled,             // Notifications activées?
    setIsEnabled          // Activer/désactiver
  } = useNotifications()

  return (
    <div>
      {totalUnreadCount > 0 && (
        <span>Vous avez {totalUnreadCount} messages non lus</span>
      )}
    </div>
  )
}
```

### Badge de notification

```typescript
import { NotificationBadge } from "@/components/notification-badge"

<div className="relative">
  <Bell />
  <NotificationBadge className="absolute -top-1 -right-1" />
</div>
```

## Configuration

### Changer la fréquence de polling

Dans `contexts/notification-context.tsx`, ligne 95:

```typescript
const interval = setInterval(() => {
  refreshNotifications()
}, 30000) // 30 secondes (30000ms)
```

### Changer le volume du son

Dans `app/page.tsx` ou `app/conversation/page.tsx`:

```typescript
const { playSound } = useNotificationSound({
  enabled: true,
  volume: 0.7, // 0 à 1 (70%)
})
```

### Ajouter un fichier audio personnalisé

1. Placez votre fichier MP3 dans `public/notification.mp3`
2. Ou spécifiez un autre chemin:

```typescript
const { playSound } = useNotificationSound({
  soundUrl: "/custom-sound.mp3"
})
```

## Fichiers Audio Recommandés

Téléchargez des sons de notification gratuits:
- [NotificationSounds.com](https://notificationsounds.com/)
- [Mixkit](https://mixkit.co/free-sound-effects/notification/)
- [Zapsplat](https://www.zapsplat.com/sound-effect-category/notifications/)

## Capacitor (App Mobile Native)

Pour les notifications push natives sur mobile, ajoutez:

```bash
npm install @capacitor/local-notifications
npx cap sync
```

Puis dans `contexts/notification-context.tsx`:

```typescript
import { LocalNotifications } from '@capacitor/local-notifications'

// Demander la permission
await LocalNotifications.requestPermissions()

// Envoyer une notification
await LocalNotifications.schedule({
  notifications: [{
    title: "Nouveau message",
    body: `Vous avez ${count} nouveau(x) message(s)`,
    id: Date.now(),
    schedule: { at: new Date(Date.now() + 1000) }
  }]
})
```

## Débogage

### Activer les logs

Les logs sont déjà activés dans la console:
- `🔔 Nouveaux messages détectés: X`
- `📊 Notifications: X non lus`
- `🔇 Son ignoré (trop rapide)`
- `⚠️ Impossible de jouer le son`

### Tester le son manuellement

```typescript
const { testSound } = useNotificationSound()
testSound() // Joue le son immédiatement
```

## Limitations

1. **Autoplay bloqué**: Les navigateurs bloquent l'autoplay audio. L'utilisateur doit interagir avec la page au moins une fois.
2. **Notifications natives**: Nécessitent la permission de l'utilisateur.
3. **Badge d'app**: Supporté uniquement sur Chrome/Edge Android.
4. **Polling**: Consomme de la batterie. Considérez WebSocket pour du temps réel.

## Améliorations Futures

- [ ] WebSocket pour notifications en temps réel
- [ ] Notifications push via Firebase Cloud Messaging
- [ ] Vibration sur mobile
- [ ] Sons différents par type de message
- [ ] Mode "Ne pas déranger"
- [ ] Historique des notifications
