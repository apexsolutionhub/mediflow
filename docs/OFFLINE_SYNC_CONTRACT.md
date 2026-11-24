# MediFlow Offline Sync Contract

**Version:** 1.2  
**Status:** Approved design (implementation in progress)  
**Audience:** Engineering partners, Apex ops, clinic IT  
**Last updated:** 2026-11-24

This document defines how **offline clinics** run MediFlow on a local server and how data moves between the **clinic node** and the **cloud**. Online-only tenants are unchanged: they always use the cloud API.

---

## 1. Goals

| Goal | Description |
|------|-------------|
| **Work without internet** | Clinic staff can register patients, collect payment, run queues, chart, lab, and pharmacy during the day on unreliable connectivity. |
| **No silent data loss** | Sync is explicit, auditable, and retryable. Failed steps block “complete” status. |
| **Cloud remains SaaS control plane** | Billing, module flags, suspend/ban/delete, and payment approval stay on Apex cloud. |
| **One writable node per branch** | Avoid multi-writer conflicts by using one reception server per branch TIN. |

---

## 2. Glossary

| Term | Meaning |
|------|---------|
| **Cloud** | Hosted MediFlow backend + MySQL used for SaaS, billing, and Apex admin. |
| **Clinic node** | Reception PC running local backend + local MySQL for one **branch TIN**. |
| **LAN** | Private clinic network; fixed IP for the clinic node (e.g. `192.168.10.10`). |
| **Sticky local** | While `ops_mode = offline`, all clinical work uses the clinic node until rules below say otherwise. |
| **Sync** | A manager-initiated job: **push** local → cloud, then **pull** cloud → local. |
| **Natural key** | Business identifier scoped by `clinic_tin` (e.g. MRN, encounter number), not database integer `id`. |
| **Days until due** | Days until free trial ends **or** quarterly subscription ends (whichever applies). |
| **Sync freshness** | Whether the clinic has synced within the allowed window (see §8). |

---

## 3. Operating modes (`ops_mode`)

Each tenant has `ops_mode`:

| Mode | Daytime behavior |
|------|------------------|
| **`online`** | All roles use cloud API only. No local clinic node for clinical writes. |
| **`offline`** | Clinical operations use the **clinic node** on the LAN. Cloud is updated via sync. |

**Rules:**

- A clinic never runs **both** cloud and local clinical writers at the same time.
- **No mid-day mode flip.** Even if Apex approves an `ops_mode` change, the new mode takes effect **only after the next successful sync**:
  - **offline → online:** after a successful final **push + pull**.
  - **online → offline:** after the clinic node is provisioned and the **initial seed pull** (§8.5) succeeds. Until then the request stays **approved, awaiting seed** and the tenant keeps working on the cloud. (v1.2: changed from "applies on approval".)
- Mode change requires **manager request** in MediFlow and **Apex approval** in `mediflow_admin` (separate **Ops mode requests** page, not mixed with payment approvals).

---

## 4. Clinic topology

```
                    ┌─────────────────────────────────────┐
                    │           Cloud (SaaS)               │
                    │  API + MySQL · Billing · Apex admin   │
                    └──────────────▲──────────────────────┘
                                   │ Push / Pull (sync)
                                   │ Billing lockout (HTTPS)
┌──────────────────────────────────┴──────────────────────────────────┐
│                        Clinic LAN (private)                            │
│                                                                      │
│   ┌──────────────────────┐      HTTP (v1)      ┌─────────────────┐ │
│   │  Reception PC         │◄───────────────────│ Doctor / Nurse  │ │
│   │  (Clinic node)        │                    │ Lab / Pharmacy  │ │
│   │  · MySQL              │                    │ Reception (web) │ │
│   │  · Django API         │                    └─────────────────┘ │
│   │  · Frontend (static)  │                                          │
│   │  · Host starter app   │                                          │
│   └──────────────────────┘                                          │
│         Fixed IP e.g. 192.168.10.10                                   │
└──────────────────────────────────────────────────────────────────────┘
```

- **One reception server per branch TIN** (multi-branch orgs = one node per branch).
- Staff browsers open **one URL** on the LAN (see §5).
- **v1 LAN security:** HTTP on an isolated clinical network (see §14). Billing during lockout always uses **cloud over HTTPS**.

