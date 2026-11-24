# Setting up a MediFlow clinic server

For an **offline clinic** (operating mode `offline`): one reception PC runs MediFlow for the whole branch, and staff open it from any PC on the clinic network. See `OFFLINE_SYNC_CONTRACT.md` for how it syncs with the cloud.

## What you need

| Item | Notes |
|------|-------|
| A Windows PC for reception | Always on during clinic hours. Give it a **fixed address** in the router (for example `192.168.10.10`) so staff always use the same link. |
| Python 3.12 or newer | python.org, tick "Add to PATH". |
| MySQL Server 8 | With the `mysql` and `mysqldump` commands on PATH (they come with the server). |
| The MediFlow folder | This repository, including the `dist-node` folder (the web app; see step 2). |
| A node token | From Apex, for this clinic and branch (step 1). |
| A second disk or USB drive | For backup copies. Strongly recommended: a single PC disk must not be the only home of the clinic's data. |
| Internet, once | For the first copy of the clinic's data (the seed). After that the clinic works without it. |

## Steps

### 1. Apex approves the change and issues the node token (on the cloud)

The manager requests **offline mode** in MediFlow (Operating mode). In the Apex console, open **Ops mode requests**, approve the request, then press **Clinic server** on that row and **Issue token** for the branch. The token is shown once; give it to the clinic. (The command line does the same: `python manage.py issue_sync_node --tin <clinic TIN> --branch "<branch name>"`.)

Approving does **not** switch the clinic. It keeps working on the cloud until its server is installed and the initial seed in step 4 finishes; the request then shows as applied. The branch name in the token must match the one entered at install.

### 2. Build the web app (on a developer PC)

```powershell
npm run build:node
```

This makes `dist-node/` (plain files, no Node.js needed on the clinic PC). Copy it next to the `BackEnd` folder on the reception PC.

### 3. Install (on the reception PC)

Open PowerShell **as Administrator** in the MediFlow folder:

```powershell
powershell -ExecutionPolicy Bypass -File clinic-node\install_clinic_node.ps1 -BackupCopyDir E:\MediFlowBackups
```

It asks for the clinic TIN, branch name, node token and two passwords (a new one for the local database, and the MySQL `root` password, used only to create that database). Then it installs the backend, creates the database, opens the firewall port for **private networks only**, runs the seed, and puts a **MediFlow** shortcut on the desktop. Add `-AutoStart` to start MediFlow when the PC user signs in. `-BackupCopyDir` is the second disk or USB drive for backups; the installer also schedules a backup every 4 hours and takes the first one.

The installer can be run again; it keeps what already exists.

### 4. First start

Open the **MediFlow** shortcut. It starts MySQL if needed, updates the database, starts the server, and opens the browser. The window it shows must stay open while the clinic works.

- On this PC: `http://127.0.0.1/`
- On other PCs: `http://<the fixed address>/` (the window prints it)

If the seed did not finish during install, run it by hand once the PC has internet:

```powershell
BackEnd\venv\Scripts\python BackEnd\manage.py node_sync --seed
```

Staff sign in with the same usernames and passwords as on the cloud.

## Every day

- Work normally; nothing needs the internet.
- At the end of the day the **manager** opens **Sync** and presses **Sync now** (push, then pull). If the PC loses power or the sync fails, press **Retry**.
- A clinic that goes too long without syncing (7 days, or 2 days near the payment due date) is closed to staff until the manager syncs.

## Backups

**Sync is not a backup.** Until the day's work reaches the cloud, this PC holds the only copy.

- A database backup runs **every 4 hours** (Windows Task Scheduler task "MediFlow Backup") and **right before every sync**. Backups are compressed files named `mediflow-<date>-<time>-<reason>.sql.gz` in the `backups` folder next to `BackEnd`, and are copied to the second disk if one is set.
- The last 24 hours of backups are kept, then one per day for 7 days.
- Every backup is checked after it is made. A broken one is thrown away and never replaces a good one.
- The manager sees **Backup OK / old / failed / none yet** on the **Sync** page, with the last backup time and whether the second copy worked, and can press **Back up now**.
- A failed backup before a sync does **not** stop the sync (so a broken backup tool cannot lock the clinic out), but it is shown in red. Fix it the same day.

