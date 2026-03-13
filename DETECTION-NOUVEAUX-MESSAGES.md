# 🔍 Détection des Nouveaux Messages - Explication Complète

## Vue d'Ensemble

Il existe **2 systèmes de détection** qui fonctionnent en parallèle:

1. **Système Global** (NotificationContext) - Détecte pour TOUTES les conversations
2. **Système Local** (Page Conversation) - Détecte pour la conversation ACTIVE

---

## 1️⃣ Système Global - NotificationContext

### 📍 Localisation
`contexts/notification-context.tsx`

### ⏱️ Fréquence
**Toutes les 30 secondes** (polling)

### 🎯 Objectif
- Détecter les nouveaux messages de **toutes** les conversations
- Mettre à jour les badges de compteur
- Jouer le son de notification
- Mettre à jour les timestamps

### 🔄 Fonctionnement

```typescript
// Polling automatique
useEffect(() => {
  if (!isAuthenticated) return

  // Premier chargement immédiat
  refreshNotifications()

  // Polling toutes les 30 secondes
  const interval = setInterval(() => {
    refreshNotifications()
  }, 30000) // ← 30 000 ms = 30 secondes

  return () => clearInterval(interval)
}, [isAuthenticated, refreshNotifications])
```

### 📊 Étapes de Détection

#### Étape 1: Appel API
```typescript
const refreshNotifications = async () => {
  // Récupérer les expéditeurs SMS et packages Wave
  const [senders, wavePackages] = await Promise.all([
    fetchUniqueSenders(),      // GET /api/.../unique_senders/
    fetchUniquePackages()      // GET /api/.../unique_packages/
  ])
  
  // ...
}
```

**API retourne:**
```json
{
  "stats": [
    {
      "sender": "+221771234567",
      "count": 45,
      "unread_count": 5  ← COMPTEUR DE NON LUS
    }
  ]
}
```

#### Étape 2: Comparaison avec l'État Précédent
```typescript
// Sauvegarder l'état précédent
const previousUnreadMap = new Map(unreadBySender)

// Pour chaque sender
senders.forEach((sender) => {
  const previousUnread = previousUnreadMap.get(sender.sender) || 0
  
  // Comparer
  if (sender.unread_count > previousUnread) {
    // 🎉 NOUVEAU MESSAGE DÉTECTÉ!
    updateTimestamp(sender.sender, false)
    console.log(`📅 SMS: Nouveau message de ${sender.sender}`)
  }
})
```

**Exemple:**
```
Polling 1 (10h00):
  A: unread_count = 2
  B: unread_count = 1
  
Polling 2 (10h00:30):
  A: unread_count = 2 (pas de changement)
  B: unread_count = 3 (2 → 3) ← NOUVEAU MESSAGE!
  
Action:
  updateTimestamp("B", false)
  playSound() 🔔
```

#### Étape 3: Notification
```typescript
const hasNew = total > previousCountRef.current

if (hasNew && !isFirstLoadRef.current && isEnabled) {
  console.log(`🔔 Nouveaux messages détectés: ${total - previousCountRef.current}`)
  
  // Son
  playSound()
  
  // Badge
  setHasNewMessages(true)
  
  // Notification native
  new Notification("Nouveau message", {
    body: `Vous avez ${total - previousCountRef.current} nouveau(x) message(s)`
  })
}
```

### 📈 Timeline Exemple

```
10h00:00 - App lancée
  ↓ Appel API immédiat
  A: unread = 2
  B: unread = 1
  previousCountRef = 3

10h00:30 - Premier polling
  ↓ Appel API
  A: unread = 2 (pas de changement)
  B: unread = 1 (pas de changement)
  total = 3
  hasNew? 3 > 3 = NON
  Action: Rien

10h01:00 - Deuxième polling
  ↓ Appel API
  A: unread = 2 (pas de changement)
  B: unread = 3 (1 → 3) ← CHANGEMENT!
  total = 5
  hasNew? 5 > 3 = OUI
  Action:
    - updateTimestamp("B", false)
    - playSound() 🔔
    - Notification native
    - previousCountRef = 5

10h01:30 - Troisième polling
  ↓ Appel API
  A: unread = 2
  B: unread = 3
  total = 5
  hasNew? 5 > 5 = NON
  Action: Rien
```

---

## 2️⃣ Système Local - Page Conversation

### 📍 Localisation
`app/conversation/page.tsx`

### ⏱️ Fréquence
**Toutes les 60 secondes** (refresh SWR)

### 🎯 Objectif
- Détecter les nouveaux messages dans la conversation **active**
- Afficher les nouveaux messages en temps réel
- Jouer le son localement
- Mettre à jour le timestamp de cette conversation

### 🔄 Fonctionnement

```typescript
const {
  data: messagesData,
  isLoading: messagesLoading,
  mutate: mutateMessages,
} = useSWR(
  `messages-${isWaveMode ? 'wave' : 'sms'}-${sender}-${statusFilter}`,
  async () => {
    // Appel API pour récupérer les messages
    if (isWaveMode) {
      return await fetchFcmLogs({ package_name: sender, ... })
    } else {
      return await fetchSmsLogs({ sender: sender, ... })
    }
  },
  {
    refreshInterval: 60000, // ← 60 secondes
    onSuccess: (data) => {
      if (data && currentPage === 1) {
        clearMessages()
        addMessages(data.results, 'top') // ← Ajoute en haut
      }
    }
  }
)
```

