# Setting up a MediFlow clinic server

For an **offline clinic** (operating mode `offline`): one reception PC runs MediFlow for the whole branch, and staff open it from any PC on the clinic network. See `OFFLINE_SYNC_CONTRACT.md` for how it syncs with the cloud.

## What you need

| Item | Notes |
|------|-------|
| A Windows PC for reception | Always on during clinic hours. Give it a **fixed address** in the router (for example `192.168.10.10`) so staff always use the same link. |
| Python 3.12 or newer | python.org, tick "Add to PATH". |
| MySQL Server 8 | With the `mysql` command on PATH. |
| The MediFlow folder | This repository, including the `dist-node` folder (the web app; see step 2). |
| A node token | From Apex, for this clinic and branch (step 1). |
| Internet, once | For the first copy of the clinic's data (the seed). After that the clinic works without it. |

## Steps

### 1. Apex issues the node token (on the cloud)

```powershell
python manage.py issue_sync_node --tin <clinic TIN> --branch "<branch name>" --label "Reception PC"
```

The token is shown once. The clinic must already be set to offline mode: the manager requests it, Apex approves it, and it takes effect when the seed in step 4 finishes.

### 2. Build the web app (on a developer PC)

```powershell
npm run build:node
```

This makes `dist-node/` (plain files, no Node.js needed on the clinic PC). Copy it next to the `BackEnd` folder on the reception PC.

### 3. Install (on the reception PC)

Open PowerShell **as Administrator** in the MediFlow folder:

```powershell
powershell -ExecutionPolicy Bypass -File clinic-node\install_clinic_node.ps1
```

It asks for the clinic TIN, branch name, node token and two passwords (a new one for the local database, and the MySQL `root` password, used only to create that database). Then it installs the backend, creates the database, opens the firewall port for **private networks only**, runs the seed, and puts a **MediFlow** shortcut on the desktop. Add `-AutoStart` to start MediFlow when the PC user signs in.

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

## If something is wrong

| Problem | What to do |
|---------|------------|
| "MySQL is not running" | Start the MySQL service, or run the shortcut as Administrator so it can. |
| Other PCs cannot connect | Use the address the window prints; check the firewall rule "MediFlow Clinic Server"; make sure the PC is on a **private** network profile. |
| Pages do not load | The `dist-node` folder is missing or old. Rebuild and copy it (step 2). |
| "Not linked to the cloud" | `CLOUD_API_URL`, `NODE_TOKEN` or `NODE_CLINIC_TIN` is empty in `BackEnd\.env`. |
| After restoring a backup | Run `python manage.py flag_node_restore --tin <TIN> --branch <branch>`, then have the manager sync. |

## Known limits (v1)

- Backups are **not** automated yet (phase 4). Until then, copy the database dump to another disk daily.
- There is no tray icon; the server window is the status.
- Staff accounts are managed on the cloud. Accounts created or changed on the clinic server are not sent to the cloud.
- The installer has been checked for syntax and its parts tested separately, but it has not been run on a clean PC.
