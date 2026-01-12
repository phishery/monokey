import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, 'lockers.json');

const app = express();
app.use(cors());
app.use(express.json());

// Load lockers from file
function loadLockers() {
  if (!existsSync(DATA_FILE)) {
    return {};
  }
  try {
    const data = readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Save lockers to file
function saveLockers(lockers) {
  writeFileSync(DATA_FILE, JSON.stringify(lockers, null, 2));
}

// GET /locker/:id - Get encrypted content by locker ID (hash of seed)
app.get('/locker/:id', (req, res) => {
  const { id } = req.params;
  const lockers = loadLockers();

  if (lockers[id]) {
    res.json({ content: lockers[id] });
  } else {
    res.json({ content: null });
  }
});

// POST /locker/:id - Save encrypted content
app.post('/locker/:id', (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  const lockers = loadLockers();
  lockers[id] = content;
  saveLockers(lockers);

  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Monokey server running on port ${PORT}`);
});
