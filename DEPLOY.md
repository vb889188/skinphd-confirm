# Automated deployment

The live host is the DigitalOcean droplet at `139.59.183.201:8080`.
This workspace cannot SSH into that machine. Choose one of the flows below.

## 1. GitHub Actions to the droplet

1. Create a deploy SSH key on the droplet.
2. Add GitHub Actions secrets `DROPLET_HOST`, `DROPLET_USER`, `DROPLET_SSH_KEY`.
3. Set Actions variable `DEPLOY_TO_DROPLET=true` to deploy on every main push, or use Run workflow.

## 2. Droplet self-update

```bash
chmod +x /opt/skinphd-confirm/scripts/droplet-update.sh
/opt/skinphd-confirm/scripts/droplet-update.sh
```
