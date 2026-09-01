# MediFlow — Full manual QA checklist (14 areas)

Use this file while testing. Check boxes and write feedback inline — you should not need to scroll chat history.

**Run:** `npm run dev` · **API:** `NEXT_PUBLIC_API_URL` (Vercel backend) · **Apex:** `mediflow_admin` for approvals

**Core rule everywhere:** Doctor orders → Reception pays → Unit works (lab/pharmacy) → Checkout. Nothing clinical runs before payment approval.

---

## Test setup


| Item         | Notes                                                           |
| ------------ | --------------------------------------------------------------- |
| Environment  | Local frontend + API or Vercel                                  |
| Test users   | manager, reception, doctor, nurse, lab, pharmacist              |
| Apex console | Setup/quarterly payment approve/reject; ops-mode approve/reject |
| Browser      | Chrome + one mobile-width pass (375px)                          |


**Feedback (setup):**

```

```

---



## 1. Authentication & access


| ID      | Test case            | Steps                                  | Expected                                                 |
| ------- | -------------------- | -------------------------------------- | -------------------------------------------------------- |
| AUTH-01 | Valid login per role | Log in as each role                    | Correct home (`/manager`, `/reception`, `/doctor`, etc.) |
| AUTH-02 | Invalid credentials  | Wrong password                         | Error; no redirect                                       |
| AUTH-03 | Empty form           | Submit blank login                     | Validation / error; no crash                             |
| AUTH-04 | Role route guard     | As doctor, open `/manager`             | Blocked or redirected to doctor portal                   |
| AUTH-05 | Reception → pharmacy | As reception, go to `/pharmacy`        | Access denied / redirect                                 |
| AUTH-06 | Logout               | Sign out in shell                      | Session cleared; login page                              |
| AUTH-07 | Session persistence  | Refresh after login                    | Still logged in; correct shell                           |
| AUTH-08 | Billing-only login   | Manager in grace, no renewal submitted | Lands on `/billing` only, not clinic portal              |
| AUTH-09 | Signup flow          | Complete `/signup`                     | Success → awaiting Apex card (not sign-in)               |
| AUTH-10 | Password change      | `/account/password` → re-login         | New password works; old fails                            |


**Checklist**

- [x] AUTH-01
- [x] AUTH-02
- [x] AUTH-03
- [x] AUTH-04
- [x] AUTH-05
- [x] AUTH-06
- [x] AUTH-07
- [x] AUTH-08
- [ ] AUTH-09
- [x] AUTH-10

**Feedback (section 1):**

```

```

---



## 2. Shell, navigation & UI polish


| ID    | Test case             | Steps                                             | Expected                                   |
| ----- | --------------------- | ------------------------------------------------- | ------------------------------------------ |
| UI-01 | Persistent shell      | Manager: Overview → Staff → Ops mode              | Sidebar/header stay mounted; no full flash |
| UI-02 | Nested nav            | Reception → Register → New / Returning / Referred | Sub-nav highlights correctly               |
| UI-03 | Page title updates    | Navigate between pages                            | Header title/subtitle match page           |
| UI-04 | shadcn cards & badges | Manager overview, reception board                 | Cards, badges, alerts consistent           |
| UI-05 | Empty states          | Open empty queues                                 | Empty state; no broken layout              |
| UI-06 | Mobile layout         | 375px on reception register                       | Usable; no horizontal overflow             |
| UI-07 | Toast feedback        | Success/error actions                             | Sonner toasts; not duplicated on refresh   |
| UI-08 | Submit button loading | Submit any form (login, register, save)           | Spinner + label while in flight            |


**Checklist**

- [ ] UI-01
- [ ] UI-02
- [ ] UI-03
- [ ] UI-04
- [ ] UI-05
- [ ] UI-06
- [ ] UI-07
- [ ] UI-08

**Feedback (section 2):**

```

```

---



## 3. Reception — patient registration


