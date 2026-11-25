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

The token is made for you at the moment the clinic becomes offline in Apex, and shown **once** in a "Copy this token now" window:

- the manager requests **offline mode** in MediFlow and Apex approves the request in **Ops mode requests**;
- Apex creates a clinic as offline;
- a clinic that signed up as offline has its setup payment approved.

Give the token to the clinic. If it is lost, open the clinic's page in Apex, press **Clinic server**, revoke it and issue a new one (the same panel also issues tokens for a clinic that has none). The command line does the same: `python manage.py issue_sync_node --tin <clinic TIN> --branch "<branch name>"`.

**One token per branch.** Every branch has its own TIN (a branch added without one gets a generated `GEN-…` TIN) and so its own account, billing, online/offline mode and token. A TIN never changes once a branch has data, so type the real one when creating the branch.

The token is not a database login. The clinic server sends it with every sync call (`Authorization: Node <token>`); the cloud compares its hash and syncs only that branch. The manager never pastes it when pressing Sync: it lives in `NODE_TOKEN` in `BackEnd/.env` on the reception PC (the installer asks for it). If Apex revokes or replaces it, the Sync page says so in plain words and the fix is one step: put the new token in `NODE_TOKEN` and restart the server.

Approving does **not** switch the clinic. It keeps working on the cloud until its server is installed and the initial seed in step 4 finishes; the request then shows as applied. The branch name in the token must match the one entered at install.

### 2. Build the web app (on the developer PC, once per release)

**What it is.** The MediFlow web app normally runs on the cloud (Vercel) and needs Node.js. A clinic server has no Node.js, so we first turn the web app into plain files (HTML, JavaScript, images) that the clinic's own backend can hand out. That folder is called `dist-node`.

**Where.** On the PC where you develop MediFlow (the one with the project folder and `node_modules`). **Not** on the reception PC.

**How.** In the MediFlow project folder:

```powershell
npm run build:node
```

It deletes the old `dist-node` folder, builds the app with its API address set to `/api` (the same address the page was loaded from, so it talks to the clinic's own backend and never to the cloud), and writes the result to `dist-node/` in the project folder. It takes a few minutes. When it finishes, `dist-node\index.html` exists.

**Then get it onto the reception PC.** `dist-node` is not stored in git (it is rebuilt each time), so cloning the repository does not bring it. Copy the **whole MediFlow folder** to the reception PC (for example to `C:\MediFlow`) with a USB drive or a network share, and make sure it contains these three folders side by side:

```
C:\MediFlow\
  BackEnd\        the Django backend
  clinic-node\    the installer and starter scripts
  dist-node\      the web app you just built
```

**Do not copy these** (they are your developer settings, and some point at the cloud database):

- `BackEnd\.env` and any `.env.local` / `.env*` file, in the project root or in `BackEnd`. The web app does not need `.env.local` on the clinic PC (it is already built into `dist-node`), and the installer writes a fresh `BackEnd\.env` for the clinic. As a safety net the installer moves aside any `BackEnd\.env` that does not say `NODE_MODE=clinic`, but never rely on that: leave the file out.
- `node_modules` and `BackEnd\venv` (the installer builds its own `venv`; a copied one has paths from your PC and breaks).
- `BackEnd\backups` and any `__pycache__` folders.

Rebuild and recopy `dist-node` whenever the web app changes; the backend needs nothing else.

### 3. Install (on the reception PC)

**What it is.** One script that turns a plain Windows PC into the clinic server: it installs the backend's Python packages, creates the local database, writes the settings file, opens the network port, copies the clinic's data from the cloud, schedules backups and puts a **MediFlow** shortcut on the desktop. You run it once per PC.

**Before you start, have these ready:**

| Needed by the installer | Where it comes from |
|---|---|
| Python 3.12+ and MySQL Server 8 installed on this PC | Installed by you first (see "What you need" above) |
| The MediFlow folder with `BackEnd`, `clinic-node` and `dist-node` | Step 2 |
| Clinic TIN | The clinic's TIN as shown in Apex (the branch's own TIN for a branch) |
| Branch name | Exactly the branch name in the token window / Apex Clinic server panel (usually `Main`) |
| Node token | The "Copy this token now" window from step 1 |
| MySQL `root` password | Set when MySQL was installed |
| A USB drive or second disk (optional but recommended) | For backup copies, for example `E:\MediFlowBackups` |
| Internet, once | For the first copy of the clinic's data |

**How.** Open PowerShell **as Administrator** (right-click, Run as administrator) in the MediFlow folder on the reception PC:

```powershell
cd C:\MediFlow
powershell -ExecutionPolicy Bypass -File clinic-node\install_clinic_node.ps1 -BackupCopyDir E:\MediFlowBackups
```

**What it asks you, in order:**

1. *Clinic TIN* and *Branch name*: from the table above.
2. *Cloud API address*: press Enter to accept the default (the live MediFlow cloud).
3. *Node token*: paste the token (typing is hidden). This is the only place the token is entered; the installer saves it as `NODE_TOKEN` in `BackEnd\.env`.
4. *A password for the local database*: invent one. The clinic server uses it to talk to its own MySQL; nobody types it again.
5. It then shows the **backup passphrase** once. Write it down and give it to the manager, then type `YES`.
6. *MySQL root password*: used only to create the clinic's database, then forgotten.

**What it does after that, by itself:** installs the backend packages, creates the database `mediflow_clinic`, applies the database structure, opens the firewall port on **private networks only**, runs the initial seed, schedules a backup every 4 hours (and takes the first one), and adds the **MediFlow** shortcut to the desktop. Add `-AutoStart` to also start MediFlow when the PC user signs in. `-BackupCopyDir` is the second disk or USB drive for backup copies.

**How you know it worked.** The last line says `Done. Open the MediFlow shortcut. Other PCs connect to http://<address>/`. If the seed line shows a warning, the PC had no internet or the token was wrong: fix it and run `BackEnd\venv\Scripts\python BackEnd\manage.py node_sync --seed` (step 4).

The installer can be run again; it keeps what already exists (it will not ask for the token again if `BackEnd\.env` is already there, so to change the token edit `NODE_TOKEN` in that file).

**Testing on your own PC.** You can follow the same steps on your development PC to try a clinic server: use a different folder for the copy, a separate local MySQL database (not the cloud database), and set `CLOUD_API_URL=http://localhost:8000/api` so it talks to your local cloud backend. The clinic server and the cloud backend must be different databases.

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
- **Photos need the internet.** Pictures (medicine photos, radiology images, logos, chat attachments) are stored on Cloudinary, not on the clinic server. Without internet, uploading a photo shows "Photo upload needs the internet. Save without the photo, or add it later when you are online", and photos already uploaded do not display. Everything else works offline. Saving images on the clinic server itself was considered and left out: it makes the database and backups much heavier.
- Staff accounts are managed on the cloud. On a clinic server only passwords can be changed (and that change is sent to the cloud at the next sync); adding, removing or changing the role of staff is done on the cloud and arrives with the next sync.
- Deleting a record (a supplier, a medicine, a service...) is carried to the other side at the next sync. A deleted record's name or code can be used again straight away.
- The installer and the real `mysqldump` / restore have been checked for syntax and tested with simulated dumps, but not yet run on a clean PC against a real MySQL.
