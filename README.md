# Monokey

A secure, zero-knowledge content vault with dual-key access control. Store encrypted text using two separate 12-word seed phrases: one for full access (read/write) and one for view-only sharing.

**Live Demo:** [monokey.onrender.com](https://monokey.onrender.com)

---

## Features

### Two Keys, Two Permissions
Each vault gets two separate 12-word BIP-39 seed phrases:
- **Full Access Key** - Read and edit your vault (keep this private!)
- **View-Only Key** - Share with others so they can view but never modify

### Zero-Knowledge Encryption
- Content is encrypted locally before leaving your device
- The server only stores encrypted blobs - it can never read your content
- Uses AES-GCM encryption with keys derived via HKDF

### Cross-Platform
- Works on iOS, Android, and Web via React Native + Expo
- Install as a PWA on your home screen for native app experience

### QR Code Sharing
- Generate QR codes for both Full Access and View-Only links
- Scan QR codes to instantly open a vault
- URLs are obfuscated (base64 encoded) for privacy

### No Account Required
- Your seed phrase IS your login
- No email, password, or personal information collected
- Lose your seed phrase = lose access (there's no recovery)

### Open Source
- Fully auditable code
- Self-hostable architecture

---

## How It Works

### The Dual-Key System

Monokey generates **two independent 12-word seed phrases** for each vault:

```
Full Access Key:  advance reward develop access journey erase crew radio weird woman plate marine
View-Only Key:    artifact century barrel leopard battle turtle gloom indoor airport one snake behave
```

Each key derives a unique cryptographic identity:
1. **Seed phrase** → BIP-39 seed (512-bit)
2. **Seed** → SHA-256 hash → Vault ID (used to store/retrieve encrypted data)
3. **Seed** → HKDF → Encryption key (used to encrypt/decrypt the content key)

### Encryption Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CONTENT                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Content Key   │  (random AES-256 key)
                    └─────────────────┘
                         │       │
            ┌────────────┘       └────────────┐
            ▼                                 ▼
   ┌─────────────────┐               ┌─────────────────┐
   │ Encrypted with  │               │ Encrypted with  │
   │ Full Access Key │               │ View-Only Key   │
   └─────────────────┘               └─────────────────┘
            │                                 │
            ▼                                 ▼
   ┌─────────────────┐               ┌─────────────────┐
   │  Write Vault    │───────────────│  View Reference │
   │  (has content)  │    points to  │  (has key only) │
   └─────────────────┘               └─────────────────┘
```

- Content is encrypted with a random **Content Key**
- The Content Key is then encrypted separately with both user keys
- Full Access users can decrypt and re-encrypt (edit)
- View-Only users can only decrypt (read)

---

## Usage

### Creating a Vault

1. Open Monokey and tap **"Create Monokey Vault"**
2. You'll see two sets of 12 words:
   - **Full Access Key** (red) - Keep this private!
   - **View-Only Key** (green) - Safe to share
3. Write down both keys or print the backup sheet
4. Tap **"Open My Vault"** to start adding content
5. Type your content and tap **"Save & Lock"**

### Accessing Your Vault

**With Full Access (edit):**
- Enter your 12-word Full Access key, or
- Scan the Full Access QR code, or
- Open the Full Access link (`?w=...`)

**With View-Only (read):**
- Enter your 12-word View-Only key, or
- Scan the View-Only QR code, or
- Open the View-Only link (`?v=...`)

### Sharing Your Vault

To let someone view your content:
1. Share your **View-Only Key** (12 words), or
2. Share the **View-Only QR code**, or
3. Share the **View-Only link**

They will be able to see your content but cannot make changes.

---

## Security

### What's Protected
- Your content is encrypted with AES-256-GCM
- Keys are derived using industry-standard BIP-39 + HKDF
- The server only stores encrypted data (zero-knowledge)

### What You Must Protect
- **Your Full Access Key** - Anyone with it can read AND edit your vault
- **Your View-Only Key** - Anyone with it can read your vault

### Key Strength
Each 12-word key has 128 bits of entropy:
- 2,048 possible words per position
- 2^128 = 340 undecillion possible combinations
- Essentially impossible to guess or brute-force

### Threat Model
- Server compromise: Attacker gets encrypted blobs, useless without keys
- Network sniffing: All data encrypted before transmission
- Key theft: If someone gets your key, they have access (no recovery possible)

---

## Development Setup

### Prerequisites
- Node.js 18+
- npm

### 1. Clone and Install

```bash
git clone https://github.com/phishery/monokey.git
cd monokey
npm install
```

### 2. Set Up Environment Variables

**Frontend (Expo app):**
```bash
cp .env.example .env
# Edit .env:
EXPO_PUBLIC_API_URL=http://localhost:3001
```

**Backend (API server):**
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your Upstash credentials (see below)
```

### 3. Get Upstash Credentials

1. Sign up at [console.upstash.com](https://console.upstash.com/)
2. Create a new Redis database
3. Copy the **REST URL** and **REST Token**
4. Add to `server/.env`:
```
UPSTASH_URL=https://your-instance.upstash.io
UPSTASH_TOKEN=your_token_here
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:8082
```

### 4. Run Locally

```bash
# Terminal 1: Start the API server
cd server && npm start

# Terminal 2: Start the Expo app
npm run web
```

Open http://localhost:8082 in your browser.

---

## Deployment

### Deploy API Server to Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo
3. Configure:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
4. Add environment variables:
   - `UPSTASH_URL` - Your Upstash REST URL
   - `UPSTASH_TOKEN` - Your Upstash REST Token
   - `ALLOWED_ORIGINS` - Your frontend URL (e.g., `https://monokey.onrender.com`)

### Deploy Frontend to Render

1. Create a new **Static Site** on Render
2. Connect your GitHub repo
3. Configure:
   - **Build Command:** `npm install && npx expo export -p web`
   - **Publish Directory:** `dist`
4. Add environment variable:
   - `EXPO_PUBLIC_API_URL` - Your API server URL (e.g., `https://monokey-api.onrender.com`)

---

## Tech Stack

- **Frontend:** React Native + Expo (iOS, Android, Web)
- **Routing:** Expo Router (file-based)
- **Styling:** NativeWind (Tailwind CSS)
- **Crypto:** @noble/hashes, Web Crypto API
- **Backend:** Node.js + Express
- **Database:** Upstash Redis (serverless)
- **QR Codes:** react-native-qrcode-svg, html5-qrcode

---

## Contributing

Contributions welcome! Please open issues or pull requests for:
- Security audits and improvements
- Bug fixes
- Feature enhancements
- Documentation improvements

---

## License

MIT License - See [LICENSE](LICENSE) for details.
