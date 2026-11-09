// 노드 11 평가 기록(sdk-experiment)의 답 글에서 질문마다 3문장 넘은 횟수를 센다(읽기만). 키는 출력하지 않는다
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
const from = new Date(Date.now() - 30 * 86400e3).toISOString();
const to = new Date().toISOString();
const obs = [];
let cursor = '';
for (let i = 0; i < 30; i++) {
  const d = await get(`/api/public/v2/observations?fields=core,basic,io,metadata&environment=sdk-experiment&name=experiment-item-run&fromStartTime=${encodeURIComponent(from)}&toStartTime=${encodeURIComponent(to)}&limit=100${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`);
  obs.push(...(d.data || []).filter((o) => o.name === 'experiment-item-run' && o.environment === 'sdk-experiment'));
  cursor = d.meta && d.meta.cursor;
  if (!cursor || !(d.data || []).length) break;
}
const sentenceCount = (t) => { const n = (String(t).match(/[.!?]+(?=\s|$)/g) || []).length; return /[.!?]\s*$/.test(t) ? n : n + 1; };
const parse = (x) => { if (typeof x === 'string') { try { return JSON.parse(x); } catch { return x; } } return x; };
const textOf = (o) => { const out = parse(o.output); return typeof out === 'string' ? out : (out && out.answer) || ''; };
const qOf = (o) => { const inp = parse(o.input); return (inp && inp.video ? inp.video + ' | ' : '') + ((inp && inp.question) || ''); };
const rows = obs.map((o) => ({ rules: (o.metadata || {}).rules, trace: o.traceId, at: o.startTime, q: qOf(o).slice(0, 80), n: sentenceCount(textOf(o)), chars: textOf(o).length }));
fs.writeFileSync(new URL('./lf-exp-rows.json', import.meta.url), JSON.stringify(rows));
const byQ = {};
for (const r of rows) {
  const k = r.q || '(질문 못 읽음)';
  byQ[k] = byQ[k] || { total: 0, over: 0, traces: [] };
  byQ[k].total += 1;
  if (r.n > 3) { byQ[k].over += 1; if (byQ[k].traces.length < 2) byQ[k].traces.push(r.trace); }
}
const list = Object.entries(byQ).sort((a, b) => b[1].over / b[1].total - a[1].over / a[1].total);
console.log('answers', rows.length, 'over3', rows.filter((r) => r.n > 3).length, 'projectId', obs[0]?.projectId);
for (const [q, v] of list) console.log(`${v.over}/${v.total}\t${q}\t${v.traces.join(',')}`);
process.exitCode = 0;