---

## 5. Clinic host (reception PC)

### 5.1 Stack

| Component | Choice |
|-----------|--------|
| Database | **MySQL** (same family as cloud) |
| API | Django (same codebase as cloud, clinic deployment profile) |
| Frontend | **Option B:** production Next.js build **served by the backend** (single URL, single port) |
| Launch | Host starter: **start backend → health-check → open default browser** to frontend |

### 5.2 URLs

| Who | URL |
|-----|-----|
| Reception (on server) | `http://127.0.0.1/` or LAN IP |
| Other roles | `http://<FIXED_LAN_IP>/` |

Staff do **not** need separate `:3000` and `:8000` ports in production.

### 5.3 What the host starter does

1. Ensure MySQL service is running.
2. Start Django (serves `/api/*` and static frontend).
3. Wait until API health endpoint responds.
4. Open system default browser to the clinic URL.
5. (Recommended) Show tray icon: **Running / Stopped / Last sync / Backup status**.

---

## 6. Source of truth

| Phase | Clinical data | Billing / Apex control |
|-------|---------------|-------------------------|
| **Clinic day (offline tenant)** | **Local MySQL** on clinic node | Cloud (read on pull; write for lockout payments) |
| **After successful sync** | Cloud copy updated; local refreshed from cloud | Cloud |
| **Online tenant** | Cloud always | Cloud |

### 6.1 What Apex may change on cloud during the clinic day

- Payment approval / rejection  
- Subscription and trial status  
- Module flags  
- **Suspend / ban / delete** tenant  
- Approved **ops_mode** change (effective after next sync)

Local clinic sees these on **pull**, not instantly.

### 6.2 What must not be overwritten blindly

- **Payments** and **refunds:** append-only events; never delete or rewrite history.
- **Stock:** never copy a stock number. Every change (receive, dispense, damage, adjustment) is an **append-only stock movement** with a `sync_uuid`. Sync merges movements; `on_hand` and `loose_stock` are recomputed from them (v1.2).
- **Catalog:** cloud catalog wins on pull; local catalog edits sync up on push via upsert.

---

## 7. Natural keys (sync identity)

Sync APIs use **scope-qualified natural keys**, not raw integer primary keys.

**Scope.** A clinic node's scope is `(clinic_tin, branch_name)`. Every key below is that scope plus the business key. The TIN is always present: if a clinic signs up without one, the system **generates a unique TIN** (`GEN-` + 10 hex characters) at registration, so the scope is never blank. Branches that have their own TIN use it; branches without one share the organization TIN and are told apart by `branch_name`.

| Entity | Natural key (after scope) |
|--------|---------------------------|
| Patient | `mrn` |
| Encounter | `number` (encounter number) |
| Billable service | `code` |
| Department | `name` |
| Supplier | `supplier_name` |
| Medicine | `(name, batch_number, supplier)` |
| Staff user | `username` |
| Tenant payment submission | Normal cloud model; synced as a normal `TenantPaymentSubmission` |
| Payments, refunds, clinical orders, nurse notes, appointments, referrals, stock movements, damages | **No reliable business key** — generated `sync_uuid` (see rule) |

**Rule:** Records with no unique business key get an immutable `sync_uuid` at creation, before push, so retries never duplicate rows. `sku` is legacy and is not used for sync identity.

**Merge metadata.** Every synced model carries `updated_at` and a soft-delete marker `deleted_at` (so a delete made offline is not undone by the next pull). Ordering uses the cloud's receipt time, not the clinic PC's clock.

---

## 8. Sync protocol

### 8.1 Trigger

- **Manual:** Manager clicks **Sync now** in manager portal.
- **Reminder:** If last night’s sync was missed → **morning reminder** on manager overview.
- **Mandatory:** After PC outage or overdue freshness → staff login blocked until manager completes sync (manager may access Sync + Billing only).

### 8.2 Steps (strict order)

