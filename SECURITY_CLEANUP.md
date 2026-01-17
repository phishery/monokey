# Security Cleanup Guide

## SECRETS FOUND IN THIS REPOSITORY

The following secrets were committed to git history and MUST be rotated:

| Secret | Location | Action Required |
|--------|----------|-----------------|
| Upstash REST Token | `app/(auth)/locker.tsx:23` | **ROTATE IMMEDIATELY** |
| Upstash REST URL | `app/(auth)/locker.tsx:22` | URL exposed (less critical) |

---

## STEP 1: ROTATE COMPROMISED CREDENTIALS

### Upstash Token (CRITICAL)
1. Go to https://console.upstash.com/
2. Select your database
3. Go to **REST API** section
4. Click **Reset Token** (or create a new database)
5. Update your Render environment variables with the new token

---

## STEP 2: REMOVE SECRETS FROM GIT HISTORY

### Option A: Using git-filter-repo (Recommended)

```bash
# Install git-filter-repo
pip3 install git-filter-repo

# Clone a fresh copy (filter-repo requires a fresh clone)
cd ..
git clone --mirror https://github.com/phishery/monokey.git monokey-clean
cd monokey-clean

# Create a file with strings to replace
cat > ../replacements.txt << 'EOF'
AZ79AAIncDJkNjdhM2Q2ODgxMjE0YjZjOTljNjZkMDEzMjVkMTRkY3AyNDA3MDE==>REDACTED_TOKEN
https://legible-cheetah-40701.upstash.io==>https://REDACTED.upstash.io
EOF

# Run the filter
git filter-repo --replace-text ../replacements.txt

# Push to GitHub (DESTRUCTIVE - will rewrite history)
git push --force --all
git push --force --tags
```

### Option B: Using BFG Repo Cleaner (Alternative)

```bash
# Install BFG
brew install bfg

# Clone fresh
git clone --mirror https://github.com/phishery/monokey.git
cd monokey.git

# Create a file with secrets to remove
cat > ../secrets.txt << 'EOF'
AZ79AAIncDJkNjdhM2Q2ODgxMjE0YjZjOTljNjZkMDEzMjVkMTRkY3AyNDA3MDE
EOF

# Run BFG
bfg --replace-text ../secrets.txt

# Clean up and force push
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

---

## STEP 3: VERIFY CLEANUP

```bash
# Check if secrets still exist in history
git log --all -p | grep -i "AZ79AAInc"
git log --all -p | grep -i "legible-cheetah"

# Should return nothing if cleanup was successful
```

---

## STEP 4: NOTIFY COLLABORATORS

After force-pushing:
1. All collaborators must re-clone the repository
2. Anyone with a local copy has the old secrets - they should delete and re-clone

---

## STEP 5: SET UP NEW SECRETS

### On Render.com (Production)

**For the API server (`monokey-api`):**
1. Go to your Render dashboard
2. Select the monokey-api service
3. Go to **Environment** tab
4. Add/update:
   ```
   UPSTASH_URL=https://your-new-instance.upstash.io
   UPSTASH_TOKEN=your_new_token_here
   ALLOWED_ORIGINS=https://monokey.onrender.com
   ```

**For the frontend (`monokey`):**
1. Go to your Render dashboard
2. Select the monokey service
3. Go to **Environment** tab
4. Add/update:
   ```
   EXPO_PUBLIC_API_URL=https://monokey-api.onrender.com
   ```

---

## PREVENTION: Pre-commit Hook

A `.pre-commit-config.yaml` has been added to scan for secrets before commits.

To enable:
```bash
pip install pre-commit
pre-commit install
```

This will block any commits containing secrets automatically.
