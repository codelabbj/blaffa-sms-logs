# 📅 Tri avec Cache Local des Timestamps

## Vue d'ensemble

Le système garde maintenant en mémoire (localStorage) la date du dernier message reçu pour chaque conversation, même si l'API ne fournit pas `last_message_date`. Cela permet un tri précis et persistant.

## 🎯 Fonctionnement

### 1. **Détection de Nouveaux Messages**

Quand le système détecte qu'une conversation a plus de messages non lus qu'avant:

```typescript
// Dans notification-context.tsx
const previousUnread = unreadBySender.get(sender.sender) || 0
if (sender.unread_count > previousUnread) {
  updateTimestamp(sender.sender, false) // ← Enregistre NOW
}
```

### 2. **Stockage Persistant**

Les timestamps sont sauvegardés dans `localStorage`:

```json
{
  "conversation-timestamps": {
    "sms-+221771234567": {
      "sender": "+221771234567",
      "lastMessageDate": "2026-03-13T14:30:00.000Z",
      "isWaveMode": false
    },
    "wave-com.wave.business": {
      "sender": "com.wave.business",
      "lastMessageDate": "2026-03-13T15:00:00.000Z",
      "isWaveMode": true
    }
  }
}
```

### 3. **Tri Hybride (API + Cache)**

```typescript
// Priorité: API > Cache Local > Fallback
const aDate = a.last_message_date || getTimestamp(a.sender, false)
const bDate = b.last_message_date || getTimestamp(b.sender, false)

if (aDate && bDate) {
  return new Date(bDate) - new Date(aDate) // Plus récent en premier
}
```

## 🔄 Algorithme Complet

```
1️⃣ Épinglés (📌)
   ↓
2️⃣ Non lus vs Lus (🔴)
   ↓
3️⃣ Date du dernier message
   • API last_message_date (si disponible)
   • OU Cache local (si message reçu pendant la session)
   • OU null (pas de date)
   ↓
4️⃣ Nombre de non lus (si pas de date)
   ↓
5️⃣ Nombre total de messages (dernier recours)
```

## 📊 Scénarios

### Scénario 1: Premier Lancement (Pas de Cache)

```
État initial:
  A: +221771234567, 5 non lus, pas de date
  B: +221772222222, 2 non lus, pas de date
  C: +221773333333, 0 non lus, pas de date

Tri:
  1. A (5 non lus) ← Niveau 4
  2. B (2 non lus) ← Niveau 4
  3. C (0 non lus) ← Niveau 5
```

### Scénario 2: Nouveau Message Arrive

```
Polling détecte:
  B: unread_count passe de 2 → 3

Action:
  updateTimestamp("B", false) → "2026-03-13T14:30:00Z"

Nouveau tri:
  1. B (3 non lus, 14h30) ← Niveau 3 (date cache)
  2. A (5 non lus, pas de date) ← Niveau 4
  3. C (0 non lus) ← Niveau 5
```

### Scénario 3: API Fournit les Dates

```
API retourne:
  A: last_message_date = "2026-03-13T10:00:00Z"
  B: last_message_date = "2026-03-13T14:30:00Z" (ou cache)
  C: pas de date

Tri:
  1. B (14h30) ← Niveau 3 (API ou cache)
  2. A (10h00) ← Niveau 3 (API)
  3. C (pas de date) ← Niveau 5
```

## 🏗️ Architecture

### Hook: `use-conversation-timestamps.ts`

```typescript
interface ConversationTimestamp {
  sender: string
  lastMessageDate: string
  isWaveMode: boolean
}

// Fonctions principales
updateTimestamp(sender, isWaveMode, date?) // Enregistrer
getTimestamp(sender, isWaveMode)           // Récupérer
clearTimestamps()                          // Nettoyer
```

**Stockage:** Zustand + localStorage (persistant)

### Contexte: `notification-context.tsx`

