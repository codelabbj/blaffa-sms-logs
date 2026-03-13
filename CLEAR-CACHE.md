# Effacer le Cache pour Tester

Pour tester le système de tri depuis le début:

1. Ouvre la console du navigateur (F12)
2. Exécute cette commande:
```javascript
localStorage.clear()
```
3. Rafraîchis la page (F5)

## Ce qui va se passer:

**Premier chargement:**
- Aucun timestamp enregistré
- Tri par: Épinglés > Non lus > unread_count > count
- Les logs montreront "timestamp: AUCUN" pour tous

**Après 30 secondes (premier polling):**
- Les counts sont enregistrés
- Pas de nouveaux messages détectés (count identique)
- Toujours "timestamp: AUCUN"

**Quand un nouveau message arrive:**
- Le polling détecte count: X → X+1
- Timestamp enregistré: NOW
- Le sender remonte en haut avec sa vraie date
- Les logs montreront "🆕 NOUVEAU MESSAGE"

## Vérifier le tri:

Au premier chargement, l'ordre devrait être:
1. Épinglés (si tu en as)
2. Ceux avec le plus de unread_count
3. Si égalité, ceux avec le plus de count
