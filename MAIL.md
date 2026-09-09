# SkinPhD Confirm mail

Mail is a SkinPhD-branded HTML letter (logo, forest green, gold rule) plus a plain-text copy. Footer links to [skinphd.co.za](https://skinphd.co.za).

Without SMTP, Confirm opens the mail app (plain text).

Zoho (info@relpdev.uk) on the droplet — `/opt/skinphd-confirm/.env`:

```
MAIL_HOST=smtppro.zoho.com
MAIL_PORT=465
MAIL_USERNAME=info@relpdev.uk
MAIL_PASSWORD=use-the-zoho-password
MAIL_FROM=SkinPhD Confirm <info@relpdev.uk>
CONFIRM_PUBLIC_URL=https://confirm.relpdev.uk
```

Port 465 uses SSL. Then:

```bash
cd /opt/skinphd-confirm
docker compose up --build -d
```

Do not commit `.env`. If this password was pasted in chat, rotate it in Zoho when you can.
