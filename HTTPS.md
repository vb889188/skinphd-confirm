# Cloudflare HTTPS for SkinPhD Confirm

Origin: droplet `139.59.183.201`  
App: Docker maps `80:8080` and `8080:8080` (HTTP only)

## DNS
Cloudflare → relpdev.uk → DNS

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | confirm | 139.59.183.201 | Proxied (orange cloud) |

Do not use a grey-cloud record if you want the Cloudflare padlock.

## SSL/TLS (padlock first)
SSL/TLS → Overview → **Flexible**

Visitor ↔ Cloudflare is HTTPS.  
Cloudflare ↔ droplet is HTTP on port 80.

That matches the current container. Use this until an origin certificate is installed.

## If you still see 503
1. Droplet: `curl -I http://127.0.0.1:80` and `curl -I http://127.0.0.1:8080` must return 200.
2. DigitalOcean firewall and `ufw allow 80/tcp`.
3. Cloudflare → Rules → Origin Rules: hostname `confirm.relpdev.uk` → destination port `80`.
4. SSL mode must not be **Full (strict)** while the origin has no certificate.

## Full (strict) later
1. Cloudflare → SSL/TLS → Origin Server → Create certificate for `confirm.relpdev.uk`.
2. Put nginx or Caddy in front of Docker on 443 with that origin cert.
3. Switch SSL mode to **Full (strict)**.

Do not turn on **Full (strict)** on HTTP-only Docker. That is what caused 503 before.
