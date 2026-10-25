import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = Number(process.env.PORT || 8080);
const API_TOKEN = process.env.APP_API_TOKEN || '';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const CHAT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const VIDEO_MODEL = process.env.GEMINI_VIDEO_MODEL || 'veo-3.1-fast-generate-preview';
const GOOGLE_API = 'https://generativelanguage.googleapis.com/v1beta';

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin(origin, cb) {
  // Native Android WebView may not send an Origin header. Restrict browser origins when configured.
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
  return cb(new Error('Origin not allowed by backend CORS policy.'));
} }));
app.use(express.json({ limit: '2mb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }));

function auth(req, res, next) {
  if (!API_TOKEN) return res.status(503).json({ ok: false, error: 'Backend is not configured: set APP_API_TOKEN on the server.' });
  const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token || token.length !== API_TOKEN.length || token !== API_TOKEN) return res.status(401).json({ ok: false, error: 'Invalid or missing backend token.' });
  next();
}
function promptFrom(req, res) {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!prompt) { res.status(400).json({ reply: 'একটি prompt লিখুন।', error: 'prompt is required' }); return null; }
  if (prompt.length > 4000) { res.status(413).json({ reply: 'Prompt সর্বোচ্চ ৪০০০ অক্ষরের হতে পারে।', error: 'Prompt too long' }); return null; }
  return prompt;
}
async function providerJson(url, options = {}, timeoutMs = 90_000) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `AI provider returned HTTP ${response.status}`;
    const error = new Error(message); error.status = response.status; throw error;
  }
  return data;
}
function providerError(res, err, feature) {
  const status = err?.status === 429 ? 429 : err?.status === 400 ? 400 : 502;
  const msg = err?.name === 'TimeoutError' ? 'অনুরোধের সময় শেষ হয়েছে। আবার চেষ্টা করুন।' : (err?.message || `${feature} তৈরি করা যায়নি।`);
  return res.status(status).json({ error: msg, reply: `${feature} করা যায়নি: ${msg}` });
}

app.get('/', (_req, res) => res.json({ service: 'Dr. Munna Assist AI backend', ok: true, health: '/health' }));
app.get('/health', (_req, res) => res.json({
  ok: true, service: 'Dr. Munna Assist AI backend',
  features: { chat: Boolean(GOOGLE_API_KEY), image: Boolean(GOOGLE_API_KEY), video: Boolean(GOOGLE_API_KEY) },
  models: { chat: CHAT_MODEL, image: IMAGE_MODEL, video: VIDEO_MODEL },
  tokenConfigured: Boolean(API_TOKEN), aiConfigured: Boolean(GOOGLE_API_KEY),
  note: 'Health check only confirms configuration; it does not guarantee provider quota or billing.'
}));

app.post('/chat', auth, async (req, res) => {
  try {
    if (!GOOGLE_API_KEY) return res.status(503).json({ error: 'Server admin must set GOOGLE_API_KEY.' });
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) return res.status(400).json({ error: 'message is required' });
    if (message.length > 12000) return res.status(413).json({ error: 'Message is too long (max 12000 characters).' });
    const contents = [];
    if (Array.isArray(req.body?.history)) {
      for (const item of req.body.history.slice(-12)) {
        if (['user', 'model'].includes(item?.role) && typeof item?.text === 'string' && item.text.trim()) {
          contents.push({ role: item.role, parts: [{ text: item.text.trim().slice(0, 4000) }] });
        }
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });
    const data = await providerJson(`${GOOGLE_API}/models/${encodeURIComponent(CHAT_MODEL)}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GOOGLE_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'You are Dr. Munna Assist AI, a helpful multilingual assistant. Match the user language, especially Bangla. Be clear and practical. For medical topics, provide educational information, never claim to diagnose, explain uncertainty, and recommend qualified clinicians or emergency services when appropriate. Do not fabricate sources, credentials, or capabilities.' }] },
        contents, generationConfig: { temperature: 0.65, maxOutputTokens: 2048 }
      })
    }, 60_000);
    const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
    if (!reply) return res.status(502).json({ error: 'AI provider returned no text. Try again.' });
    res.json({ reply, model: CHAT_MODEL });
  } catch (err) { providerError(res, err, 'AI উত্তর'); }
});

app.post('/image', auth, async (req, res) => {
  try {
    if (!GOOGLE_API_KEY) return res.status(503).json({ reply: 'সার্ভার অ্যাডমিনকে GOOGLE_API_KEY সেট করতে হবে।' });
    const prompt = promptFrom(req, res); if (!prompt) return;
    const data = await providerJson(`${GOOGLE_API}/models/${encodeURIComponent(IMAGE_MODEL)}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GOOGLE_API_KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: `Create one high-quality image based on this prompt. Follow safety rules. Prompt: ${prompt}` }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } })
    }, 120_000);
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData?.data || p.inline_data?.data);
    const inline = imagePart?.inlineData || imagePart?.inline_data;
    if (!inline?.data) return res.status(502).json({ reply: parts.map(p => p.text || '').filter(Boolean).join('\n') || 'মডেল ছবি ফেরত দেয়নি। মডেল/API access পরীক্ষা করুন।' });
    res.json({ imageBase64: inline.data, mimeType: inline.mimeType || inline.mime_type || 'image/png', reply: parts.map(p => p.text || '').filter(Boolean).join('\n') || 'ছবি তৈরি হয়েছে।', model: IMAGE_MODEL });
  } catch (err) { providerError(res, err, 'ছবি তৈরি'); }
});