| ID     | Test case               | Steps                                       | Expected                               |
| ------ | ----------------------- | ------------------------------------------- | -------------------------------------- |
| REG-01 | New patient             | Register → New: identity + contact → submit | Patient + encounter; redirect to board |
| REG-02 | Returning patient       | Returning: search → select → submit         | Encounter for existing patient         |
| REG-03 | Referred + urgent       | Referred: source, details, urgent           | Referral metadata saved                |
| REG-04 | Returning search filter | Filter by name/MRN/phone                    | List filters correctly                 |
| REG-05 | No patient selected     | Returning: submit without pick              | Error: select a patient                |
| REG-06 | Required fields         | New: omit name/phone                        | Validation / error                     |
| REG-07 | Board after register    | Register → Today board                      | New encounter visible                  |
| REG-08 | Selected patient card   | Returning: pick patient                     | Card shows MRN, age, phone             |


**Checklist**

- [ ] REG-01
- [ ] REG-02
- [ ] REG-03
- [ ] REG-04
- [ ] REG-05
- [ ] REG-06
- [ ] REG-07
- [ ] REG-08

**Feedback (section 3):**

```

```

---



## 4. Reception — today board & cashier


| ID     | Test case               | Steps                             | Expected                               |
| ------ | ----------------------- | --------------------------------- | -------------------------------------- |
| REC-01 | Today board load        | Open `/reception`                 | Encounters list loads                  |
| REC-02 | Select encounter        | Click visit on board              | Selected for cashier                   |
| REC-03 | Approve payment         | Cashier: amount/method → approve  | Toast; units unlock; loading on button |
| REC-04 | Checkout                | After payment → checkout          | Success; visit leaves queue            |
| REC-05 | Checkout before payment | Checkout with unpaid consultation | Blocked with error                     |
| REC-06 | Invalid amount          | Approve 0 or negative             | Error or validation                    |
| REC-07 | Board cache refresh     | Pay → return to board             | Status updated                         |
| REC-08 | Appointments list       | `/reception/appointments`         | Today's appointments load              |
| REC-09 | Appointments empty      | No scheduled visits               | Empty state                            |


**Checklist**

- [ ] REC-01
- [ ] REC-02
- [ ] REC-03
- [ ] REC-04
- [ ] REC-05
- [ ] REC-06
- [ ] REC-07
- [ ] REC-08
- [ ] REC-09

**Feedback (section 4):**

```

```

---



## 5. Doctor portal


| ID     | Test case           | Steps                              | Expected                      |
| ------ | ------------------- | ---------------------------------- | ----------------------------- |
| DOC-01 | Active visits       | `/doctor` — paid visits only       | Unpaid not in queue           |
| DOC-02 | Select visit        | Pick patient from board            | Banner on chart/orders        |
| DOC-03 | Chart               | Save chart for selected visit      | Chart persists                |
| DOC-04 | Lab order           | Orders → lab → service → submit    | Order created; awaits payment |
| DOC-05 | Radiology order     | Orders → radiology                 | Same payment gate             |
| DOC-06 | Prescription order  | Orders → Rx                        | Pharmacy queue after payment  |
| DOC-07 | No visit selected   | Orders without selection           | Empty / select prompt         |
| DOC-08 | Follow-up           | Date/time picker → reason → submit | Appointment on reception list |
| DOC-09 | Calendar month/year | Follow-up picker dropdowns         | Not clipped; navigable        |
| DOC-10 | Past date blocked   | Schedule in the past               | Disabled or rejected          |
| DOC-11 | Referral            | Department, branch, diagnosis      | Referral recorded             |


**Checklist**

- [ ] DOC-01
- [ ] DOC-02
- [ ] DOC-03
- [ ] DOC-04
- [ ] DOC-05
- [ ] DOC-06
- [ ] DOC-07
- [ ] DOC-08
- [ ] DOC-09
- [ ] DOC-10
- [ ] DOC-11

**Feedback (section 5):**

```

```

---



## 6. Nurse portal


| ID     | Test case       | Steps                        | Expected                       |
| ------ | --------------- | ---------------------------- | ------------------------------ |
| NUR-01 | Open encounters | `/nurse`                     | List renders                   |
| NUR-02 | Notes & vitals  | Select encounter → save note | Saved; visible on doctor chart |
| NUR-03 | Timeline        | `/nurse/timeline`            | Events in order                |
| NUR-04 | No encounter    | Notes without selection      | Empty / banner state           |


