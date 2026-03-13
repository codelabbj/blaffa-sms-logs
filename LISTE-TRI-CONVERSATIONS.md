# 📋 Système de Tri des Conversations

## Vue d'ensemble

La liste des conversations est maintenant triée intelligemment pour afficher les conversations les plus importantes en premier.

## 🎯 Ordre de Tri

### 1. **Services (Wave Business)**
Les services sont affichés dans une section séparée en haut:
- Section "Services" avec fond gris clair
- Toujours au-dessus des SMS

### 2. **SMS - Ordre de Priorité**

Les SMS sont triés selon cet ordre de priorité:

```
1️⃣ Conversations épinglées (📌)
   ↓
2️⃣ Conversations avec messages non lus (🔴)
   ↓
3️⃣ Date du dernier message (plus récent en premier)
   ↓
4️⃣ Nombre total de messages (si pas de date)
```

## 📊 Algorithme de Tri

```typescript
sortedSenders.sort((a, b) => {
  // 1. Épinglés en premier
  if (aPinned && !bPinned) return -1
  if (!aPinned && bPinned) return 1
  
  // 2. Non lus avant lus
  if (a.unread_count > 0 && b.unread_count === 0) return -1
  if (a.unread_count === 0 && b.unread_count > 0) return 1
  
  // 3. Plus récent en premier (par date)
  if (a.last_message_date && b.last_message_date) {
    return new Date(b.last_message_date) - new Date(a.last_message_date)
  }
  
  // 4. Plus de messages en premier
  return b.count - a.count
})
```

## 🔄 Mise à Jour Automatique

### Quand un nouveau message arrive:

1. **Polling automatique** (30 secondes)
   - Le système vérifie les nouveaux messages
   - Met à jour les compteurs `unread_count`
   - Met à jour `last_message_date`

2. **Re-tri automatique**
   - La liste est automatiquement retriée
   - Les conversations avec nouveaux messages remontent
   - Les badges de compteur sont mis à jour

3. **Notification**
   - Son de notification 🔔
   - Badge rouge sur le logo
   - Notification native du système

## 📱 Exemple Visuel

```
┌─────────────────────────────────────┐
│  SERVICES                           │
├─────────────────────────────────────┤
│  🟢 Wave Business          [3]      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  SMS (12)                           │
├─────────────────────────────────────┤
│  📌 +221771234567         [5]       │ ← Épinglé + Non lus
│  📌 +221779876543         [2]       │ ← Épinglé + Non lus
│  📌 +221775555555                   │ ← Épinglé (pas de non lus)
│  +221771111111            [8]       │ ← Non lus (récent)
│  +221772222222            [1]       │ ← Non lus (moins récent)
│  +221773333333                      │ ← Lu (récent)
│  +221774444444                      │ ← Lu (moins récent)
└─────────────────────────────────────┘
```

## 🔧 Configuration Backend Requise

Pour que le tri par date fonctionne, l'API doit retourner `last_message_date`:

### Endpoint: `/api/payments/betting/user/sms-logs/unique_senders/`

**Réponse attendue:**
```json
{
  "senders": [...],
  "total": 12,
  "stats": [
    {
      "sender": "+221771234567",
      "count": 45,
      "pending_count": 3,
      "unread_count": 5,
      "last_message_date": "2026-03-13T14:30:00Z"  ← NOUVEAU
    }
  ]
}
```

### Endpoint: `/api/payments/betting/user/fcm-logs/unique_packages/`

**Réponse attendue:**
```json
{
  "packages": [...],
  "total": 1,
  "stats": [
    {
      "package_name": "com.wave.business",
      "count": 23,
      "pending_count": 2,
      "unread_count": 3,
      "last_message_date": "2026-03-13T15:00:00Z"  ← NOUVEAU
    }
  ]
}
```

## 🎨 Indicateurs Visuels

### Conversations épinglées
- Icône 📌 jaune en haut à droite de l'avatar
- Toujours en haut de la liste

### Messages non lus
- Badge rouge avec le nombre
- Texte en gras (optionnel)

### Sections
- "Services" - Fond gris clair
- "SMS (X)" - Fond gris clair avec compteur

## 🚀 Comportement en Temps Réel

### Scénario 1: Nouveau message SMS
```
Avant:
  1. +221771111111 (lu, 10h00)
  2. +221772222222 (lu, 09h00)

Nouveau message arrive pour +221772222222 à 10h30

Après:
  1. +221772222222 [1] (non lu, 10h30) ← Remonté
  2. +221771111111 (lu, 10h00)
```

### Scénario 2: Message lu
```
Avant:
  1. +221771111111 [3] (non lu)
  2. +221772222222 (lu)

Utilisateur lit les messages de +221771111111

Après:
  1. +221772222222 (lu) ← Peut remonter si plus récent
  2. +221771111111 (lu)
```

### Scénario 3: Épinglage
```
Avant:
  1. +221771111111 [5] (non lu)
  2. +221772222222 (lu)

Utilisateur épingle +221772222222

Après:
  1. 📌 +221772222222 (lu) ← Remonté (épinglé)
  2. +221771111111 [5] (non lu)
```

## ✅ Avantages

1. **Conversations importantes en premier**
   - Épinglées toujours visibles
   - Non lus faciles à repérer

2. **Ordre chronologique**
   - Plus récent en premier
   - Comme WhatsApp/Telegram

3. **Séparation claire**
   - Services séparés des SMS
   - Sections visuellement distinctes

4. **Mise à jour automatique**
   - Pas besoin de rafraîchir manuellement
   - Tri en temps réel

## 🐛 Fallback

Si l'API ne retourne pas `last_message_date`:
- Le tri se fait par nombre de messages (`count`)
- Les conversations avec plus de messages sont en haut
- Toujours fonctionnel, juste moins précis

## 📝 Notes Techniques

- Le tri est fait côté client (React)
- Pas de requête supplémentaire à l'API
- Performance: O(n log n) pour le tri
- Réactif aux changements de données (SWR)