```
┌─────────┐     ┌─────────┐     ┌──────────┐
│  IDLE   │────►│  PUSH   │────►│   PULL   │
└─────────┘     └────┬────┘     └────┬─────┘
                     │ fail          │ fail
                     ▼               ▼
               ┌──────────┐   ┌──────────┐
               │ PUSH     │   │ PULL     │
               │ FAILED   │   │ FAILED   │
               └────┬─────┘   └────┬─────┘
                    │              │
                    └──────┬───────┘
                           ▼
                    [ Retry button ]
                           │
                           ▼
                    ┌──────────┐
                    │ COMPLETE │
                    └──────────┘
```

| Step | Action |
|------|--------|
| **1. Push** | Upsert local tenant data to cloud (merge by natural keys). |
| **2. Pull** | Only if push succeeded. Download cloud state for tenant into local MySQL. |
| **3. Complete** | Mark `last_successful_sync_at`. Apply password/role and ops_mode changes. Unblock staff login if freshness OK. |

**If pull fails:** sync is **incomplete**. Show **Retry** (retry pull from last good push, or full push+pull per implementation). Do not treat the day as synced.

**If push fails:** do **not** start pull.

### 8.3 Merge strategy (option B — upsert)

- Match rows by natural keys.
- Update if cloud row is older or field-level rules allow (e.g. encounter status forward-only).
- Insert if missing on cloud.
- Conflicts → `sync_conflict` log for manager review (no silent merge).

Per-entity rules (v1.2):

| Entity | Rule |
|--------|------|
| Payments, refunds, stock movements, damages | Append-only; insert if the `sync_uuid` is new, never update |
| Encounter, clinical order | Status moves **forward only** |
| Patient, catalog (services, medicines, suppliers, departments) | **Cloud wins** on pull; local edits upsert on push |
| Staff credentials and roles | Cloud wins |
| Rows changed locally since the last push | A pull must **not** overwrite them; they go to the next push or to `sync_conflict` |

### 8.4 Sync freshness (login gate)

Let `D` = **days until due** (trial end or subscription end).

| Condition | Max time without successful sync |
|-----------|----------------------------------|
| `D > 7` | **7 calendar days** |
| `D ≤ 7` | **2 calendar days** |

If exceeded:

- **Staff roles:** login blocked.
- **Manager:** may open **Sync** and **Billing** (if payment lockout) only until sync completes.

After **PC failure / restore:** first action when node is back = **sync** (same blocking rules).

How it is enforced (v1.2):

- The gate exists only on a **clinic server** for a tenant in `offline` mode. The cloud and online tenants are never gated.
- "Calendar days" are counted by date, from the last successful sync. A server that has **never** synced is overdue (it needs its initial seed first).
- **Staff:** sign-in is refused with a message, and a session started earlier gets `403` on every clinic API call.
- **Manager:** signs in with access mode `sync_required` and may open **Sync**, **Billing** and **Account** only; clinic API calls are refused.
- **Restore:** `manage.py flag_node_restore --tin … --branch …` (run by the restore kit) marks the server as needing a sync; the flag clears when a sync completes.

### 8.5 Initial go-live (seed)

Before first offline clinic day:

1. Provision clinic node (MySQL + backend + frontend).
2. **Full pull** from cloud: catalog, staff (hashed passwords), tenant settings, empty or existing patients per policy.
3. Manager confirms **Seed complete**, then staff may work offline.

---

## 9. Billing vs offline

| Situation | Behavior |
|-----------|----------|
| **Warning window** (trial ≤5 days, quarterly ≤10 days) | Clinical offline OK; billing icons in manager UI; payment proof may be stored **locally** and pushed on next sync. |
| **Before hard due date** | Same; local `TenantPaymentSubmission` rows sync on push as **normal** submissions. |
| **Hard payment lockout** (trial expired, grace ended, etc.) | Payment proof and approval checks hit **cloud only** (HTTPS). Manager payment portal on cloud until Apex approves. |
| **Staff during lockout** | Blocked (existing `resolve_login_access` rules). |

During a **hard lockout** the clinic server does not trust its own copy: `GET /billing/me/` and the payment-proof submit are forwarded to the cloud (`/api/sync/billing/status/` and `/billing/submit/`, node token). If the cloud is unreachable the submit fails with `503` ("needs the internet") and nothing is stored locally. In the **warning window** the proof is stored locally and sent in the next push; the cloud files it once (matched by kind and transaction reference) and returns its verdict in the push receipt, which the node mirrors.