**Checklist**

- [ ] NUR-01
- [ ] NUR-02
- [ ] NUR-03
- [ ] NUR-04

**Feedback (section 6):**

```

```

---



## 7. Lab portal


| ID     | Test case         | Steps                                | Expected                           |
| ------ | ----------------- | ------------------------------------ | ---------------------------------- |
| LAB-01 | Work queue        | `/lab` — paid orders only            | Unpaid not actionable              |
| LAB-02 | Start + complete  | Start test → enter result → complete | Status updates; loading on buttons |
| LAB-03 | Print report      | Print after result                   | Pop-up / print layout OK           |
| LAB-04 | Equipment tickets | `/lab/equipment` → submit ticket     | Ticket created for manager         |


**Checklist**

- [ ] LAB-01
- [ ] LAB-02
- [ ] LAB-03
- [ ] LAB-04

**Feedback (section 7):**

```

```

---



## 8. Pharmacy portal


| ID     | Test case                 | Steps                      | Expected                                    |
| ------ | ------------------------- | -------------------------- | ------------------------------------------- |
| PHR-01 | Rx queue                  | `/pharmacy` — paid Rx only | Queue matches payment rules                 |
| PHR-02 | Dispense                  | Medicine + qty → dispense  | Success; stock decreases; loading on button |
| PHR-03 | Dispense without medicine | Submit without drug        | Error toast                                 |
| PHR-04 | Inventory view            | `/pharmacy/inventory`      | Medicines list; stats                       |
| PHR-05 | Low stock indicator       | Medicine below threshold   | Alert in stats                              |


**Checklist**

- [ ] PHR-01
- [ ] PHR-02
- [ ] PHR-03
- [ ] PHR-04
- [ ] PHR-05

**Feedback (section 8):**

```

```

---



## 9. Manager — catalog & staff


| ID     | Test case          | Steps                           | Expected                        |
| ------ | ------------------ | ------------------------------- | ------------------------------- |
| MGR-01 | Overview KPIs      | `/manager`                      | Stats tiles load                |
| MGR-02 | Ops mode teaser    | Infrastructure card on overview | Mode label; link to ops-mode    |
| MGR-03 | Add department     | Billables → add department      | Appears in list                 |
| MGR-04 | Add service        | Billables → add service         | Visible in doctor orders        |
| MGR-05 | Edit service       | Change price/name               | Persists after refresh          |
| MGR-06 | Delete service     | Delete unused service           | Removed; confirm if applicable  |
| MGR-07 | Add medicine       | Inventory → add with expiry     | Saved; date picker works        |
| MGR-08 | Expiry calendar    | Medicine expiry popover         | Month/year visible; not clipped |
| MGR-09 | Low stock          | on_hand ≤ min_threshold         | Low stock count updates         |
| MGR-10 | Staff list         | `/manager/staff`                | Staff loads                     |
| MGR-11 | Create staff       | Add credential per role         | New user can log in             |
| MGR-12 | Equipment requests | `/manager/requests`             | Request queue loads             |


**Checklist**

- [ ] MGR-01
- [ ] MGR-02
- [ ] MGR-03
- [ ] MGR-04
- [ ] MGR-05
- [ ] MGR-06
- [ ] MGR-07
- [ ] MGR-08
- [ ] MGR-09
- [ ] MGR-10
- [ ] MGR-11
- [ ] MGR-12

**Feedback (section 9):**

```

```

---



## 10. Operating mode (Manager + Apex)


