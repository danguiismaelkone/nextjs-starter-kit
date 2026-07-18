# Certificats TLS (`nginx/certs/`)

`nginx.conf` attend `fullchain.pem` et `privkey.pem` dans ce dossier — jamais commis
au repo (`.gitignore`).

## Production

Utilisez [Let's Encrypt](https://letsencrypt.org/) (ex. `certbot`) et copiez les
fichiers générés ici, ou montez le dossier de certificats de votre solution
d'hébergement à la place de `./nginx/certs`.

## Test local

```bash
mkdir -p nginx/certs
openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout nginx/certs/privkey.pem \
  -out nginx/certs/fullchain.pem \
  -days 365 \
  -subj "/CN=localhost"

docker compose --profile production up --build
```

Le navigateur affichera un avertissement de certificat auto-signé — attendu en local.