```typescript
// Détection de nouveaux messages
if (sender.unread_count > previousUnread) {
  updateTimestamp(sender.sender, false)
}
```

**Déclencheur:** Polling toutes les 30 secondes

### Page: `app/page.tsx`

```typescript
// Utilisation pour le tri
const aDate = a.last_message_date || getTimestamp(a.sender, false)
const bDate = b.last_message_date || getTimestamp(b.sender, false)
```

**Résultat:** Liste triée par date réelle

## 📱 Exemple Complet

### Timeline

```
10h00 - App lancée
  Cache vide
  Tri par unread_count

10h15 - Message de A arrive
  Polling détecte: A.unread_count = 1
  Cache: A → "2026-03-13T10:15:00Z"
  A remonte en premier

10h30 - Message de B arrive
  Polling détecte: B.unread_count = 1
  Cache: B → "2026-03-13T10:30:00Z"
  B passe devant A (plus récent)

11h00 - Utilisateur lit B
  B.unread_count = 0
  Mais B garde sa date en cache
  B reste visible avec sa date

12h00 - App fermée et rouverte
  Cache chargé depuis localStorage
  Tri conservé: B (10h30) > A (10h15)
```

## ✅ Avantages

1. **Persistant**: Les dates survivent au rechargement
2. **Hybride**: Utilise l'API si disponible, sinon le cache
3. **Automatique**: Pas d'action utilisateur requise
4. **Précis**: Date exacte de réception
5. **Léger**: Seulement les timestamps, pas les messages

## 🔧 Configuration

### Changer la Clé de Stockage

```typescript
// hooks/use-conversation-timestamps.ts
persist(
  (set, get) => ({ /* ... */ }),
  {
    name: "conversation-timestamps", // ← Modifier ici
  }
)
```

### Nettoyer le Cache

```typescript
import { useConversationTimestamps } from "@/hooks/use-conversation-timestamps"

const { clearTimestamps } = useConversationTimestamps()
clearTimestamps() // Efface tout
```

### Voir le Cache

```javascript
// Dans la console du navigateur
JSON.parse(localStorage.getItem("conversation-timestamps"))
```

## 🐛 Débogage

### Logs Automatiques

```
📅 Timestamp mis à jour: sms-+221771234567 → 2026-03-13T14:30:00.000Z
📅 Timestamp mis à jour: wave-com.wave.business → 2026-03-13T15:00:00.000Z
```

### Vérifier le Tri

```typescript
// Dans app/page.tsx
console.log("Tri:", sortedSenders.map(s => ({
  sender: s.sender,
  date: s.last_message_date || getTimestamp(s.sender, false),
  unread: s.unread_count
})))
```

## 🚀 Améliorations Futures

1. **Expiration**: Supprimer les timestamps > 30 jours
   ```typescript
   const isExpired = (date: string) => {
     const age = Date.now() - new Date(date).getTime()
     return age > 30 * 24 * 60 * 60 * 1000 // 30 jours
   }
   ```

2. **Synchronisation**: Envoyer les timestamps au backend
   ```typescript
   await updateConversationTimestamp(sender, date)
   ```

3. **Compression**: Limiter le nombre de timestamps stockés
   ```typescript
   const MAX_TIMESTAMPS = 100
   if (timestamps.size > MAX_TIMESTAMPS) {
     // Supprimer les plus anciens
   }
   ```

## 📝 Résumé

**Fichiers créés:** 1
- `hooks/use-conversation-timestamps.ts` (90 lignes)

**Fichiers modifiés:** 2
- `contexts/notification-context.tsx` (+10 lignes)
- `app/page.tsx` (+20 lignes)

**Total:** ~120 lignes de code

**Résultat:**
- ✅ Tri précis par date de réception
- ✅ Persistant (localStorage)
- ✅ Automatique (détection polling)
- ✅ Hybride (API + cache)
- ✅ Fonctionne même sans backend!

🎉 **Le tri est maintenant intelligent et persistant!**
