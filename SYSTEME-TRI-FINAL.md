# Système de Tri des Conversations - Solution Finale

## Problème Identifié

L'API ne retourne **PAS** de champ `last_message_date` dans les endpoints:
- `/api/payments/betting/user/sms-logs/unique_senders/`
- `/api/payments/betting/user/fcm-logs/unique_packages/`

Les champs disponibles sont uniquement:
- `sender` / `package_name`
- `count` (nombre total de messages)
- `pending_count`
- `unread_count`

## Solution Implémentée

### Détection Simple et Efficace

Le système utilise le champ `count` (nombre total de messages) pour détecter les nouveaux messages:

**Logique**:
```typescript
// À chaque polling (30s)
const previousCount = previousCountsRef.current.get(sender) || 0
if (currentCount > previousCount) {
  // Nouveau message détecté !
  updateTimestamp(sender, false, new Date().toISOString())
}
```

**Avantages**:
- ✅ Pas d'appels API supplémentaires
- ✅ Détection fiable (count augmente toujours avec un nouveau message)
- ✅ Simple et performant
- ✅ Fonctionne pour SMS et services

### Système de Cache Local

Les timestamps sont persistés dans localStorage avec une clé unique par sender:
- SMS: `sms-+221771234567`
- Service: `wave-com.wave.business`

**Fichier**: `hooks/use-conversation-timestamps.ts`
- Utilise Zustand + persist middleware
- Map<key, { sender, lastMessageDate, isWaveMode }>

### Algorithme de Tri

**Ordre de priorité** (du plus important au moins important):

1. **Épinglés** → Toujours en haut
2. **Non lus** → Avant les lus
3. **Date du dernier message** → Plus récent en premier
   - Utilise le cache local (timestamps enregistrés)
   - Fallback sur `unread_count` si pas de date
4. **Nombre de non lus** → Plus de non lus en premier
5. **Nombre total** → Plus de messages en premier

**Fichier**: `app/page.tsx`

```typescript
const sortedSenders = filteredSenders.sort((a, b) => {
  // 1. Épinglés
  if (aPinned && !bPinned) return -1
  if (!aPinned && bPinned) return 1
  
  // 2. Non lus
  if (a.unread_count > 0 && b.unread_count === 0) return -1
  if (a.unread_count === 0 && b.unread_count > 0) return 1
  
  // 3. Date (cache local)
  const aDate = getTimestamp(a.sender, false)
  const bDate = getTimestamp(b.sender, false)
  
  if (aDate && bDate) {
    return new Date(bDate).getTime() - new Date(aDate).getTime()
  }
  
  if (aDate && !bDate) return -1
  if (!aDate && bDate) return 1
  
  // 4. Nombre de non lus
  if (a.unread_count > 0 && b.unread_count > 0) {
    return b.unread_count - a.unread_count
  }
  
  // 5. Nombre total
  return b.count - a.count
})
```

## Flux Complet

### Premier Chargement
```
1. User ouvre l'app
2. NotificationContext démarre
3. refreshNotifications() appelé
4. Récupération unique_senders et unique_packages
5. Calcul des non lus
6. Enregistrement des counts initiaux dans previousSenderCountsRef
7. ✅ AFFICHAGE: Tri par nombre de non lus (pas de timestamps encore)
```

### Polling (toutes les 30s)
```
1. refreshNotifications() appelé
2. Récupération unique_senders et unique_packages
3. Pour chaque sender/package:
   - Comparer count actuel vs count précédent
   - Si count augmente → updateTimestamp(NOW)
   - Mettre à jour previousCountsRef
4. ✅ Tri des conversations avec dates mises à jour
```

### Nouveau Message Reçu
```
1. Polling détecte count: 46931 → 46932
2. updateTimestamp(sender, false, NOW)
3. localStorage mis à jour
4. Son de notification joué
5. Page re-render avec nouveau tri
6. ✅ Sender remonte en haut de la liste (date la plus récente)
```

## Avantages

✅ Affichage instantané au premier chargement
✅ Détection fiable via comparaison de `count`
✅ Aucun appel API supplémentaire
✅ Persistance dans localStorage (survit au refresh)
✅ Tri précis et cohérent
✅ Simple et performant
✅ Fonctionne pour SMS et services

## Limitations

⚠️ Au premier chargement, pas de timestamps (tri par unread_count)
⚠️ Les timestamps se construisent progressivement avec les nouveaux messages
⚠️ Si l'app n'est jamais ouverte, les timestamps ne sont jamais enregistrés

## Performance

- Affichage initial: Instantané
- Polling: Toutes les 30 secondes
- Détection: Temps réel (dès qu'un message arrive)
- Aucun appel API supplémentaire

## Amélioration Future (Backend)

Pour une solution optimale, demander au backend d'ajouter `last_message_date` dans les réponses:

```json
{
  "sender": "MobileMoney",
  "count": 46931,
  "unread_count": 592,
  "last_message_date": "2026-03-13T14:30:00Z"  // ← Ajouter ce champ
}
```

Cela éliminerait le besoin de:
- Comparaison de `count` entre chaque polling
- Construction progressive des timestamps
- Cache local pour les dates
