# Automated deployment

The live host is https://confirm.relpdev.uk (Cloudflare → droplet 139.59.183.201).

## Droplet self-update

```bash
/opt/skinphd-confirm/scripts/droplet-update.sh
```

## GitHub Actions

Add secrets DROPLET_HOST, DROPLET_USER, DROPLET_SSH_KEY and variable DEPLOY_TO_DROPLET=true.
