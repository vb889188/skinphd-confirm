# Cloudflare HTTPS for SkinPhD Confirm

Origin: droplet `139.59.183.201`  
App: Docker maps `80:8080` and `8080:8080` (HTTP only)

## DNS
Cloudflare → relpdev.uk → DNS

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | confirm | 139.59.183.201 | Proxied (orange cloud) |

Delete any AAAA for `confirm`.

## Option A — Flexible (hostname only)
Do not change SSL/TLS Overview for the whole zone.

Rules → Configuration Rules → hostname `confirm.relpdev.uk` → SSL **Flexible**.

Visitor ↔ Cloudflare is HTTPS. Cloudflare ↔ droplet is HTTP on port 80.

## Option B — Origin Certificate + Full (strict) for Confirm
1. Cloudflare → SSL/TLS → **Origin Server** → Create certificate.
2. Hostnames: `confirm.relpdev.uk`
3. Leave Cloudflare as the CA. Create.
4. Copy **Origin Certificate** to the droplet as `/etc/ssl/cloudflare/origin.pem`
5. Copy **Private Key** to `/etc/ssl/cloudflare/origin.key`
6. On the droplet:

```bash
sudo mkdir -p /etc/ssl/cloudflare
sudo chmod 600 /etc/ssl/cloudflare/origin.key
sudo apt-get update && sudo apt-get install -y nginx
sudo cp /opt/skinphd-confirm/deploy/origin-nginx.conf /etc/nginx/sites-available/confirm
sudo ln -sf /etc/nginx/sites-available/confirm /etc/nginx/sites-enabled/confirm
sudo nginx -t && sudo systemctl reload nginx
sudo ufw allow 443/tcp
```

7. Configuration Rule for `confirm.relpdev.uk` → SSL **Full (strict)**  
   or leave zone Full (strict) if that is already the default.

Cloudflare then talks to the droplet on **443** with a cert Cloudflare trusts. The browser padlock is Cloudflare’s public cert, not this origin file.

Do not commit `origin.pem` or `origin.key` to Git.
