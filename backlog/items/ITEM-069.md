---
id: ITEM-069
title: Thème et branding complet White Label
status: implemented
priority: P3
type: feature
estimate: M
depends_on: [ITEM-049]
created: 2026-07-16
updated: 2026-07-17
---

## Idée / contexte
Le branding de base (ITEM-049) couvre logo et couleur primaire. Un client White Label a
besoin d'aller plus loin (typographie, favicon, e-mails) pour une expérience
indistinguable d'un produit propriétaire.

## User story
En tant qu'admin d'une organisation White Label, je veux personnaliser entièrement
l'apparence, afin que la plateforme soit indistinguable d'un produit propriétaire.

## Critères d'acceptation
- [x] Extension de la personnalisation de marque (ITEM-049) à la typographie, au
      favicon et à l'expéditeur/template des e-mails transactionnels (ITEM-005).
- [x] Toute mention de la marque d'origine est masquable pour les organisations sur un
      plan White Label.

## Notes techniques
**Schéma** — `Organization.fontFamily`/`favicon`/`emailFromName String?` +
`hideOriginBranding Boolean @default(false)` (migration
`20260717090000_add_organization_white_label_branding`, appliquée via `prisma migrate
deploy` — `migrate dev` indisponible en environnement non interactif ici, même
contrainte que les migrations précédentes de cette session).

**Plan "White Label"** : critère 2 dit explicitement "réservé aux organisations sur un
plan White Label" — un plan de plus, ajouté au seed à côté de Starter/Pro/Enterprise
(ITEM-066). `lib/billing.ts` factorisé : `organizationHasPlan(organizationId,
planName)` interne, `isEnterpriseOrganization`/`isWhiteLabelOrganization` (nouveau) en
fines enveloppes — évite de dupliquer une troisième fois la même requête
Prisma/logique. Le critère 1 (typographie/favicon/expéditeur), lui, n'est **pas** gardé
par plan, exactement comme le branding de base d'ITEM-049 dont il est l'extension.

**Typographie** (`lib/theme.ts`) : `buildBrandingStyle(primaryColor, fontFamily)`
étendu pour poser aussi `--font-sans` (même mécanisme de surcharge CSS que
`--primary`, protected layout uniquement — pages publiques non affectées).
`isValidFontFamily` (garde-fou défensif, la validation faisant foi est côté serveur
dans `lib/validators/organization.ts`) — la valeur est de toute façon posée via l'objet
`style` React (pas de concaténation dans une chaîne HTML/CSS), donc pas un vecteur
d'injection, mais une valeur absurde ne doit pas non plus polluer silencieusement le
DOM.

**Favicon** : `generateMetadata()` ajouté à `app/(protected)/layout.tsx` — retourne
`icons.icon` depuis `Organization.favicon` (toujours actif, critère 1) et `title` depuis
le nom de l'organisation seulement si `hideOriginBranding` est actif (critère 2).
`getCurrentOrganization()` passe désormais par `React.cache()` (`lib/organization.ts`)
pour ne pas dupliquer la résolution session+Prisma entre `generateMetadata` et le
composant de layout — appelée deux fois par requête depuis cet item.

**Expéditeur des e-mails** : `lib/email.ts#sendEmail` accepte un `fromName` optionnel,
préfixé à `EMAIL_FROM` (`"<nom> <adresse>"`) — **l'adresse d'envoi elle-même reste
celle de la plateforme**, jamais fournie par l'organisation : personnaliser l'adresse
exigerait une vérification de domaine d'envoi (SPF/DKIM), hors périmètre de cet item M
(documenté comme décision, pas oubli). `emailFromName` validé côté serveur sans retour
à la ligne ni `<`/`>` (`lib/validators/organization.ts`) — sinon une valeur malveillante
pourrait casser la construction de l'en-tête `From` ou injecter un en-tête SMTP
arbitraire. Câblé uniquement sur `sendInvitationEmail` (le seul flux d'e-mail
transactionnel avec un contexte d'organisation net à l'appel — `app/(protected)/
admin/invitations/actions.ts`) ; `sendPasswordResetEmail` (pré-authentification,
aucune organisation encore choisie) et `notify()` (notifications par utilisateur, pas
scopées par organisation) restent volontairement non brandés — deviner une
organisation "probable" pour ces flux aurait été plus risqué qu'utile.

