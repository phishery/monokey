Monokey

A secure, zero-knowledge content locker powered by BIP-39 seed phrases.
Store encrypted text that only you — or anyone you share your seed phrase with — can access.

⸻

🚀 Features

• 🔐 12-Word Seed Phrase  
  Generates your cryptographic key using the industry-standard BIP-39 mnemonic format  
  (the same underlying standard used by many cryptocurrency wallets).

• 🔏 Zero-Knowledge Encryption  
  Data is encrypted locally before being sent to any server;  
  the server never sees your unencrypted content.

• 📱 Cross-Platform  
  Works on iOS, Android, and the Web via React Native + Expo.

• 📸 QR Code Sharing  
  Quickly generate and scan QR codes to grant others access  
  to a locker without copying words manually.

• 🚫 No Account Required  
  Your seed phrase is your login.  
  No email, no password, and no personal information collected.

• 🛠️ Open Source  
  Fully auditable and community-friendly code.

⸻

💡 How It Works

Monokey uses BIP-39 seed phrases  
(a deterministic set of 12 words representing secure entropy)  
to derive a symmetric encryption key.

You then use that key to encrypt and decrypt your stored text —  
locally on your device — meaning only someone with the exact same  
seed phrase can unlock it.

1. Generate or Enter a Seed Phrase  
   Monokey creates a 12-word mnemonic for you  
   or allows you to input one you already trust.

2. Derive a Cryptographic Key  
   Internally the BIP-39 phrase gets turned into a binary key.

3. Encrypt Your Data  
   Input text is encrypted with this key  
   before leaving the device.

4. Store or Share  
   Save the encrypted data in a backend or export it —  
   anyone with the seed phrase can reverse the process  
   and read the original text.

⚠️ Anyone with your 12-word seed phrase can decrypt your content —  
treat it like the master key to your data!

⸻

🛠 Usage

Creating a Locker

1. Open Monokey.
2. Generate a new seed phrase or enter an existing one.
3. Add content you want to lock.
4. Save or export the encrypted blob.

Accessing a Locker

1. Input the seed phrase used to create the locker.
2. Monokey will derive the encryption key and decrypt your text.

QR Sharing

Tap Share → QR Code  
to export your seed or content as a QR code  
for easy scanning by others.

⸻

🎯 Security Notes

• Monokey is zero-knowledge by design:  
  the server never sees your plaintext.

• Your seed phrase should be kept offline when possible.

• If someone gets your seed phrase,  
  they can fully decrypt your data.

⸻

🙌 Contributing

We welcome contributions!  
Please open issues or pull requests for:

• Feature enhancements  
• Bug fixes  
• Security audits  
• UX improvements

⸻

📝 License

This project is open source  
and available under the MIT License.
