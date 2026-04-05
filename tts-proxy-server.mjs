import http from 'node:http';
import { URL } from 'node:url';
const PORT = process.env.TTS_PROXY_PORT ? Number(process.env.TTS_PROXY_PORT) : 3001;
const NARAKEET_API_KEY = process.env.NARAKEET_API_KEY;
const NARAKEET_BASE = 'https://api.narakeet.com/text-to-speech/mp3';

function pickNarakeetVoice(lang) {
    if (lang === 'am') return process.env.NARAKEET_AM_VOICE || 'Tamagne';
    // Fallbacks (not required for this request)
    if (lang === 'en') return 'mickey';
    return 'mickey';
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer(async (req, res) => {
    try {
        const u = new URL(req.url, `http://${req.headers.host}`);

        if (req.method === 'OPTIONS' && u.pathname === '/api/tts') {
            setCors(res);
            res.statusCode = 204;
            res.end();
            return;
        }

        if (u.pathname !== '/api/tts' || req.method !== 'POST') {
            res.statusCode = 404;
            res.end('Not found');
            return;
        }

        if (!NARAKEET_API_KEY) {
            res.statusCode = 500;
            res.end('Missing NARAKEET_API_KEY');
            return;
        }

        setCors(res);

        const lang = u.searchParams.get('lang') || 'en';
        const voice = pickNarakeetVoice(lang);

        const buf = await readBody(req);
        // Narakeet short content API is limited to ~1KB.
        // Our frontend also chunks, but enforce a hard cap.
        const text = buf.toString('utf8').slice(0, 900);

        const response = await fetch(`${NARAKEET_BASE}?voice=${encodeURIComponent(voice)}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/octet-stream',
                'Content-Type': 'text/plain',
                'x-api-key': NARAKEET_API_KEY
            },
            body: text
        });

        if (!response.ok) {
            res.statusCode = response.status || 500;
            const msg = await response.text().catch(() => '');
            res.end(msg || 'Narakeet TTS error');
            return;
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'audio/mpeg');
        const out = Buffer.from(await response.arrayBuffer());
        res.end(out);
    } catch (e) {
        res.statusCode = 500;
        res.end(`TTS proxy error: ${e?.message || e}`);
    }
});

server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[tts-proxy-server] listening on http://localhost:${PORT}/ (POST /api/tts?lang=am)`);
});

