// 메인 퀘스트 08: staging kid-ask 트레이스를 버전(Cloud Run 리비전)별로 나눠 3문장 넘은 답·지연·비용을 센다(읽기만)
import fs from 'node:fs';
const env = Object.fromEntries(fs.readFileSync(process.env.LANGFUSE_ENV || 'data/langfuse.env', 'utf8').split(/\r?\n/).filter((l) => /^\w+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
const base = (env.LANGFUSE_BASE_URL || 'https://jp.cloud.langfuse.com').replace(/\/$/, '');
const auth = 'Basic ' + Buffer.from(`${env.LANGFUSE_PUBLIC_KEY}:${env.LANGFUSE_SECRET_KEY}`).toString('base64');
const get = async (path) => {
  let r;
  for (let t = 0; t < 5; t++) {
    r = await fetch(base + path, { headers: { Authorization: auth } });
    if (r.status !== 429) break;
    const w = Number((await r.clone().json().catch(() => ({}))).details?.retryAfterSeconds || 60);
    await new Promise((ok) => setTimeout(ok, (w + 2) * 1000));
  }
  const text = await r.text();
  if (!r.ok) throw new Error(path + ' ' + r.status + ' ' + text.slice(0, 300));
  return JSON.parse(text);
};
const from = new Date(Date.now() - 12 * 3600e3).toISOString();
const to = new Date().toISOString();
const obs = [];
let cursor = '';
for (let i = 0; i < 20; i++) {
  const d = await get(`/api/public/v2/observations?fields=core,basic,usage,io,metadata&environment=staging&fromStartTime=${encodeURIComponent(from)}&toStartTime=${encodeURIComponent(to)}&limit=100${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`);
  obs.push(...(d.data || []));
  cursor = d.meta && d.meta.cursor;
  if (!cursor || !(d.data || []).length) break;
}
const parse = (x) => { try { return typeof x === 'string' ? JSON.parse(x) : x; } catch { return x; } };
const sentences = (t) => String(t).split(/(?<=[.!?])\s+/).filter((s) => s.trim()).length;
// 질문 → 유형(보낸 스크립트의 기록)
const typeOf = {};
for (const set of ['before', 'before2', 'after']) {
  const p = new URL(`./quest08-${set}.json`, import.meta.url);
  if (fs.existsSync(p)) for (const r of JSON.parse(fs.readFileSync(p, 'utf8'))) typeOf[r.question] = { type: r.type === 'redirect' || ['homework', 'quiz-answer', 'meet', 'off-topic', 'personal', 'not-in-video'].includes(r.type) ? (r.type === 'redirect' ? 'redirect' : 'other') : 'normal', set };
}
const spans = obs.filter((o) => o.name === 'kid-ask');
const gens = new Map(obs.filter((o) => o.name === 'answer').map((o) => [o.traceId, o]));
const rows = spans.map((s) => {
  const inp = parse(s.input) || {};
  const out = parse(s.output) || {};
  const g = gens.get(s.traceId) || {};
  const q = inp.question || (typeof inp === 'string' ? inp : '');
  const ans = out.answer || '';
  return { version: s.version, trace: s.traceId, at: s.startTime, q, set: (typeOf[q] || {}).set || '?', kind: (typeOf[q] || {}).type || '?', n: ans ? sentences(ans) : null, latency: s.latency, cost: g.totalCost || 0 };
}).filter((r) => r.set !== '?');
fs.writeFileSync(new URL('./quest08-version-rows.json', import.meta.url), JSON.stringify(rows, null, 1));
const agg = {};
for (const r of rows) {
  const k = `${r.version} | ${r.set}`;
  const a = (agg[k] = agg[k] || { n: 0, over: 0, noText: 0, lat: [], cost: 0 });
  a.n++;
  if (r.n === null) a.noText++;
  else if (r.n > 3) a.over++;
  a.lat.push(r.latency || 0);
  a.cost += r.cost;
}
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
console.log('staging kid-ask traces', spans.length, 'matched', rows.length, 'projectId', spans[0]?.projectId);
for (const [k, a] of Object.entries(agg)) console.log(`${k}: ${a.over}/${a.n - a.noText} 3문장 넘음, 글 없음 ${a.noText}, 지연 중앙값 ${med(a.lat).toFixed(2)}초, 비용 합계 $${a.cost.toFixed(5)} (1번 $${(a.cost / a.n).toFixed(6)})`);
for (const r of rows.filter((x) => x.n > 3)) console.log(`  넘음 ${r.version} ${r.n}문장 ${r.trace} ${r.q}`);
process.exitCode = 0;