| ID     | Test case                | Steps                       | Expected                                    |
| ------ | ------------------------ | --------------------------- | ------------------------------------------- |
| OPS-01 | View current mode        | `/manager/ops-mode`         | Hero shows Online or Offline                |
| OPS-02 | Request online → offline | Reason → confirm → submit   | Pending; “Awaiting Apex”; loading on submit |
| OPS-03 | Block duplicate          | While pending, submit again | Disabled / in progress message              |
| OPS-04 | Apex approve offline     | Apex approves               | Offline mode applied (no sync wait)         |
| OPS-05 | Request offline → online | Submit return to cloud      | Pending → approved → sync required banner   |
| OPS-06 | Rejected request         | Apex rejects with note      | Rejection banner; can resubmit              |
| OPS-07 | API unavailable          | Ops routes 404 on API       | Warning banner; graceful degrade            |
| OPS-08 | History log              | After requests              | Log entries with status pills               |
| OPS-09 | Refresh status           | Click Refresh               | Status reloads without crash                |


**Checklist**

- [ ] OPS-01
- [ ] OPS-02
- [ ] OPS-03
- [ ] OPS-04
- [ ] OPS-05
- [ ] OPS-06
- [ ] OPS-07
- [ ] OPS-08
- [ ] OPS-09

**Feedback (section 10):**

```

```

---



## 11. Billing, signup & subscription (critical)



### Setup signup & Apex approval


| ID     | Test case                 | Expected                                     |
| ------ | ------------------------- | -------------------------------------------- |
| BIL-S1 | Complete `/signup`        | Awaiting Apex card; not sign-in              |
| BIL-S2 | Refresh `/signup`         | Card persists (sessionStorage + poll)        |
| BIL-S3 | Login while setup pending | Blocked → `/signup?username=…`               |
| BIL-S4 | Apex approves setup       | “Clinic approved” → sign-in works            |
| BIL-S5 | Apex rejects setup        | Rejected card + resubmit form; login blocked |
| BIL-S6 | Resubmit setup payment    | Pending again until Apex approves            |




### Quarterly renewal


| ID     | Test case                     | Expected                                                         |
| ------ | ----------------------------- | ---------------------------------------------------------------- |
| BIL-Q1 | Billing portal fee display    | Shows setup vs quarterly automatically; **no fee-type dropdown** |
| BIL-Q2 | Submit quarterly proof        | Signed out → `/billing/renewal` waiting card                     |
| BIL-Q3 | Login while quarterly pending | All roles blocked → renewal page                                 |
| BIL-Q4 | Apex rejects quarterly        | Rejected + resubmit; no clinic access                            |
| BIL-Q5 | Resubmit quarterly            | Pending until Apex approves                                      |
| BIL-Q6 | Grace before submit           | Manager → billing portal only; staff blocked                     |




### Subscription UI


| ID     | Test case         | Expected                               |
| ------ | ----------------- | -------------------------------------- |
| BIL-01 | Billing page load | Plan / period status loads             |
| BIL-02 | Trial CTA         | Trial billing button when trial ending |
| BIL-03 | Notification bell | Warnings render; stable on navigation  |


**Checklist**

- [ ] BIL-S1
- [ ] BIL-S2
- [ ] BIL-S3
- [ ] BIL-S4
- [ ] BIL-S5
- [ ] BIL-S6
- [ ] BIL-Q1
- [ ] BIL-Q2
- [ ] BIL-Q3
- [ ] BIL-Q4
- [ ] BIL-Q5
- [ ] BIL-Q6
- [ ] BIL-01
- [ ] BIL-02
- [ ] BIL-03

**Feedback (section 11):**

```

```

**Backend deploy** (`BackEnd/tenants/urls.py` — already wired in repo):

```python
path("resubmit-setup/", ResubmitSetupPaymentView.as_view(), ...),
path("renewal-status/", RenewalStatusView.as_view(), ...),
path("resubmit-quarterly/", ResubmitQuarterlyPaymentView.as_view(), ...),
```


| Route                 | File                                     |
| --------------------- | ---------------------------------------- |
| `resubmit-setup/`     | `BackEnd/tenants/resubmit_setup_view.py` |
| `renewal-status/`     | `BackEnd/tenants/renewal_views.py`       |
| `resubmit-quarterly/` | `BackEnd/tenants/renewal_views.py`       |


---



## 12. End-to-end clinical flows



### Flow A — New patient full visit