Passwords on clinic node: **hashed** (Django-compatible), not decryptable. After pull, credential changes from cloud apply **before next login**.

### 6.3 Account UI vs connectivity (all tenants)

| Feature | Offline tenant (`ops_mode = offline`) | Online tenant (`ops_mode = online`) |
|---------|----------------------------------------|-------------------------------------|
| **Apex chat** (manager) | **Cloud only.** Available when the clinic has **internet to the cloud API**. Not served from the local node during LAN-only clinic hours. | Cloud API; same rule — requires connectivity to cloud. |
| **Change password** | **Local node, real time.** Updates the clinic MySQL user record immediately; sync **push** carries the change to cloud on the next successful sync. | Cloud API, immediate. |
| **Clinic notifications** (bell) | **Local node, real time.** Built from local `/clinic/dashboard/` stats (queues, payments, stock). No cloud round-trip during the clinic day. | Cloud API, polled from dashboard endpoint. |

**Rules:**

- Chat messages are **never** queued for later delivery on the clinic node. If cloud is unreachable, the chat UI stays disabled with an “internet required” state.
- Password change and notification bell must **not** depend on cloud reachability for offline tenants during the clinic day.
- Online tenants use cloud for all three; chat still requires live cloud connectivity (no offline queue).

---

## 10. Ops mode change workflow

```
Manager (MediFlow)          Apex (mediflow_admin)
      │                              │
      │  Request ops_mode change     │
      ├─────────────────────────────►│  Ops mode requests page
      │                              │  Approve / Reject
      │                              │
      │         Approved             │
      ◄──────────────────────────────┤
      │                              │
      │  Continue current mode       │
      │  until manager runs sync     │
      │                              │
      ▼                              │
 Successful push + pull              │
      │                              │
      ▼                              │
 New ops_mode active                 │
```

- **Offline → online:** Final sync must succeed so cloud has all local data before switching daily use to cloud.
- **Online → offline:** After approval the request is **approved, awaiting seed**. The tenant stays online until the node is provisioned and the initial **seed pull** succeeds; only then does `ops_mode` become `offline`.

---

## 11. Backup strategy (recommended)

**Sync is not backup.** A failed or delayed sync must not be the only copy of clinic data.

### 11.1 Tier 1 — Required for every offline clinic

| Item | Recommendation |
|------|----------------|
| **Automated local dump** | MySQL `mysqldump` (or Percona backup) on a schedule: **at least daily**, ideally **every 4–6 hours** during clinic hours. |
| **Secondary media** | Store dumps on **USB drive or second disk** on reception PC (rotate 7 daily files). |
| **Pre-sync backup** | Automatic dump **immediately before** each manager-initiated sync. |
| **Manager UI** | Show: `Last backup`, `Last successful sync`, `Backup OK / Missing`. |

### 11.2 Tier 2 — Strongly recommended

| Item | Recommendation |
|------|----------------|
| **Off-site when online** | If internet is briefly available, upload encrypted backup to cloud object storage (S3-compatible) **without** replacing sync — backup only. |
| **Restore drill** | Documented **Clinic restore kit**: new PC → install host → restore latest dump → manager forced sync. |
| **Backup encryption** | Encrypt dumps at rest (password or clinic-specific key stored with manager). |

### 11.3 Tier 3 — Optional later

| Item | Recommendation |
|------|----------------|
| **LAN hot spare** | Second low-cost PC with nightly replica (MySQL replication) — failover if reception disk dies. |
| **UPS** | Battery backup on reception PC + router so sync/backup can finish during short outages. |

### 11.1.1 How Tier 1 is implemented (v1.2)