### Encryption and an off-site copy

- **Encryption.** Every backup is encrypted (AES-256) with the **backup passphrase**. The installer generates it and shows it **once**; write it down and give it to the manager. **Without the passphrase no backup can be restored, by anyone.** It is also saved in `BackEnd\.env`, but that file lives on the PC that may be the thing that failed.
- **Off-site copy (optional, recommended).** Each encrypted backup can also be uploaded to storage outside the clinic, so a fire or theft does not take the backups with the PC. Any S3-compatible service works (Cloudflare R2, Backblaze B2, AWS S3, MinIO). Create a bucket and an access key limited to that bucket, then fill in `BACKUP_S3_ENDPOINT`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY` and `BACKUP_S3_SECRET_KEY` in `BackEnd\.env`. **Only encrypted backups are ever uploaded**; with no passphrase set, nothing is sent. The upload never blocks a backup: if the internet is down the local copy is still made and the Sync page shows "Off-site copy failed".
- Old off-site copies are not deleted by MediFlow. Add a lifecycle rule on the bucket (for example, delete after 30 days).
- The Sync page shows **Encrypted / Not encrypted** and **Off-site copy OK / failed / none**.

### Restoring after a disk failure

The full procedure, for each situation, is in **`CLINIC_RESTORE_KIT.md`** (keep a printed copy with the backups). In short, on the new or repaired PC install (steps 2-3), then restore the newest backup and sync:

```powershell
powershell -ExecutionPolicy Bypass -File clinic-node\restore_clinic_node.ps1
```

The script checks the backup first and asks you to type `RESTORE`. `manage.py verify_backup` checks your backups any time without touching the database.

This **replaces everything** in the local database. Afterwards staff cannot sign in until the manager runs **Sync**, which brings the restored copy and the cloud back together. Anything done after the backup and before the failure is lost, so the Sync page always shows the time of the last backup honestly.

## If something is wrong

| Problem | What to do |
|---------|------------|
| "MySQL is not running" | Start the MySQL service, or run the shortcut as Administrator so it can. |
| Other PCs cannot connect | Use the address the window prints; check the firewall rule "MediFlow Clinic Server"; make sure the PC is on a **private** network profile. |
| Pages do not load | The `dist-node` folder is missing or old. Rebuild and copy it (step 2). |
| "Not linked to the cloud" | `CLOUD_API_URL`, `NODE_TOKEN` or `NODE_CLINIC_TIN` is empty in `BackEnd\.env`. |
| After restoring a backup | `restore_backup` already requires a sync. If you restored another way, run `python manage.py flag_node_restore --tin <TIN> --branch <branch>`. |
| "Backup failed: mysqldump was not found" | Add MySQL's `bin` folder to PATH, or set `MYSQLDUMP_PATH` in `BackEnd\.env`. |
| "Second copy missing" | The USB drive is unplugged or full. Plug it in and press **Back up now**. |

## Known limits (v1)

- A lost backup passphrase cannot be recovered. Keep it with the manager, separate from the PC.
- There is no tray icon; the server window is the status.
- Staff accounts are managed on the cloud. On a clinic server only passwords can be changed (and that change is sent to the cloud at the next sync); adding, removing or changing the role of staff is done on the cloud and arrives with the next sync.
- Deleting a record (a supplier, a medicine, a service...) is carried to the other side at the next sync. A deleted record's name or code can be used again straight away.
- The installer and the real `mysqldump` / restore have been checked for syntax and tested with simulated dumps, but not yet run on a clean PC against a real MySQL.
