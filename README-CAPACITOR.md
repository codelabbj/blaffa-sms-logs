# Configuration Capacitor - Blaffa SMS

## Installation

1. Installer les dépendances:
```bash
npm install
```

2. Builder le projet Next.js:
```bash
npm run build
```

3. Ajouter les plateformes (Android et/ou iOS):
```bash
npm run cap:add:android
npm run cap:add:ios
```

4. Synchroniser le projet:
```bash
npm run cap:sync
```

## Configuration

L'application est configurée pour rediriger vers **https://sms.blaffa.net/**

Le fichier `capacitor.config.ts` contient:
- `appId`: net.blaffa.sms
- `appName`: Blaffa SMS
- `server.url`: https://sms.blaffa.net/

## Commandes disponibles

- `npm run build:mobile` - Build Next.js et sync Capacitor
- `npm run cap:sync` - Synchroniser les changements
- `npm run cap:open:android` - Ouvrir dans Android Studio
- `npm run cap:open:ios` - Ouvrir dans Xcode

## Développement

Pour tester l'application mobile:
1. Build le projet: `npm run build:mobile`
2. Ouvrir la plateforme: `npm run cap:open:android` ou `npm run cap:open:ios`
3. Lancer depuis Android Studio ou Xcode

## Notes importantes

- L'app charge directement le contenu depuis https://sms.blaffa.net/
- Aucun contenu local n'est servi, tout vient du serveur distant
- Assurez-vous que le serveur est accessible depuis les appareils mobiles
