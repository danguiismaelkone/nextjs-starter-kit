---
id: ITEM-030
title: Téléchargement et prévisualisation de documents
status: implemented
priority: P1
type: feature
estimate: M
depends_on: [ITEM-028]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Une fois les documents stockés (ITEM-028), les utilisateurs doivent pouvoir en
consulter le contenu sans systématiquement les télécharger.

## User story
En tant qu'utilisateur, je veux prévisualiser un document sans le télécharger, afin de
vérifier rapidement son contenu.

## Critères d'acceptation
- [x] Clic sur un document ouvre une prévisualisation (images, PDF*) dans une modale,
      sans téléchargement préalable. *(voir note sur « texte » ci-dessous.)*
- [x] Bouton « Télécharger » génère une URL signée temporaire (ITEM-027) et déclenche le
      téléchargement.
- [x] Types non prévisualisables affichent une icône + le téléchargement direct comme
      seule action.

## Notes techniques
Pas de module FATIHOUNE dédié à la prévisualisation — développement spécifique sur la
base d'ITEM-028.

Décisions :
- **Aperçu « texte » non implémenté en rendu inline — décision assumée, pas un
  oubli.** Le critère mentionne « images, PDF, texte », mais
  `ACCEPTED_UPLOAD_TYPES` (`app/api/documents/upload/route.ts`, ITEM-028) ne
  permet aujourd'hui d'uploader que `image/jpeg|png|webp` et `application/pdf` —
  aucun document texte ne peut exister en base par ce chemin, donc cette
  branche ne serait pas testable. Ajouter le rendu texte aurait aussi demandé un
  `fetch()` du contenu depuis l'URL signée (contrairement à `<img>`/`<iframe>`
  qui chargent une ressource cross-origin sans CORS, un `fetch()` xhr en a
  besoin), et le CORS du bucket S3/MinIO n'est pas configuré (ITEM-027). Plutôt
  que d'ajouter du code non exerçable et potentiellement cassé silencieusement,
  tout type hors image/PDF (donc tout document texte hypothétique) tombe dans
  le repli « aperçu non disponible + téléchargement seul », qui couvre le
  3ᵉ critère. À revisiter si `ACCEPTED_UPLOAD_TYPES` s'élargit un jour aux
  fichiers texte (hors périmètre ici).
- `GET /api/documents/[id]` (nouvelle route, ajoutée à côté du `PATCH` déplacement
  d'ITEM-029) retourne une URL signée : `?download=1` force
  `Content-Disposition: attachment` avec le nom original du document (jamais
  l'UUID de la clé S3) ; sans le paramètre, `inline` pour l'affichage direct
  dans `<img>`/`<iframe>`. `lib/storage.ts#getSignedUrl` étendu pour accepter
  cet en-tête (`ResponseContentDisposition`), signature passée d'un 2ᵉ
  paramètre positionnel (`expiresIn`) à un objet d'options — aucun autre appelant
  dans le repo, changement sans impact.
- Téléchargement déclenché via `window.open(url, "_blank", "noopener")` : l'en-tête
  `Content-Disposition: attachment` force le téléchargement quel que soit
  l'onglet cible, pas besoin de l'attribut `download` d'un `<a>` (peu fiable
  cross-origin).
- Clic sur une ligne de document (`DocumentsExplorer.tsx`) ouvre la modale ; le
  clic droit (menu contextuel, ITEM-029) et le glisser-déposer restent
  disponibles sur la même ligne sans conflit (événements distincts).

Fichiers : `lib/storage.ts` (`GetSignedUrlOptions`),
`app/api/documents/[id]/route.ts` (`GET`), `components/documents/DocumentPreview.tsx`,
`components/documents/DocumentsExplorer.tsx` (ouverture au clic).

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint` (ciblé), `npx next
build`, `curl` sur `GET /api/documents/[id]` (serveur de dev déjà lancé) confirmant
un `401 {"error":"Non authentifié."}` propre côté route handler. Pas de
vérification fonctionnelle authentifiée (aperçu image/PDF réel, téléchargement
réel) — à couvrir par `backlog-test`.

## Captures attendues
Prévisualisation d'une image et d'un PDF dans une modale ; document non
prévisualisable affichant l'icône de repli avec le téléchargement comme seule
action ; téléchargement déclenché avec le nom de fichier original.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : modale de prévisualisation (image/PDF via
  URL signée inline), bouton Télécharger (URL signée `attachment` + nom original),
  repli icône+téléchargement pour les types non prévisualisables. Fichiers :
  `lib/storage.ts`, `app/api/documents/[id]/route.ts`,
  `components/documents/DocumentPreview.tsx`,
  `components/documents/DocumentsExplorer.tsx`.
