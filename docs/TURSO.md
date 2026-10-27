# Turso sync setup (optional)

The app works fully without this. Sync only starts once a database URL and token are pasted into Settings → sync.

1. Install the CLI and log in: `turso auth login` (see docs.turso.tech/cli).
2. Create the database: `turso db create shlomot`.
3. Get the URL: `turso db show shlomot --url` (looks like `libsql://shlomot-<you>.turso.io`).
4. Create a token: `turso db tokens create shlomot`.
5. On each device, open Settings → sync, paste the URL and token, tap "חיבור". The app creates the tables itself.

Notes:
- The URL and token are stored in that device's localStorage only. Nothing is built into the app or committed. Anyone holding the token can read and write the database, so keep it private; revoke it with `turso db tokens invalidate shlomot` if lost.
- Sync is last-write-wins by `updatedAt`; deletions travel as `deleted_at` rows. Backup/import in Settings still works and syncs like any other edit.
- Disconnecting a device only clears its saved URL/token; local data stays.