**Masquage de la marque d'origine** (critère 2) : recherche exhaustive dans le code
d'un texte qui identifierait réellement "la marque d'origine" — ce starter kit n'en
embarque quasiment aucun. Un seul trouvé : le titre de page par défaut
("Create Next App", `app/layout.tsx`, jamais personnalisé). `hideOriginBranding`
(gardé plan White Label dans `updateBrandingAction`) le remplace par le nom de
l'organisation via `generateMetadata` ci-dessus. Le repli `"nextjs-starter-kit"` dans
`OrgSwitcher.tsx` a été écarté comme cible : il ne s'affiche QUE quand aucune
organisation active n'existe, ce qui rend incohérent de le masquer "pour les
organisations sur un plan White Label" (il n'y a alors justement aucune organisation
dont lire le plan).

**UI** : `BrandingForm.tsx` (même page qu'ITEM-049, extension directe — cohérent avec
le libellé du critère 1) étendu avec police/favicon/expéditeur (ouverts à tous) et un
`Switch` "Masquer la marque d'origine" désactivé + message d'upsell hors plan White
Label (même schéma que `/roles` ITEM-066).

Fichiers : `prisma/schema.prisma`, `prisma/migrations/
20260717090000_add_organization_white_label_branding/`, `prisma/seed.ts`,
`lib/billing.ts`, `lib/billing.test.ts`, `lib/theme.ts`, `lib/theme.test.ts` (nouveau),
`lib/email.ts`, `lib/email.test.ts` (nouveau), `lib/organization.ts`,
`lib/validators/organization.ts`, `app/(protected)/layout.tsx`, `app/(protected)/
settings/organizations/[id]/branding/page.tsx`, `app/(protected)/settings/
organizations/[id]/branding/actions.ts`, `components/tenant/BrandingForm.tsx`,
`app/(protected)/admin/invitations/actions.ts`.

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint .`, `npx vitest run` (60
tests, dont 15 nouveaux : `isWhiteLabelOrganization`, `isValidFontFamily`/
`buildBrandingStyle` étendu, `sendEmail` avec `fromName`), `npx next build`, `npx tsx
prisma/seed.ts` (plan "White Label" créé). Testé en conditions réelles avec `next dev` :
connecté en tant qu'owner de l'organisation de démo (hors plan White Label), la page
`/settings/organizations/[id]/branding` affiche bien les nouveaux champs
(police/favicon/expéditeur) et le message "Réservé aux organisations sur le plan White
Label" pour le switch désactivé.

## Captures attendues
Application affichant une typographie/favicon personnalisés (organisation avec
`fontFamily`/`favicon` renseignés) ; page branding d'une organisation hors plan White
Label montrant le switch désactivé + message d'upsell ; page branding d'une
organisation sur le plan White Label avec le switch actif et le titre de page
remplacé par le nom de l'organisation ; e-mail d'invitation envoyé avec le nom
d'expéditeur personnalisé.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-17 (implement) — démarrage
- 2026-07-17 (implement) — implémenté : nouveaux champs `Organization`
  (fontFamily/favicon/emailFromName/hideOriginBranding, schéma + migration), plan
  "White Label" (seed + `isWhiteLabelOrganization`, `lib/billing.ts` factorisé),
  typographie/favicon appliqués via le layout protégé (`generateMetadata` +
  `buildBrandingStyle` étendu), expéditeur d'e-mail personnalisable sur les
  invitations (`sendEmail` avec `fromName`, adresse d'envoi elle-même non
  personnalisable — décision documentée), masquage du titre de page par défaut
  gardé au plan White Label (seule mention réelle de marque d'origine trouvée dans
  le code). UI étendue sur la page branding existante (ITEM-049). Fichiers listés
  en Notes techniques.
