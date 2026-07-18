# Convention de backlog (portable)

Backlog markdown, 1 fichier par item dans `items/ITEM-XXX.md`, board dans `index.md`.

## Cycle de vie d'un item (champ `status`)
todo → in-progress → implemented → verified → tested → done
(`blocked` à tout moment si bloqué — préciser pourquoi dans le Journal.)

## Frontmatter requis
id, title, status, priority (P0..P3), type (feature|bug|chore|spike),
estimate (S|M|L|XL), depends_on (liste d'ids), created, updated (AAAA-MM-JJ).

## Sections du corps
Idée/contexte · User story · Critères d'acceptation (cases à cocher) ·
Notes techniques · Captures attendues · Journal (1 ligne datée par changement).

## Qui fait avancer le statut
- Création/MAJ d'items ............... statut `todo`           (skill `backlog`)
- Implémentation .................... `in-progress`→`implemented` (skill `backlog-implement`)
- Vérification code + critères ...... `verified`             (skill `backlog-verify`)
- Tests + captures d'écran .......... `tested`→`done`        (skill `backlog-test`)

Toute IA peut tenir ce contrat : lire le frontmatter, faire le travail,
cocher les critères, mettre à jour `status`/`updated` et ajouter une ligne au Journal.

## Contexte projet (décidé au cadrage)
- Stack : Next.js 16 (App Router), React 19, Prisma 7 (PostgreSQL), shadcn/ui, Tailwind 4.
- Auth : **Better Auth** (sessions, email/password, plugins reset & invitation).
- Modèle d'accès : **self-service + invitations**, rôles simples `user` / `admin`.
- E-mail : **Resend** (invitations + liens de réinitialisation).

## Cadrage SaaS Core (2026-07-16)
Ce projet évolue vers un **SaaS Core réutilisable** (base commune pour de futurs
produits SaaS). Décisions structurantes prises au cadrage :
- **Multi-tenant** : le socle mono-tenant existant (ITEM-001 à 012) migre vers un
  modèle `Organization` + `Membership` (voir épic A, ITEM-013). Toute nouvelle donnée
  scoped-utilisateur doit être pensée scoped-organisation dès sa conception.
- **Périmètre** : backlog couvrant tout le roadmap cible dès cette passe (MVP → V1 →
  V2 → V3 → Enterprise → IA → White Label), voir la table Roadmap dans `index.md`.
  Certains items avancés (IA, Enterprise, White Label) resteront à affiner une fois
  leurs dépendances livrées.
- **Stack ajoutée** : Stripe (billing), stockage S3-compatible (MinIO/R2/S3, documents),
  Firebase (notifications push), Docker/Nginx (déploiement).
- **Modules FATIHOUNE** : le registre `~/.claude/modules/_registry.json` couvre une
  bonne partie de ces épics (`multi-tenant`, `billing`, `roles-permissions`,
  `notifications`, `upload`, `user-profile`, `user-settings`, `superadmin`,
  `datatable`, `theme-config`). Les items concernés le mentionnent dans leurs Notes
  techniques ; à l'implémentation, adapter ces modules à l'existant (Better Auth
  custom déjà en place) plutôt que les installer en écrasant le code livré.
