# Turso setup

Turso is the app's only writable store. A device without a URL and token shows a setup screen and can't be used until connected.

Either use the web dashboard (turso.tech: create a database named `shlomot`, copy its URL and generate a full-access token) or the CLI. The CLI install script needs Linux/macOS, so on Windows run it inside WSL (plain PowerShell fails):

1. Install the CLI and log in: `turso auth login` (see docs.turso.tech/cli).
2. Create the database: `turso db create shlomot`.
3. Get the URL: `turso db show shlomot --url` (looks like `libsql://shlomot-<you>.turso.io`).
4. Create a token: `turso db tokens create shlomot`.

Then, on each device, open the app, paste the URL and token, tap "חיבור". The app creates the tables itself.

Notes:
- The URL and token are stored in that device's localStorage only. Nothing is built into the app or committed. Anyone holding the token can read and write the database, so keep it private; revoke it with `turso db tokens invalidate shlomot` if lost.
- Writes go to Turso first (cascades in one batch) and then into the device's cache. Offline, a save shows an error and nothing is stored. The cache (IndexedDB) is replaced by a full snapshot on start, when back online and when the app is shown again; it is only for browsing offline.
- There are no backups in the app. Take them from Turso if needed (`turso db shell shlomot .dump`).
- Disconnecting a device clears its saved URL/token and empties its cache; the cloud data is untouched.
