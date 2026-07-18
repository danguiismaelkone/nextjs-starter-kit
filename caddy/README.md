# Reverse proxy White Label (`caddy/`)

Alternative à `nginx/` (ITEM-064) pour les déploiements qui utilisent le domaine
personnalisé par organisation (ITEM-068, `/settings/organizations/[id]/domain`) :
`nginx.conf` sert un seul domaine avec un certificat monté manuellement, ce qui ne
convient pas à un nombre arbitraire de domaines clients ajoutés dynamiquement depuis
l'application. Caddy demande et renouvelle automatiquement un certificat Let's
Encrypt par domaine (`on_demand_tls`), sans redémarrage ni configuration manuelle par
domaine.

**Les deux profils sont mutuellement exclusifs** — les deux écoutent sur 80/443,
n'en démarrer qu'un seul :

```bash
# Sans domaines personnalisés (défaut, un seul domaine — ITEM-064)
docker compose --profile production up --build

# Avec domaines personnalisés (White Label — ITEM-068)
docker compose --profile white-label up --build
```

## Fonctionnement

1. Un admin renseigne un domaine dans `/settings/organizations/[id]/domain` et pointe
   un CNAME vers le domaine de la plateforme (`BETTER_AUTH_URL`).
2. Une fois le CNAME actif, la première requête HTTPS sur ce domaine atteint Caddy,
   qui interroge `GET /api/domains/verify?domain=<host>` (réseau Docker interne) avant
   d'émettre un certificat — refuse tout domaine non enregistré comme
   `Organization.customDomain` (évite d'émettre des certificats pour des domaines
   arbitraires au nom de la plateforme).
3. Caddy obtient et stocke le certificat (volume `caddy_data`), le renouvelle
   automatiquement par la suite.

## Test local

Émettre de vrais certificats Let's Encrypt exige un domaine public dont le DNS pointe
réellement vers la machine qui exécute Caddy (challenge HTTP-01) — impossible à
tester avec un domaine `localhost`/interne. Pour vérifier le reverse-proxy lui-même
sans dépendance réseau externe, utilisez l'endpoint interne de Caddy en HTTP simple
avant d'activer `on_demand_tls`, ou testez `GET /api/domains/verify` directement
(voir `app/api/domains/verify/route.ts`).