- A scheduled task dumps the database **every 4 hours** and the sync runner dumps it **before every manager-started sync** (`manage.py run_backup`). Dumps are gzip files checked after writing (readable, complete); a bad dump is discarded.
- If `BACKUP_COPY_DIR` is set, each dump is copied there. An unavailable second location is a **warning**, not a failed backup.
- Retention: all dumps of the last 24 hours, then the newest of each day for `BACKUP_KEEP_DAYS` (7).
- A failed pre-sync backup **does not block** the sync (a broken backup tool must not lock a clinic out through the freshness rule); it is recorded on the sync run and shown to the manager.
- Manager UI: backup state (`ok`, `stale` after 36 hours, `failed`, `missing`), last backup time and size, second-copy state, and **Back up now**.
- Restore: `manage.py restore_backup --yes [--file …]` replaces the database and then requires a sync before staff can sign in.

### 11.2.1 Restore kit and drill (v1.2)

`docs/CLINIC_RESTORE_KIT.md` is the restore kit: which situation you are in, the kit to keep off the reception PC, restore on the same PC, restore on a new PC (`clinic-node/restore_clinic_node.ps1`), starting again from the cloud when no backup exists, a post-restore checklist, and a quarterly restore drill. `manage.py verify_backup` checks every backup (and the second location) is readable and complete without touching the database.

### 11.2.2 Conflicts (v1.2)

A conflict is logged whenever a row changed on both sides would otherwise be overwritten. One copy is kept on both sides after the sync (the cloud copy when the cloud found the conflict while pushing; the clinic server copy when the server found it while pulling), and the other version is kept in the conflict record. The clinic manager sees every conflict on the **Sync** page with the differing fields side by side, and marks it **reviewed** (with an optional note) after entering the other version again by hand if it was the right one. A conflict found by the cloud is sent back in the push receipt so the clinic server shows it too. The same row conflicting again updates its open entry; once reviewed, a new conflict opens a new entry. There is no automatic merge and no "apply the other version" button in v1.

### 11.4 Failure scenarios

| Scenario | Expected behavior |
|----------|-------------------|
| **Disk dies before sync** | Restore from **latest backup** (Tier 1). Unsynced work since last backup may be lost — UI must show last backup time honestly. |
| **Disk dies, no backup** | Data since last successful sync may be **unrecoverable**. Product + ops must not promise otherwise. |
| **Corrupt local DB** | Restore dump; manager sync; Apex support if cloud/local diverged. |
| **Push OK, pull fail** | Cloud has new data; local stale. **Retry pull** mandatory; block staff until complete. |

---

## 12. Security (v1)

| Topic | Decision |
|-------|----------|
| LAN transport | **HTTP** on private clinical VLAN (v1) |
| Cloud billing | **HTTPS** always |
| Wi‑Fi | Dedicated clinic network; no guest Wi‑Fi on same VLAN as clinical devices |
| Future | HTTPS on LAN with internal hostname + trusted cert (v1.5) |

---

## 13. Sync API outline (implementation reference)

Endpoints to implement on **cloud** (clinic node calls when online):

| Endpoint | Purpose |
|----------|---------|
| `POST /api/sync/push/` | Node token. Body: `push_id`, `since_token`, rows per entity (each with `sync_uuid`, `stamp`, `data`, `refs`, `users`). Applied all-or-nothing; returns a receipt (counts, conflicts, `remap` of ids the cloud already had). A repeated `push_id` returns the first receipt. |
| `POST /api/sync/pull/` | Node token. Returns the branch's rows (all, or changed since `since_token`), staff with password hashes, the tenant snapshot, and a new `token`. |
| `POST /api/sync/complete/` | Node token. The node applied its pull: records the sync and applies an approved mode change waiting on this step (`seed` or `sync`). |
| `GET /api/sync/status/` | Manager. Last sync time, seeded or not, the step a mode change is waiting for, open conflicts, recent runs. |
| `POST /api/sync/run/`, `POST /api/sync/seed/` | Manager, clinic node only. Runs push → pull → complete; a failed run is retried by passing its `run_id`. |

A node authenticates with `Authorization: Node <token>`; tokens are issued per `(clinic_tin, branch_name)` by `manage.py issue_sync_node`. Staff password changes made on a node are **not** pushed in v1.2; staff credentials are cloud-wins on pull.

Authentication and safety (v1.2):

