# Clinic restore kit

What to do when a clinic server fails. Read it **before** you need it, and keep a printed copy with the kit.

For how the server is set up and how backups work, see `CLINIC_NODE_SETUP.md`. The rules behind this page are in `OFFLINE_SYNC_CONTRACT.md` (section 11).

## Which situation is it?

| What happened | What to do | What can be lost |
|---------------|-----------|------------------|
| The database is damaged or wrong, but the PC works | **A.** Restore on the same PC | Work since the last backup that was not yet synced |
| The PC or its disk died | **B.** New PC, then restore | Work since the last backup that was not yet synced |
| No usable backup exists | **C.** Start again from the cloud | **Everything since the last successful sync** |

The Sync page always shows the time of the **last backup** and the **last sync**. Those two times are the honest answer to "what did we lose?".

## The kit (keep it somewhere other than the reception PC)

1. **The MediFlow folder**, including `dist-node` (a zip copy is fine).
2. **Backups** on the second disk or USB drive (`mediflow-<date>-<time>-<reason>.sql.gz`).
3. **A copy of `BackEnd\.env`**, kept private (it holds the database password and the node token). If it is lost it is not a disaster: Apex issues a new token (Ops mode requests, Clinic server, replace the token) and you choose a new database password at install.
4. **The clinic TIN and branch name**, and how to reach Apex.
5. **This page**, printed.

## A. Restore on the same PC

1. Close MediFlow (the server window).
2. Plug in the second disk or USB drive if the backup is on it.
3. Open PowerShell **as Administrator** in the MediFlow folder:

   ```powershell
   powershell -ExecutionPolicy Bypass -File clinic-node\restore_clinic_node.ps1
   ```

   It uses the newest backup it finds (add `-BackupFile <path>` to pick one, or `-From <folder>`). It **checks the backup first**, asks you to type `RESTORE`, replaces the database, and marks the server as needing a sync.
4. Start MediFlow (the desktop shortcut).
5. The **manager** signs in and presses **Sync now**. Staff cannot sign in until this sync finishes; that is intended.
6. Run the checks at the end of this page.

If the newest backup is reported damaged, run it again with `-BackupFile` pointing at the next one down. An older backup loses more, but a damaged one loses everything.

## B. A new PC

1. Install **Python 3.12+** and **MySQL Server 8** (with its command-line tools on PATH).
2. Copy the MediFlow folder onto the PC (including `dist-node`), and `BackEnd\.env` if you have it.
3. Run the installer **without the seed** (the restore replaces it):

   ```powershell
   powershell -ExecutionPolicy Bypass -File clinic-node\install_clinic_node.ps1 -SkipSeed -BackupCopyDir E:\MediFlowBackups
   ```

   If `.env` was lost, the installer asks for the TIN, branch, node token (from Apex) and a new database password.
4. Plug in the drive with the backups and follow **A** from step 3.
5. Give the new PC the same fixed network address as the old one, so staff keep using the same link.

## C. No usable backup

Only if every backup is missing or damaged. The cloud holds everything up to the **last successful sync**; nothing after it exists anywhere else.

1. Install as in **B**, but let the installer run the seed (do not use `-SkipSeed`). It copies the clinic's data from the cloud.
2. Tell the clinic plainly that work since the last successful sync (shown on the Apex console under Clinic server) is gone, and that paper records for that period need to be entered again.

## After any restore: checks

- [ ] The manager completed **Sync now** and it says complete.
- [ ] The latest patients, visits and payments you expect are there; today's payments match the cash book.
- [ ] Stock levels of a few medicines match the shelf (stock is rebuilt from its movement history).
- [ ] The Sync page shows a recent **Backup OK**, and the second disk shows **Second copy OK**.
- [ ] The Conflicts list is empty or reviewed.
- [ ] You wrote down the time of the backup you restored from, and told the clinic what that means.

## Restore drill (every quarter)

A backup that has never been restored is only a hope.

1. Once a month, run `BackEnd\venv\Scripts\python BackEnd\manage.py verify_backup`. It checks every backup in both places is readable and complete, and fails if the newest is bad. It does not touch the database.
2. Once a quarter, do a **real restore on a spare PC** following **B** with the newest backup from the second disk, sign in as the manager, and check a few records. Do not do this on the live PC.
3. Write down the date, who did it, and what the backup time was. If anything surprised you, fix the kit and this page.

## Known limits

- Backups are not encrypted, and the cloud does not hold a copy of them yet (planned). Keep the second disk somewhere safe.
- The restore script and a real `mysqldump` backup have been tested with simulated dumps. Do the first drill soon, on a spare PC, before you depend on it.
