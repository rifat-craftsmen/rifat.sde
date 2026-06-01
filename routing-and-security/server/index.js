import express from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const app = express();
app.use(express.json());

const JWT_SECRET = 'routing-security-demo-secret';
const HARDCODED_USER = { email: 'demo@example.com', password: 'password123' };

// In-memory store of valid CSRF tokens (single-use)
const csrfTokens = new Set();

// POST /api/login — validate hardcoded credentials, return JWT
app.post('/api/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (email === HARDCODED_USER.email && password === HARDCODED_USER.password) {
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ token });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

// Middleware: verify JWT from Authorization header
function requireAuth(req, res, next) {
  const auth = req.headers['authorization'] ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// GET /api/csrf-token — issue a new CSRF token; requires valid JWT session
app.get('/api/csrf-token', requireAuth, (req, res) => {
  const csrfToken = randomUUID();
  csrfTokens.add(csrfToken);
  res.json({ csrfToken });
});

// POST /api/transfer — state-changing endpoint; rejects requests with missing/invalid CSRF token
app.post('/api/transfer', (req, res) => {
  const provided = req.headers['x-csrf-token'];
  if (!provided || !csrfTokens.has(provided)) {
    return res.status(403).json({ ok: false, reason: 'Blocked: missing or invalid CSRF token.' });
  }
  csrfTokens.delete(provided); // single-use: consumed after first valid request
  return res.json({ ok: true, reason: 'Success: transfer accepted (valid CSRF token).' });
});

app.listen(3001, () => {
  console.log('Backend running on http://localhost:3001');
});
