# Bright Cakes & Snacks — Simple Backup & Restore Guide

## What is Backup?

A backup is a **copy of all your bakery data** saved as a file. It includes:

- Customer list (names, phone numbers, addresses)
- Products and prices
- Orders and order history
- Inventory and stock levels
- Categories
- Business settings (hours, currency, etc.)
- Expense records
- Payment records

---

## Three Ways to Back Up

### 1. Manual Backup (Easiest — No Internet Needed)

**Steps:**
1. Open the app → **More** → **Backup & Restore**
2. Tap **"Create backup"**
3. Tap **"Create backup"** in the confirmation popup
4. Choose where to save the file:
   - **Save to Files app** (recommended)
   - **Email it to yourself**
   - **Save to Google Drive manually** via the share sheet
5. You'll see "Backup created" with the file name

**When to use:** Before making big changes, before resetting the phone, or once a week for safety.

**File name:** `bright-cakes-backup-YYYY-MM-DD.json`

---

### 2. Automatic Google Drive Backup (Set It and Forget It)

**Setup (one time):**
1. Open the app → **Settings** → **Google Drive Backup**
2. Tap **"Connect Google Drive"**
3. Sign in with your Google account
4. Allow the app to store backups in your private Drive folder

**After setup:**
- Every time you add/edit/delete a customer, product, order, inventory, or settings → the app automatically backs up to Google Drive after 30 seconds
- You don't need to do anything — it happens in the background
- You'll see backup status in Settings → Google Drive Backup

**When to use:** For worry-free automatic protection. No manual action needed.

---

### 3. CSV Export (For Spreadsheet Users)

**Steps:**
1. Open the app → **More** → **Backup & Restore**
2. Scroll down to **"Export as spreadsheet"**
3. Tap any category (Customers, Products, Orders, Expenses, Payments)
4. Choose where to save the CSV file
5. Open in Excel, Google Sheets, or any spreadsheet app

**When to use:** For reporting, analysis, or sharing data with others.

---

## How to Restore Your Data

### From a File You Saved

1. Open the app → **More** → **Backup & Restore**
2. Tap **"Restore from file"**
3. Pick your backup file (`bright-cakes-backup-*.json`)
4. You'll see a confirmation: "Replace all data?"
   - Shows: how many records will be replaced
   - Shows: how many records are in the backup
5. Tap **"Replace & restore"** to confirm
6. Wait for "Data restored" message

**Safety:** Your current data is automatically backed up first before restoring. If something goes wrong, your original data is safe.

### From Google Drive

1. Open the app → **Settings** → **Google Drive Backup**
2. Tap **"Restore Backup"**
3. You'll see the backup details (date, size, record counts)
4. Tap **"Restore Backup"**
5. Confirm in the popup
6. Wait for "Backup restored successfully"

### When You First Open the App After Login

If Google Drive is connected and a newer backup exists:
- A popup appears: **"Google Drive Backup Available"**
- Shows: backup date, size, record counts
- Tap **"Restore Backup"** to use the cloud version
- Tap **"Skip for Now"** to keep your current data
- Tap **"View Backup History"** to see all backups

---

## Safety Features

| Feature | What It Does |
|---------|-------------|
| **Safety backup** | Before restoring, the app saves your current data first. If restore fails, your original data is safe. |
| **Confirmation dialog** | You must explicitly confirm before any data is replaced. No silent restores. |
| **Transaction safety** | All data is restored in one step. If anything fails, nothing is partially restored. |
| **Integrity check** | Backups are verified for corruption before restore. |
| **Skip option** | You can always skip a restore and keep your current data. |

---

## Important Notes

- **Your data never leaves your phone** unless you explicitly choose to back up to Google Drive.
- **Manual backups** (share sheet) are saved wherever you choose — Files app, email, Drive, etc.
- **Automatic backups** (Google Drive) only happen if you connect Google Drive in Settings.
- **Restoring replaces ALL data** — anything added since the backup will be lost.
- **Keep multiple backups** — don't overwrite your only backup. Use different file names or let the app version them automatically.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Could not open the file" | Make sure the file is a `.json` backup file |
| "That file isn't valid JSON" | The file may be corrupted or not a Bright Cakes backup |
| "This backup is missing..." | The file is incomplete — try a different backup |
| "Checksum mismatch" | The file was modified or corrupted — use a different backup |
| Restore failed | Your original data is safe. Try again or use a different backup file |
| Google Drive not connected | Go to Settings → Google Drive Backup → Connect Google Drive |
| No backups found | Create a backup first (manual or automatic) |
| Backup too large | Export CSV files individually instead of full backup |

---

## Quick Reference

| Action | Location |
|--------|----------|
| Create backup | More → Backup & Restore → Create backup |
| Restore from file | More → Backup & Restore → Restore from file |
| Export CSV | More → Backup & Restore → Export as spreadsheet |
| Connect Google Drive | Settings → Google Drive Backup → Connect Google Drive |
| Back up now (cloud) | Settings → Google Drive Backup → Back Up Now |
| Restore from cloud | Settings → Google Drive Backup → Restore Backup |
| View backup history | Settings → Google Drive Backup → Backup History |

---

**Remember:** Always create a backup before making big changes to your data. It only takes a few seconds and can save you from losing important records.