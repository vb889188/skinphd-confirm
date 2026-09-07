# SkinPhD Confirm mail

Without SMTP, Confirm opens the mail app.

Zoho (info@relpdev.uk) on the droplet — `/opt/skinphd-confirm/.env`:

```
MAIL_HOST=smtppro.zoho.com
MAIL_PORT=465
MAIL_USERNAME=info@relpdev.uk
MAIL_PASSWORD=use-the-zoho-password
MAIL_FROM=SkinPhD Confirm <info@relpdev.uk>
```

Port 465 uses SSL. Then:

```bash
cd /opt/skinphd-confirm
docker compose up --build -d
```

Do not commit `.env`. If this password was pasted in chat, rotate it in Zoho when you can.
