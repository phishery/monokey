import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================
const UPSTASH_URL = process.env.UPSTASH_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_TOKEN;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:19006',
  'https://monokey.onrender.com'
];

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  console.error('ERROR: Missing required environment variables');
  console.error('Please set UPSTASH_URL and UPSTASH_TOKEN');
  process.exit(1);
}

// =============================================================================
// EXPRESS APP SETUP
// =============================================================================
const app = express();

// CORS - restrict to allowed origins
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '1mb' }));

// Rate limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// =============================================================================
// INPUT VALIDATION
// =============================================================================
const VALID_KEY_REGEX = /^[a-f0-9]{64}$/; // SHA-256 hex hash
const VALID_PREFIX_REGEX = /^(write|view):$/;

function validateLockerId(id) {
  return typeof id === 'string' && VALID_KEY_REGEX.test(id);
}

function validatePrefix(prefix) {
  return typeof prefix === 'string' && VALID_PREFIX_REGEX.test(prefix + ':');
}

// =============================================================================
// UPSTASH PROXY FUNCTIONS
// =============================================================================
async function upstashGet(key) {
  const response = await fetch(`${UPSTASH_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
  });
  const data = await response.json();
  return data.result;
}

async function upstashSet(key, value) {
  const response = await fetch(`${UPSTASH_URL}/set/${key}/${encodeURIComponent(value)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
  });
  return response.json();
}

// =============================================================================
// API ROUTES
// =============================================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /api/locker/:prefix/:id - Get locker data
// prefix: 'write' or 'view'
// id: 64-char hex string (SHA-256 hash of seed)
app.get('/api/locker/:prefix/:id', async (req, res) => {
  try {
    const { prefix, id } = req.params;

    if (!validatePrefix(prefix)) {
      return res.status(400).json({ error: 'Invalid prefix. Must be "write" or "view"' });
    }
    if (!validateLockerId(id)) {
      return res.status(400).json({ error: 'Invalid locker ID format' });
    }

    const key = `${prefix}:${id}`;
    const result = await upstashGet(key);

    res.json({ result });
  } catch (error) {
    console.error('GET error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve data' });
  }
});

// POST /api/locker/:prefix/:id - Save locker data
// Body: { data: string } - the encrypted locker data JSON
app.post('/api/locker/:prefix/:id', async (req, res) => {
  try {
    const { prefix, id } = req.params;
    const { data } = req.body;

    if (!validatePrefix(prefix)) {
      return res.status(400).json({ error: 'Invalid prefix. Must be "write" or "view"' });
    }
    if (!validateLockerId(id)) {
      return res.status(400).json({ error: 'Invalid locker ID format' });
    }
    if (!data || typeof data !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid data' });
    }
    if (data.length > 500000) { // ~500KB max
      return res.status(400).json({ error: 'Data too large' });
    }

    const key = `${prefix}:${id}`;
    await upstashSet(key, data);

    res.json({ success: true });
  } catch (error) {
    console.error('POST error:', error.message);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// =============================================================================
// START SERVER
// =============================================================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Monokey API server running on port ${PORT}`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});
