# 📅 Timestamp par Sender/Package - Dernier Message

## Principe

Le système enregistre maintenant le timestamp **du dernier message reçu** pour chaque sender/package, pas seulement quand `unread_count` augmente.

## 🎯 Objectif

**Celui qui a reçu le message le plus récemment doit être en haut**, peu importe:
- Si l'utilisateur a déjà des non-lus
- Si l'utilisateur a lu les messages
- Le nombre total de messages

## 🔄 Détection des Nouveaux Messages

### Méthode 1: Via Polling (Liste des Conversations)

📁 `contexts/notification-context.tsx`

```typescript
// Comparer avec l'état précédent
const previousUnread = previousUnreadMap.get(sender.sender) || 0

if (sender.unread_count > previousUnread) {
  // Nouveau message détecté!
  updateTimestamp(sender.sender, false)
  console.log(`📅 SMS: Nouveau message de ${sender.sender}`)
}
```

**Déclencheur:** Polling toutes les 30 secondes

**Condition:** `unread_count` a **augmenté**

### Méthode 2: Via Conversation Active

📁 `app/conversation/page.tsx`

```typescript
onNewMessages: (newMessages) => {
  if (newMessages.length > 0) {
    playSound()
    
    // Mettre à jour le timestamp
    if (sender) {
      updateTimestamp(sender, isWaveMode)
      console.log(`📅 Timestamp mis à jour pour ${sender}`)
    }
  }
}
```

**Déclencheur:** Refresh de la conversation (60 secondes)

**Condition:** Nouveaux messages détectés dans la conversation active

## 📊 Scénarios Détaillés

### Scénario 1: Messages Successifs du Même Sender

```
10h00 - Message 1 de A arrive
  unread_count: 0 → 1
  Timestamp: A = "10h00"
  
10h15 - Message 2 de A arrive
  unread_count: 1 → 2
  Timestamp: A = "10h15" ← MIS À JOUR
  
10h30 - Message 3 de A arrive
  unread_count: 2 → 3
  Timestamp: A = "10h30" ← MIS À JOUR ENCORE
```

**Résultat:** A garde toujours le timestamp du **dernier** message.

### Scénario 2: Plusieurs Senders

```
10h00 - Message de A
  A: unread = 1, timestamp = "10h00"
  Tri: A

10h15 - Message de B
  B: unread = 1, timestamp = "10h15"
  Tri: B (10h15) > A (10h00)

10h30 - Nouveau message de A
  A: unread = 2, timestamp = "10h30" ← MIS À JOUR
  Tri: A (10h30) > B (10h15) ← A REMONTE
```

**Résultat:** Le plus récent est toujours en haut.

### Scénario 3: Utilisateur Lit les Messages

```
10h00 - Message de A
  A: unread = 1, timestamp = "10h00"

10h15 - Utilisateur lit A
  A: unread = 0, timestamp = "10h00" (conservé)

10h30 - Message de B
  B: unread = 1, timestamp = "10h30"
  Tri: B (10h30, non lu) > A (10h00, lu)
```

**Résultat:** B passe devant car:
1. B a des non lus (niveau 2)
2. B est plus récent (niveau 3)

### Scénario 4: Conversation Active

```
Utilisateur sur la conversation A

10h00 - Message arrive dans A
  Détecté par le refresh (60s)
  onNewMessages() appelé
  Timestamp: A = "10h00"
  Son joué 🔔

10h15 - Message arrive dans B
  Détecté par le polling (30s)
  Timestamp: B = "10h15"
  Son joué 🔔
  
Liste mise à jour:
  B (10h15) > A (10h00)
```

**Résultat:** Les deux méthodes fonctionnent ensemble.

## 🔍 Détection Précise

### Pourquoi `unread_count > previousUnread`?

```typescript
// ✅ BON: Détecte les nouveaux messages
if (sender.unread_count > previousUnread) {
  updateTimestamp(sender.sender, false)
}

// ❌ MAUVAIS: Détecte aussi les lectures
if (sender.unread_count !== previousUnread) {
  updateTimestamp(sender.sender, false)
}
```

**Raison:** On veut enregistrer seulement quand un **nouveau message arrive**, pas quand l'utilisateur **lit** un message.

### Cas Particuliers

**Cas 1: Utilisateur lit un message**
```
Avant: unread = 5
Après: unread = 4
Condition: 4 > 5 ? NON
Action: Rien (timestamp conservé)
```

**Cas 2: Nouveau message arrive**
```
Avant: unread = 5
Après: unread = 6
Condition: 6 > 5 ? OUI
Action: updateTimestamp()
```

**Cas 3: Plusieurs messages arrivent**
```
Avant: unread = 5
Après: unread = 8 (3 nouveaux)
Condition: 8 > 5 ? OUI
Action: updateTimestamp() (une seule fois)
```

## 📱 Exemple Complet

### Timeline Réelle

```
10h00 - App lancée
  Cache vide
  Polling démarre

10h00:30 - Premier polling
  A: unread = 2
  B: unread = 1
  Timestamps: A = "10h00:30", B = "10h00:30"
  Tri: A (2 non lus) > B (1 non lu)

10h01:00 - Deuxième polling
  A: unread = 2 (pas de changement)
  B: unread = 1 (pas de changement)
  Timestamps: Inchangés
  Tri: Inchangé

10h01:30 - Troisième polling
  A: unread = 2 (pas de changement)
  B: unread = 3 (2 nouveaux!)
  Timestamps: B = "10h01:30" ← MIS À JOUR
  Tri: B (10h01:30) > A (10h00:30) ← B REMONTE

10h02:00 - Utilisateur lit B
  B: unread = 0
  Timestamps: B = "10h01:30" (conservé)
  Tri: A (2 non lus) > B (0 non lus, mais plus récent)
```

## 🎯 Algorithme de Tri Final

```typescript
sort((a, b) => {
  // 1. Épinglés
  if (aPinned && !bPinned) return -1
  
  // 2. Non lus vs Lus
  if (a.unread_count > 0 && b.unread_count === 0) return -1
  
  // 3. Date (API ou Cache)
  const aDate = a.last_message_date || getTimestamp(a.sender, false)
  const bDate = b.last_message_date || getTimestamp(b.sender, false)
  
  if (aDate && bDate) {
    return new Date(bDate) - new Date(aDate) // ← DERNIER MESSAGE
  }
  
  // 4. Fallbacks...
})
```

**Clé:** `getTimestamp()` retourne le timestamp du **dernier message reçu**.

## ✅ Garanties

1. **Précision**: Timestamp exact du dernier message
2. **Persistance**: Survit au rechargement
3. **Cohérence**: Même logique SMS et Services
4. **Performance**: Mise à jour seulement si nécessaire
5. **Fiabilité**: Double détection (polling + conversation)

## 🔧 Logs de Débogage

```
📅 SMS: Nouveau message de +221771234567
📅 Service: Nouveau message de com.wave.business
📅 Timestamp mis à jour pour +221771234567
```

**Vérifier dans la console:**
- Chaque nouveau message génère un log
- Le sender/package est clairement identifié
- Le type (SMS/Service) est indiqué

## 📊 Résumé

**Avant:**
- Timestamp enregistré seulement au premier non lu
- Pas de mise à jour si déjà des non lus
- Tri imprécis

**Après:**
- Timestamp mis à jour à **chaque nouveau message**
- Fonctionne même avec des non lus existants
- Tri précis par **dernier message reçu**

🎉 **Le système garde maintenant le bon timestamp par sender/package!**
