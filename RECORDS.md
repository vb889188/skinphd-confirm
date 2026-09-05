# SkinPhD Confirm records

This system keeps signed employee agreements on record when printed pages are missing or not practical.

## What is stored
- Source form wording frozen at issue
- Original uploaded .pptx / .pdf bytes (when uploaded)
- Issued fields
- Typed signatures and times
- Snapshot hash
- Reminder and email actions

## PIN
1. Head Office adds the person and sets a 4–8 digit PIN.
2. Tell the person the PIN privately.
3. They sign in and change it under Settings.
4. Lost PIN: Head Office sets a new one. Do not email PINs with the agreement pack.

## Backup
1. Settings → Export JSON after each signing day.
2. Copy that file off the server.
3. Optional: `scripts/backup-confirm.sh` reminder on the droplet.

## Email test
Gmail is not connected from this workspace yet. Test sends open the franchisee mailbox. After the last signature, Confirm opens a signed-record email to employee and franchisee.
