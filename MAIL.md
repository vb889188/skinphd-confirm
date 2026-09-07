# SkinPhD Confirm mail

Without SMTP, Confirm still opens the mail app.

To send from the droplet, put this in `/opt/skinphd-confirm/.env` and recreate the container:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=SkinPhD Confirm <your-gmail@gmail.com>
```

Gmail: Google Account → Security → App passwords (2FA must be on).

```bash
cd /opt/skinphd-confirm
docker compose up --build -d
```

Then Add person and Email new PIN should send without opening the mail app. A toast says “emailed”.

Do not commit the app password.
