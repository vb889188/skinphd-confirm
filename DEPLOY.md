# Automated deployment

The live host is the DigitalOcean droplet at `139.59.183.201:8080`.

## Droplet self-update

```bash
/opt/skinphd-confirm/scripts/droplet-update.sh
```

## GitHub Actions

Add secrets DROPLET_HOST, DROPLET_USER, DROPLET_SSH_KEY and variable DEPLOY_TO_DROPLET=true.