- The clinic node calls these endpoints with its own **node token** (issued by Apex for one `(clinic_tin, branch_name)` scope), not a staff JWT. The cloud rejects any row outside that scope.
- Every push carries a `push_id`. The cloud stores a receipt per `push_id`, so a retried push is applied once.
- A pull is applied in checkpointed steps, so a failure part-way is resumable and never leaves the node half-updated.
- The clinic deployment runs with `NODE_MODE=clinic`: signup, Apex admin and tenant creation are disabled, and only its own scope is served.
- The frontend reads its API base at runtime (`/api` on a node), so one build serves both cloud and node.

Clinic node stores locally:

- `sync_runs` (id, started_at, push_status, pull_status, error_message)
- `last_successful_sync_at`
- `sync_conflicts` (optional queue for manager)

*Exact JSON schemas are a follow-up technical appendix.*

---

## 14. Manager UI requirements

| Feature | Required |
|---------|----------|
| **Sync now** button | Yes |
| Last successful sync timestamp | Yes |
| Push / pull step status + **Retry** | Yes |
| Morning reminder if sync missed | Yes |
| Sync freshness warning (7d / 2d rules) | Yes |
| Backup status (last dump, OK/fail) | Yes |
| Request ops mode change | Yes |
| Block staff nav when sync overdue | Yes (manager: Sync + Billing only) |
| Apex chat (manager) | Yes — **cloud / internet only**; disabled on LAN when cloud unreachable |
| Change password (topbar) | Yes — **local real time** for offline tenants |
| Clinic notifications bell | Yes — **local real time** for offline tenants |

---

## 15. Apex admin (`mediflow_admin`) requirements

| Feature | Page |
|---------|------|
| Setup / quarterly payment approval | Existing flow |
| **Ops mode change approval** | **Separate** Ops mode requests page. Approving sets the request to *approved*; it is applied by the clinic server's seed (to offline) or final sync (to online), never by the approval itself. The queue has a **Waiting for clinic** view and shows each clinic server's state (token issued, seeded, last sync). |
| **Clinic server tokens** | From the same page (**Clinic server**): issue one token per branch (shown once, only its hash stored), replace it, or revoke it; see seeded / last sync / recent runs / open conflicts. Issuing, replacing and revoking are audited. |
| Suspend / ban / delete tenant | Existing; clinic sees on pull |

---

## 16. Out of scope (v1)

- Real-time sync while clinic is open  
- Multiple writable clinic nodes per branch  
- Mid-day switch to cloud without sync  
- Automatic nightly sync without manager action (reminder only in v1)  
- HTTPS on LAN (deferred to v1.5)  
- Full conflict-resolution UI beyond list + manual fix  
- Off-site backup upload, MySQL hot spare, backup encryption and the tray icon (deferred to v1.5)  

---

## 17. Implementation phases (suggested)

| Phase | Deliverable |
|-------|-------------|
| **0** | `sync_uuid`, `updated_at`, `deleted_at` on synced models; stock movement ledger; generated TIN; ops-mode "awaiting seed" rule; `sync_runs` tables |
| **1** | Cloud push/pull APIs + manager Sync UI |
| **2** | Login freshness gates + billing lockout cloud path |
| **3** | Clinic host installer (MySQL + Django + static frontend + browser launch) |
| **4** | Backup automation + manager backup status |
| **5** | Ops mode request/approval in MediFlow + mediflow_admin |
| **6** | Conflict review (list, differences, mark reviewed) + restore kit (script, verify command, documentation, drill) |

---

## 18. Document history

| Version | Date | Notes |
|---------|------|-------|
| 1.2 | 2026-11-24 | Scope-qualified natural keys + `sync_uuid` for keyless rows; generated TIN when blank; stock movement ledger; per-entity merge rules; node token, push idempotency, `NODE_MODE`; online→offline waits for seed |
| 1.1 | 2026-08-31 | §6.3 — chat cloud-only; password + notifications local real-time for offline tenants |
| 1.0 | 2026-08-28 | Initial contract from product/architecture review |

---

## 19. Sign-off (optional)

| Role | Name | Date |
|------|------|------|
| Product / founder | | |
| Engineering partner | | |
| Apex ops | | |

---

*For questions or changes to this contract, update the version table and notify all signatories.*
