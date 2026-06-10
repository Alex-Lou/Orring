# Play Console — Fiche « Sécurité des données » (Data Safety)

> Réponses prêtes à recopier dans **Play Console → Contenu de l'application → Sécurité des données**.
> Base : Orring stocke **tout en local**, sans compte ni serveur, sans publicité ni analytics.

---

## Section 1 — Collecte et partage de données

**Question : « Votre application collecte-t-elle ou partage-t-elle l'un des types de données utilisateur requis ? »**

➡️ **NON.**

Justification (au sens de Google) : « collecter » = transmettre des données hors de l'appareil ;
« partager » = transmettre à un tiers. Or toutes les données saisies (cycles, règles, notes,
prénom, préférences) restent dans le stockage privé de l'app **sur l'appareil** et ne sont
jamais envoyées. Les données qui ne quittent pas l'appareil ne sont pas considérées comme
« collectées ».

| Type de donnée | Collectée | Partagée |
|---|---|---|
| Infos perso (prénom) | Non (local uniquement) | Non |
| Santé et fitness (cycle, règles) | Non (local uniquement) | Non |
| Fichiers (export manuel) | Non¹ | Non |
| Position, contacts, messages, photos, audio, navigation | Non | Non |
| Identifiants, activité dans l'app | Non | Non |

¹ L'export est **initié par l'utilisatrice** et envoyé vers la destination qu'elle choisit
(menu de partage Android). L'app ne transmet rien d'elle-même → non déclaré comme collecte.

---

## Section 2 — Nuance « Expo Updates » (à connaître)

Au démarrage, l'app interroge le service **Expo Updates** (HTTPS) pour récupérer d'éventuelles
mises à jour de code. Cette requête transmet des métadonnées techniques (plateforme, version
d'exécution, ID de mise à jour) ; le serveur voit l'adresse IP comme toute requête HTTP.

- **Aucune donnée de santé / personnelle** n'est envoyée.
- Il s'agit d'une **infrastructure de livraison de l'app**, pas d'une collecte de données
  utilisateur → la position de Google permet de répondre **« Aucune donnée collectée »**.
- Si tu préfères la prudence maximale, tu peux désactiver l'OTA (`updates.enabled = false`
  dans `app.json`) ; ce n'est pas nécessaire pour la conformité.

---

## Section 3 — Questions complémentaires du formulaire

- **Les données sont-elles chiffrées en transit ?**
  → Sans objet (aucune donnée utilisateur collectée). La vérification de mise à jour Expo se
  fait en **HTTPS**.
- **Les utilisateurs peuvent-ils demander la suppression de leurs données ?**
  → **Oui, dans l'app** : Réglages → « Réinitialiser », et la désinstallation efface tout.
  (Pas de suppression côté serveur car aucune donnée n'y est stockée.)
- **L'app est-elle destinée aux enfants ?** → **Non.**

---

## Section 4 — Autres déclarations Play liées

- **Catégorie** : Santé et remise en forme (Health & Fitness).
- **Publicités** : « L'application ne contient pas d'annonces ».
- **Politique « Données de santé »** : une **politique de confidentialité** publique est
  requise et fournie (`privacy-policy.html`). L'app ne donne pas de conseil médical et ne se
  présente pas comme un dispositif médical — à confirmer dans le questionnaire de classification
  du contenu.
- **Autorisations** : seules `INTERNET` (OTA), `POST_NOTIFICATIONS` et `VIBRATE` (rappels)
  restent déclarées. Aucune autorisation sensible (stockage, overlay) — rien à justifier auprès
  de Google.
