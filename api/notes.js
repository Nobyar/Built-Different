import { put, list, del } from '@vercel/blob';
import crypto from 'node:crypto';

const MAX_NAME = 40, MAX_TEXT = 600, MAX_PHOTOS = 4, MAX_PHOTO_BYTES = 900_000, MAX_BODY = 4_000_000;
const RATE_N = 6, RATE_WINDOW = 3600_000, MAX_RETURN = 200;
const SITE_RE = /^[A-Z]{2}-\d{1,2}$|^(VALLEYVIEW|RIVERSBEND|ALOSA)$/;
const SALT = process.env.BLOB_READ_WRITE_TOKEN || 'bd';
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, n);
const esc = s => s.replace(/[&<>"'`]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]));
function sniff(b) {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return ['image/jpeg', 'jpg'];
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return ['image/png', 'png'];
  if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') return ['image/webp', 'webp'];
  return null;
}
async function listAll(prefix) {
  const out = []; let cursor;
  do { const r = await list({ prefix, cursor, limit: 1000 }); out.push(...r.blobs); cursor = r.hasMore ? r.cursor : null; } while (cursor);
  return out;
}
// pathname: entries/<kind>/<ts>-<ipTag>-<id>[-random].json
const parse = p => { const m = p.match(/^entries\/(tree|checkin)\/(\d+)-([0-9a-f]{12})-([0-9a-f]{16})/); return m && { kind: m[1], ts: +m[2], ip: m[3], id: m[4] }; };

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (req.method === 'GET') {
      const kind = req.query.kind === 'checkin' ? 'checkin' : 'tree';
      const items = (await listAll(`entries/${kind}/`)).map(b => ({ b, m: parse(b.pathname) })).filter(x => x.m).sort((a, c) => c.m.ts - a.m.ts).slice(0, MAX_RETURN);
      const notes = (await Promise.all(items.map(async ({ b }) => { try { const r = await fetch(b.url); if (!r.ok) return null; const n = await r.json(); delete n.tokenHash; return n; } catch { return null; } }))).filter(Boolean);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ notes });
    }
    if (req.method === 'POST') {
      if (Number(req.headers['content-length'] || 0) > MAX_BODY) return res.status(413).json({ error: 'Upload too large — try fewer or smaller photos.' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      if (body.website) return res.status(200).json({ ok: true, note: null }); // honeypot: pretend success
      if (body.t && Date.now() - Number(body.t) < 2500) return res.status(429).json({ error: 'That was quick! Please try again in a few seconds.' });
      const kind = body.kind === 'checkin' ? 'checkin' : 'tree';
      const text = clean(body.text, MAX_TEXT + 1);
      if (kind === 'tree' && text.length < 2) return res.status(400).json({ error: 'Note is empty.' });
      if (text.length > MAX_TEXT) return res.status(400).json({ error: `Notes are limited to ${MAX_TEXT} characters.` });
      let site = null, visitDate = null;
      if (kind === 'checkin') {
        site = clean(body.site, 20); if (!SITE_RE.test(site)) return res.status(400).json({ error: 'Unknown campsite.' });
        visitDate = clean(body.visitDate, 10);
        const d = Date.parse(visitDate + 'T12:00:00Z');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate) || isNaN(d) || d > Date.now() + 2 * 86400e3 || d < Date.parse('1960-01-01')) return res.status(400).json({ error: 'Please pick a valid visit date (not in the future).' });
      }
      const name = body.anonymous ? '' : clean(body.name, MAX_NAME);
      const photos = Array.isArray(body.photos) ? body.photos : [];
      if (photos.length > MAX_PHOTOS) return res.status(400).json({ error: `Up to ${MAX_PHOTOS} photos per post.` });
      const ip = String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown').split(',')[0].trim();
      const ipTag = sha(SALT + ip).slice(0, 12);
      const recent = (await listAll('entries/')).map(b => parse(b.pathname)).filter(m => m && m.ip === ipTag && Date.now() - m.ts < RATE_WINDOW);
      if (recent.length >= RATE_N) return res.status(429).json({ error: `Limit is ${RATE_N} posts per hour. Please come back later.` });
      const bufs = [];
      for (const p of photos) {
        const m = String(p).match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
        if (!m) return res.status(400).json({ error: 'Photos must be JPEG, PNG or WebP.' });
        const buf = Buffer.from(m[2], 'base64'); const type = sniff(buf);
        if (!type) return res.status(400).json({ error: 'That file does not look like an image.' });
        if (buf.length > MAX_PHOTO_BYTES) return res.status(400).json({ error: 'A photo is too large after compression.' });
        bufs.push([buf, type]);
      }
      const id = crypto.randomBytes(8).toString('hex'), ts = Date.now(), token = crypto.randomBytes(24).toString('hex');
      const urls = [];
      for (let i = 0; i < bufs.length; i++) { const [buf, [ct, ext]] = bufs[i]; const r = await put(`photos/${kind}/${id}-${i}.${ext}`, buf, { access: 'public', contentType: ct, addRandomSuffix: true }); urls.push(r.url); }
      const note = { id, kind, ts, name: esc(name), anonymous: !name, text: esc(text), photos: urls, site, visitDate, tokenHash: sha(token) };
      await put(`entries/${kind}/${ts}-${ipTag}-${id}.json`, JSON.stringify(note), { access: 'public', contentType: 'application/json', addRandomSuffix: true });
      delete note.tokenHash;
      return res.status(201).json({ ok: true, note, deleteToken: token });
    }
    if (req.method === 'DELETE') {
      const id = String(req.query.id || ''), token = String(req.headers['x-delete-token'] || '');
      if (!/^[0-9a-f]{16}$/.test(id) || !token) return res.status(400).json({ error: 'Bad request' });
      const b = (await listAll('entries/')).find(x => parse(x.pathname)?.id === id);
      if (!b) return res.status(404).json({ error: 'Not found' });
      const n = await (await fetch(b.url, { cache: 'no-store' })).json();
      if (n.tokenHash !== sha(token)) return res.status(403).json({ error: 'Not allowed' });
      await del([b.url, ...(n.photos || [])]);
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, POST, DELETE'); return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error — please try again.' }); }
}
