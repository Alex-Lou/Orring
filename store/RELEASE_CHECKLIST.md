# Orring — Checklist de publication Play Store

App : **Orring** · package `com.orrniapp` · version **2.7.0** · versionCode **32**

---

## A. Côté code/config — ✅ déjà fait dans cette passe

- [x] Build de release en **AAB** (`eas.json` → `app-bundle` ; Gradle `bundleRelease` produit un AAB).
- [x] Numéros de version alignés (`app.json`, `android/app/build.gradle`, `strings.xml` runtime = 2.7.0 / vc 32).
- [x] Version affichée dans Réglages tirée de `app.json` (plus de « 2.1.456 » en dur).
- [x] Autorisations inutiles retirées (`SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`) + config plugin `withAndroidCleanup`.
- [x] `allowBackup=false` (données de santé hors backup cloud Google).
- [x] Notifications localisées dans les 10 langues.
- [x] Locales de date complètes (nl, ru).
- [x] Tests verts (46/46), `tsc` sans erreur.
- [x] Error boundary globale, garde anti-effacement dans le store.

---

## B. Construire l'AAB signé (voie locale recommandée)

Ton keystore de release est déjà câblé via `android/keystore.properties`.

```powershell
# Depuis la racine du projet
cd android
./gradlew bundleRelease
# Sortie : android/app/build/outputs/bundle/release/app-release.aab
```

Vérifier la signature et la version de l'AAB :

```powershell
# Version (doit afficher versionCode 32 / versionName 2.7.0)
& "$env:ANDROID_HOME\build-tools\<version>\aapt2" dump badging app-release.aab  # ou via bundletool
# Signature
jarsigner -verify -verbose -certs app-release.aab
```

> ⚠️ **Sauvegarde le keystore.** `android/app/orring-release.keystore` + les mots de passe de
> `keystore.properties` sont ta **clé d'upload**. Si tu les perds, tu ne pourras plus publier de
> mise à jour (sauf réinitialisation de clé via Play App Signing). Garde une copie hors machine.

---

## C. Première soumission Play Console

1. **Créer l'application** (Play Console → Créer une application). Langue par défaut, nom « Orring ».
2. **Play App Signing** : accepter à la première mise en ligne. Google détient la clé de
   signature de l'app ; ton keystore local devient la **clé d'upload**.
3. **Fiche du store** (Présence sur le Store → Fiche principale) :
   - Titre, description courte (≤80 car.), description complète.
   - **Icône** 512×512 PNG · **Image mise en avant** 1024×500 · **≥ 2 captures** par type d'appareil.
4. **Politique de confidentialité** : héberger `store/privacy-policy.html` (ex. ajouter
   `privacy.html` au repo GitHub Pages *OrringLanding*) puis coller l'URL publique dans
   Play Console → Contenu de l'application → Politique de confidentialité.
   *(L'email de contact `alex.guennad@gmail.com` est déjà renseigné dans le fichier.)*
5. **Sécurité des données** : suivre `store/PLAY_STORE_DATA_SAFETY.md` (réponse : aucune donnée
   collectée/partagée).
6. **Classification du contenu** : remplir le questionnaire (app de santé, pas de conseil
   médical, pas de contenu sensible) → catégorie tous publics attendue.
7. **Public cible** : adultes ; **non destinée aux enfants**.
8. **Publicités** : « Pas de publicité ».
9. **Catégorie d'app** : Santé et remise en forme.
10. **Pays/régions** de distribution.

---

## D. Mise en ligne progressive

1. Créer une release sur **Test interne** d'abord, importer l'`app-release.aab`.
2. Installer depuis le lien de test, **smoke test** : onboarding, pose/retrait anneau,
   notifications (changer la langue → vérifier la langue des notifs), export/restauration,
   mode sombre, RTL (arabe).
3. Promouvoir vers **Production** une fois validé.

---

## E. Notes

- **Compteur « jours restants »** : ✅ recalé sur la date d'action en jours calendaires
  (robuste aux pose/retrait proches de minuit), cohérent avec les dates affichées + les notifs.
- **Écran d'erreur** (error boundary) : affiché en français par défaut (clés
  `errorTitle/errorBody/errorRetry` pas encore ajoutées aux 10 langues). Cas rare.
- **`translations.ts`** (~3700 lignes) gardé en un seul fichier : données i18n pures de
  10 langues ; le scinder risquerait une perte silencieuse de clés de traduction. Tous les
  autres fichiers de code sont < 400 lignes.
- **Artefacts locaux** `releases/` / `dist/` : non suivis par git, à garder hors du dépôt.
- **Smoke-test device recommandé** sur les écrans refondus (accueil, périodes, calendrier,
  onboarding, anneau) avant promotion en production — refactor par déplacement pur, validé
  tsc (0 erreur) + tests (46/46).
