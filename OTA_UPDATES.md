# OTA Updates — Distribution gratuite à <1000 users

## Ce qui est en place

- **Backend OTA** : EAS Update (hosted Expo). Tier gratuit = **1000 checks de
  manifest / mois**. Avec quelques dizaines d'users qui ouvrent l'app
  occasionnellement, tu restes confortablement dans le gratuit.
- **Distribution de l'APK** : pas de Play Store nécessaire. Tu partages le
  fichier `app-release.apk` directement (Drive, WhatsApp, email, ou idéalement
  une page **GitHub Releases** avec un lien stable).
- **Auto-check** : `checkAutomatically: ON_LOAD` dans `app.json` →
  l'app interroge le serveur EAS à **chaque ouverture** et applique la mise à
  jour si une nouvelle version est disponible.
- **Channel** : `production` (configuré dans `eas.json` + dans
  `app.json > updates.requestHeaders`).
- **Build type** : `apk` (pas AAB) → fichier directement installable sans
  Play Store. Le user active "Sources inconnues" puis tap sur l'APK.

## La règle d'or : `runtimeVersion`

Le champ `runtimeVersion` dans `app.json` détermine la **compatibilité** entre
un APK installé et les updates qu'il peut recevoir.

- **Même `runtimeVersion`** entre l'APK et l'update → l'OTA fonctionne.
- **Différent** → l'update est ignorée, le user doit réinstaller un APK.

### Quand bumper `runtimeVersion`

**UNIQUEMENT** quand tu modifies quelque chose de **natif** (rare) :
- Tu ajoutes / retires un plugin Expo qui a du code natif (ex: `expo-camera`,
  `expo-location`, `react-native-svg` upgradé, etc.)
- Tu touches `android/app/build.gradle` côté deps natives
- Tu changes la version d'`expo` SDK (54 → 55 par ex.)

Dans ces cas tu rebuilds l'APK et tu redistribues.

### Quand NE PAS bumper `runtimeVersion`

Pour **tout le reste** :
- Changement de copy / texte / traduction
- Refactor JS / TS
- Nouveau composant React Native pur
- Modif de styles / thème
- Bug fixes JS
- Ajout de logique côté store

→ Tu **garde `runtimeVersion: "2.6.8"`** (gelé), tu bumps juste `version`
et `versionCode`, et tu push avec :

```bash
eas update --branch production --message "Fix: <description>"
```

Tes users sur la version 2.6.8 reçoivent l'update **au prochain démarrage de
l'app**, sans rien réinstaller.

## Workflow concret pour tes prochaines modifs

### Cas 1 — Fix JS/UI (95% du temps)

```bash
# 1. Code, test localement
# 2. Bump uniquement `version` (et versionCode si tu y tiens, optionnel
#    en mode OTA-only). NE PAS toucher runtimeVersion.
# 3. Push l'update :
eas update --branch production --message "Fix typo dans Mes périodes"
# 4. C'est tout. Tes users qui ont l'APK v2.6.8 reçoivent au prochain launch.
```

### Cas 2 — Changement natif (rare)

```bash
# 1. Bumper `version`, `versionCode` ET `runtimeVersion` dans app.json
#    + android/app/build.gradle (versionCode + versionName).
# 2. Rebuild l'APK :
cd android && ./gradlew :app:assembleRelease
# 3. Distribuer le nouvel APK aux users (Drive/Releases/etc.)
# 4. Optionnel : push aussi `eas update` mais seuls les users sur le NOUVEL
#    runtimeVersion le recevront.
```

## Distribution de l'APK — options gratuites

1. **GitHub Releases** *(recommandé)* — repo public ou privé, drag-and-drop
   l'APK, lien stable, gratuit, illimité.
2. **Google Drive / WhatsApp / email** — rapide mais moins durable.
3. **Auto-hébergement** sur un VPS / Cloudflare Pages — gratuit aussi mais
   plus de setup.

## Ce qu'il te faut pour push une update

```bash
# Une seule fois :
npm install -g eas-cli
eas login   # avec ton compte cybwu
eas init    # déjà fait, projectId déjà dans app.json

# À chaque update JS-only :
eas update --branch production --message "<description>"
```

## Récap honnête

- ✅ **0€**, indéfiniment, jusqu'à ~1000 utilisateurs actifs/mois
- ✅ Pas besoin de Play Store ($25 économisés)
- ✅ Distribution APK directe = totalement gratuit
- ⚠️ Tes users actuels (versions antérieures à 2.6.8 si certains ont gardé
  d'anciens APK) ne pourront PAS recevoir d'update vers 2.6.8 via OTA — il
  faut leur renvoyer le nouvel APK une dernière fois pour les "synchroniser"
  sur runtimeVersion 2.6.8. Après ça, tu peux push librement via OTA.
- 🛡️ Au-delà de ~1000 users → migration possible vers self-host
  (Cloudflare Workers + R2) en ½ journée de setup, toujours 0€.