app.post('/video', auth, async (req, res) => {
  try {
    if (!GOOGLE_API_KEY) return res.status(503).json({ reply: 'সার্ভার অ্যাডমিনকে GOOGLE_API_KEY সেট করতে হবে।' });
    const prompt = promptFrom(req, res); if (!prompt) return;
    const data = await providerJson(`${GOOGLE_API}/models/${encodeURIComponent(VIDEO_MODEL)}:predictLongRunning`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GOOGLE_API_KEY },
      body: JSON.stringify({ instances: [{ prompt }], parameters: { aspectRatio: req.body?.aspectRatio === '9:16' ? '9:16' : '16:9', sampleCount: 1 } })
    }, 90_000);
    if (!data?.name) return res.status(502).json({ reply: 'ভিডিও সার্ভার কোনো operation ID দেয়নি।', error: 'Missing operation name' });
    res.json({ operation: data.name, name: data.name, done: Boolean(data.done), reply: 'ভিডিও তৈরির কাজ শুরু হয়েছে। কিছুক্ষণ পর status পরীক্ষা করুন।' });
  } catch (err) { providerError(res, err, 'ভিডিও তৈরি'); }
});

app.get('/video/status', auth, async (req, res) => {
  try {
    if (!GOOGLE_API_KEY) return res.status(503).json({ reply: 'সার্ভার অ্যাডমিনকে GOOGLE_API_KEY সেট করতে হবে।' });
    const operation = typeof req.query.operation === 'string' ? req.query.operation : '';
    // Restrict operation paths to Google model operations; never fetch arbitrary URLs.
    if (!/^models\/[A-Za-z0-9._-]+\/operations\/[A-Za-z0-9._-]+$/.test(operation)) return res.status(400).json({ reply: 'ভিডিও operation ID সঠিক নয়।', error: 'Invalid operation ID' });
    const data = await providerJson(`${GOOGLE_API}/${operation}`, { headers: { 'x-goog-api-key': GOOGLE_API_KEY } }, 45_000);
    const sample = data?.response?.generateVideoResponse?.generatedSamples?.[0] || data?.response?.generatedVideos?.[0];
    res.json({ done: Boolean(data.done), operation, name: operation, videoUri: sample?.video?.uri || sample?.videoUri || null, error: data.error?.message || null, reply: data.done ? (data.error ? `ভিডিও তৈরি ব্যর্থ: ${data.error.message}` : 'ভিডিও তৈরি সম্পন্ন।') : 'ভিডিও তৈরি হচ্ছে, একটু পরে আবার status পরীক্ষা করুন।' });
  } catch (err) { providerError(res, err, 'ভিডিও status পরীক্ষা'); }
});

app.use((err, _req, res, _next) => {
  if (err?.message?.includes('CORS')) return res.status(403).json({ error: err.message });
  console.error('Unhandled backend error:', err?.message || err);
  res.status(500).json({ error: 'Unexpected backend error.' });
});
app.listen(PORT, '0.0.0.0', () => console.log(`Dr. Munna Assist AI backend listening on ${PORT}`));