### 📊 Étapes de Détection

#### Étape 1: Appel API
```typescript
// Toutes les 60 secondes
GET /api/.../sms-logs/?sender=+221771234567&page=1&page_size=20
```

**API retourne:**
```json
{
  "count": 45,
  "results": [
    {
      "uid": "msg-123",
      "sender": "+221771234567",
      "content": "Nouveau message",
      "received_at": "2026-03-13T10:30:00Z"
    }
  ]
}
```

#### Étape 2: Détection via useMessagesV2
```typescript
const {
  messages: allMessages,
  addMessages,
  // ...
} = useMessagesV2({
  onNewMessages: (newMessages) => {
    console.log(`✨ ${newMessages.length} nouveau(x) message(s) détecté(s)`)
    
    if (newMessages.length > 0) {
      // Son
      playSound() 🔔
      
      // Timestamp
      if (sender) {
        updateTimestamp(sender, isWaveMode)
        console.log(`📅 Timestamp mis à jour pour ${sender}`)
      }
    }
  }
})
```

#### Étape 3: Comparaison dans addMessages
```typescript
// hooks/use-messages-v2.ts
const addMessages = (newMessages, position = 'top') => {
  const actuallyNew = []
  
  newMessages.forEach(message => {
    if (!messagesMapRef.current.has(message.uid)) {
      actuallyNew.push(message) // ← NOUVEAU!
    }
  })
  
  if (actuallyNew.length > 0) {
    // Notifier
    if (onNewMessages) {
      onNewMessages(actuallyNew) // ← Callback appelé
    }
  }
}
```

### 📈 Timeline Exemple

```
10h00:00 - Utilisateur ouvre conversation A
  ↓ Appel API immédiat
  Messages: [msg1, msg2, msg3]
  messagesMapRef: {msg1, msg2, msg3}

10h01:00 - Premier refresh (60s)
  ↓ Appel API
  Messages: [msg1, msg2, msg3] (pas de changement)
  Comparaison: Tous déjà dans messagesMapRef
  actuallyNew: []
  Action: Rien

10h02:00 - Deuxième refresh (60s)
  ↓ Appel API
  Messages: [msg4, msg1, msg2, msg3] ← msg4 est nouveau!
  Comparaison: msg4 pas dans messagesMapRef
  actuallyNew: [msg4]
  Action:
    - onNewMessages([msg4]) appelé
    - playSound() 🔔
    - updateTimestamp("A", false)
    - Badge "Nouveau" sur msg4
```

---

## 🔄 Interaction des 2 Systèmes

### Scénario: Message arrive pendant que l'utilisateur est sur une autre page

```
Utilisateur sur la page d'accueil (liste)
Conversation A est fermée

10h00:00 - Message arrive dans A
  
10h00:15 - Polling Global (30s)
  ↓ Détecte: A.unread_count = 3 (était 2)
  Action:
    - updateTimestamp("A", false) ✅
    - playSound() 🔔
    - Badge [3] sur A dans la liste
    - A remonte dans la liste (tri par timestamp)

10h00:30 - Utilisateur ouvre conversation A
  ↓ Appel API immédiat
  Messages chargés (incluant le nouveau)
  Badge "Nouveau" affiché sur le message
```

### Scénario: Message arrive pendant que l'utilisateur est dans la conversation

```
Utilisateur dans conversation A

10h00:00 - Message arrive dans A
  
10h00:15 - Polling Global (30s)
  ↓ Détecte: A.unread_count = 3 (était 2)
  Action:
    - updateTimestamp("A", false) ✅
    - playSound() 🔔
    - Badge mis à jour dans la liste

10h01:00 - Refresh Local (60s)
  ↓ Appel API pour conversation A
  ↓ Détecte: msg4 est nouveau
  Action:
    - onNewMessages([msg4]) ✅
    - playSound() 🔔 (encore)
    - updateTimestamp("A", false) ✅ (encore)
    - Message affiché avec badge "Nouveau"
```

**Note:** Le son peut jouer 2 fois (global + local), mais c'est normal!

---

## 📊 Comparaison des 2 Systèmes

| Critère | Système Global | Système Local |
|---------|---------------|---------------|
| **Fréquence** | 30 secondes | 60 secondes |
| **Portée** | Toutes conversations | Conversation active |
| **API** | `unique_senders` | `sms-logs` |
| **Détection** | `unread_count` | UIDs des messages |
| **Son** | ✅ Oui | ✅ Oui |
| **Timestamp** | ✅ Oui | ✅ Oui |
| **Badge liste** | ✅ Oui | ❌ Non |
| **Badge message** | ❌ Non | ✅ Oui |

---

## 🎯 Résumé

### Comment un nouveau message est détecté?

**Méthode 1: Polling Global (30s)**
```
API → unread_count augmente → Nouveau message détecté
```

**Méthode 2: Refresh Local (60s)**
```
API → Nouveau UID dans les messages → Nouveau message détecté
```

### Pourquoi 2 systèmes?

1. **Global**: Rapide (30s), léger (juste les compteurs), couvre tout
2. **Local**: Précis (UIDs exacts), affiche les messages, conversation active

### Avantages

- ✅ Double détection = Plus fiable
- ✅ Fonctionne même si une méthode échoue
- ✅ Timestamps toujours à jour
- ✅ Son joué rapidement (30s max)
- ✅ Messages affichés en temps réel

🎉 **Les 2 systèmes travaillent ensemble pour une détection optimale!**
