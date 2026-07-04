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