1. [ ] Reception registers **new** patient
2. [ ] Reception **approves consultation payment** (cashier)
3. [ ] Doctor sees visit on **active visits**
4. [ ] Doctor places **lab order**
5. [ ] Reception **pays lab order**
6. [ ] Lab sees order in **work queue**
7. [ ] Lab completes result
8. [ ] Reception **checkout**

**Expected:** Each step unlocks only after payment gate.

**Feedback (Flow A):**

```

```



### Flow B — Returning patient + Rx

1. [ ] Reception registers **returning** patient
2. [ ] Pay consultation
3. [ ] Doctor orders **prescription**
4. [ ] Reception pays Rx
5. [ ] Pharmacy **dispenses**
6. [ ] Stock count drops

**Expected:** Pharmacy cannot dispense before payment.

**Feedback (Flow B):**

```

```



### Flow C — Follow-up loop

1. [ ] Doctor schedules **follow-up** (future date/time)
2. [ ] Reception sees it under **appointments**

**Expected:** Correct patient, time, and reason.

**Feedback (Flow C):**

```

```



### Flow D — Manager catalog → doctor usage

1. [ ] Manager adds new **billable service**
2. [ ] Doctor opens orders (within cache TTL or after refresh)
3. [ ] New service appears in order dropdown

**Expected:** Catalog eventually consistent.

**Feedback (Flow D):**

```

```

---



## 13. Performance & reliability


| ID      | Test case             | Steps                         | Expected                              |
| ------- | --------------------- | ----------------------------- | ------------------------------------- |
| PERF-01 | Shell navigation      | Manager: 5 nav clicks quickly | No repeated billing fetch every click |
| PERF-02 | Catalog cache         | Billables → doctor orders     | Second load fast; shared cache        |
| PERF-03 | Encounter board cache | Board → cashier → board       | Updates after pay/checkout            |
| PERF-04 | Offline API error     | Stop backend; open pages      | Graceful errors; no white screen      |
| PERF-05 | Production build      | `npm run build`               | Build passes; routes load             |


**Checklist**

- [ ] PERF-01
- [ ] PERF-02
- [ ] PERF-03
- [ ] PERF-04
- [ ] PERF-05

**Feedback (section 13):**

```

```

---



## 14. Regression checks (recent work)


| ID    | Test case                    | Expected                                         |
| ----- | ---------------------------- | ------------------------------------------------ |
| REG-A | Follow-up date picker        | Month/year dropdowns visible; popover scrollable |
| REG-B | Medicine expiry picker       | Date-only picker; not clipped                    |
| REG-C | Manager ops-mode UI          | Alerts, cards, skeleton, status pills            |
| REG-D | Reception register form      | Field sections, separators, patient card         |
| REG-E | Ops mode on Vercel API       | Banner if routes missing; no login spam          |
| REG-F | Signup status after refresh  | Apex card survives refresh until approved        |
| REG-G | Quarterly login gate         | No clinic login while renewal pending/rejected   |
| REG-H | Loading buttons project-wide | Spinner + label on submit actions                |


**Checklist**

- [ ] REG-A
- [ ] REG-B
- [ ] REG-C
- [ ] REG-D
- [ ] REG-E
- [ ] REG-F
- [ ] REG-G
- [ ] REG-H

**Feedback (section 14):**

```

```

---



## Suggested test data

```
Patients:
  - New: "Test Patient A", age 35, Female, phone +251911000001
  - Returning: existing MRN from branch
  - Referred: source "City Clinic", urgent flag on

Payments:
  - Cash, full amount due

Ops mode notes:
  - "Unreliable internet — need offline LAN"
  - "Fiber installed — ready for cloud"
```

---



## Priority order (if time is limited)

1. **P0:** Section 11 (billing/signup), Flow A, AUTH-01, REG-01/02, REC-03/04, DOC-01/04, PHR-02
2. **P1:** DOC-08/09, MGR-04/07, OPS-02/04/05, role guards (AUTH-04/05)
3. **P2:** UI polish, performance (section 13), edge cases

---



## Session log

```
Date:
Tester:
Build / branch:
API URL:

Overall pass / fail / blocked:
```

