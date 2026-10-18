# Cloud sync and the iPhone app

Cloud sync keeps your **projects, to-dos, notes, commands and time entries** the same on every computer and on your iPhone. It uses a PostgreSQL database that **you** own, so nobody else ever sees your data. [Neon](https://neon.tech) is the default because it has a free plan, but any PostgreSQL 12+ database works (Supabase, Railway, your own server).

What syncs: project names, descriptions, types, favourites, links, to-dos, notes, commands and time. What stays on each computer: folder locations, your editor and terminal choices, files and git state. A project that arrives from another computer shows as *No folder* until you pick its folder with **Edit project…**.

## Set up Neon (about two minutes)

1. Sign in at [neon.tech](https://neon.tech) and create a project.
2. On the project dashboard open **Connect** and turn **Connection pooling** *off*.
3. Copy the connection string. It looks like `postgresql://user:password@ep-something.region.aws.neon.tech/neondb?sslmode=require`.

## Connect the desktop app

1. Open **Settings → Cloud sync**.
2. Choose **Neon (default)** or **Other Postgres**, and paste the connection string.
3. Press **Test connection**, then **Connect & sync**.

BluePhoenix creates its own tables (names start with `bp_`) and uploads what you have. From then on it syncs every minute, and **Sync now** does it immediately. Repeat on your other computers with the **same** connection string.

The connection string contains your password, so it is stored in your system keychain, not in BluePhoenix's data file.

**Disconnect** stops syncing and keeps your local data. Data already in the database stays there.

## The iPhone app

Install BluePhoenix on your iPhone, open **Settings**, paste the same connection string, and press **Connect & sync**.

- Pull down on the project list to sync. It also syncs when you open the app and a moment after each change.
- You can add projects, tick off and edit to-dos, edit notes, and log time on the go. Everything works offline and syncs when you are back online.
- Commands are shown for reference (long-press to copy). They run on your computer.
- To use another database, **Disconnect** and connect again.

## How conflicts are handled

If you change the same item on two devices before they sync, the **most recent change wins**. Deleting an item on one device removes it everywhere.

## Troubleshooting

- **"Last attempt failed"**: the message says why. Typical causes are a wrong password, an expired Neon branch, or no internet.
- **Authentication or pooler errors**: use the direct (non-pooled) connection string.
- **Something looks missing on one device**: press **Sync now** on both devices. Clocks that are minutes apart can reorder very close edits, so keep automatic date and time on.
