// ASD1-M2-09 — logika symulatora (bez DOM). Działa w przeglądarce i w Node.
(function (root) {
'use strict';
const ID_RE = /^[A-Za-z0-9-]+$/, MAX = 1000;
const newState = () => ({ candidates: [], voters: [], attempts: [] });

// Własne wyszukiwanie liniowe (pierwsze dopasowanie). st: {records, comparisons}
function findBy(list, pred, st) {
  for (let i = 0; i < list.length; i++) {
    if (st) { st.records++; st.comparisons++; }
    if (pred(list[i])) return i;
  }
  return -1;
}
// Własne sortowanie przez wstawianie (stabilne). before(x,y) = x ma stać przed y.
function insertionSort(arr, before, st) {
  const a = arr.slice();
  for (let i = 1; i < a.length; i++) {
    const x = a[i]; let j = i - 1;
    while (j >= 0) {
      if (st) st.comparisons++;
      if (before(x, a[j])) { a[j + 1] = a[j]; j--; } else break;
    }
    a[j + 1] = x;
  }
  return a;
}
function idError(list, id) {
  if (!id) return 'ID nie może być puste';
  if (!ID_RE.test(id)) return 'ID: tylko A–Z, cyfry i łącznik';
  if (list.length >= MAX) return 'Limit ' + MAX + ' rekordów';
  if (findBy(list, r => r.id === id) >= 0) return 'ID już istnieje';
  return null;
}
function addCandidate(s, id, name) {
  id = String(id == null ? '' : id).trim(); name = String(name == null ? '' : name).trim();
  const e = idError(s.candidates, id) || (name ? null : 'Nazwa nie może być pusta');
  if (e) return { ok: false, reason: e };
  s.candidates.push({ id, name }); return { ok: true };
}
function addVoter(s, id) {
  id = String(id == null ? '' : id).trim();
  const e = idError(s.voters, id);
  if (e) return { ok: false, reason: e };
  s.voters.push({ id }); return { ok: true };
}
// Walidacja (osobno) -> zapis. Zwraca {ok, reason, trace, stats}.
function castVote(s, voterId, candId) {
  voterId = String(voterId == null ? '' : voterId).trim(); candId = String(candId == null ? '' : candId).trim();
  const st = { records: 0, comparisons: 0 };
  const accBefore = s.attempts.filter(a => a.status === 'ok').length;
  let reason = null;
  if (s.attempts.length >= MAX) return { ok: false, reason: 'Limit prób (' + MAX + ')', recorded: false, trace: [], stats: st };
  if (findBy(s.voters, v => v.id === voterId, st) < 0) reason = 'Wyborca nieuprawniony';
  else if (findBy(s.candidates, c => c.id === candId, st) < 0) reason = 'Nieznany kandydat';
  else if (findBy(s.attempts, a => a.status === 'ok' && a.voter === voterId, st) >= 0) reason = 'Wyborca już zagłosował';
  s.attempts.push({ voter: voterId, candidate: candId, order: s.attempts.length + 1, status: reason ? 'rejected' : 'ok', reason: reason || '' });
  const accAfter = accBefore + (reason ? 0 : 1);
  return { ok: !reason, reason: reason || '', recorded: true, stats: st,
    trace: ['przed: przyjęte=' + accBefore, 'decyzja: ' + voterId + '→' + candId + ' ' + (reason ? 'ODRZUCONY (' + reason + ')' : 'PRZYJĘTY'), 'po: przyjęte=' + accAfter] };
}
// Obliczenia z listy zaakceptowanych głosów.
function results(s) {
  const find = { records: 0, comparisons: 0 }, sort = { records: 0, comparisons: 0 };
  const rows = s.candidates.map(c => ({ id: c.id, name: c.name, votes: 0, percent: 0 }));
  let total = 0;
  for (const a of s.attempts) {
    if (a.status !== 'ok') continue;
    const i = findBy(rows, r => r.id === a.candidate, find);
    if (i >= 0) { rows[i].votes++; total++; }
  }
  rows.forEach(r => { r.percent = total ? r.votes / total * 100 : 0; });
  const sorted = insertionSort(rows, (x, y) => x.votes > y.votes || (x.votes === y.votes && x.id < y.id), sort);
  const max = sorted.length ? sorted[0].votes : 0;
  const leaders = total ? sorted.filter(r => r.votes === max) : [];
  const turnout = s.voters.length ? total / s.voters.length * 100 : 0;
  const rejected = s.attempts.length - total;
  let message;
  if (!total) message = 'Brak danych: nie przyjęto żadnego głosu (0%).';
  else if (leaders.length === 1) message = 'Wygrywa ' + leaders[0].id + '.';
  else message = 'Remis na 1. miejscu: ' + leaders.map(l => l.id).join(', ') + '.';
  return { rows: sorted, total, rejected, turnout, leaders, message, findStats: find, sortStats: sort };
}
function exportJSON(s) {
  return JSON.stringify({ format: 'asd1-m2-09', version: 1, candidates: s.candidates, voters: s.voters,
    attempts: s.attempts.map(a => ({ voter: a.voter, candidate: a.candidate, status: a.status, reason: a.reason })) }, null, 2);
}
// Najpierw sprawdza cały plik (odtwarza próby), nie zmienia bieżącego stanu.
function importJSON(text) {
  const bad = r => ({ ok: false, reason: r });
  let d; try { d = JSON.parse(text); } catch (e) { return bad('Niepoprawny JSON'); }
  if (!d || d.format !== 'asd1-m2-09' || d.version !== 1) return bad('Zły format lub wersja pliku');
  if (![d.candidates, d.voters, d.attempts].every(Array.isArray)) return bad('Brak list danych');
  const s = newState();
  for (const c of d.candidates) { const r = c && typeof c === 'object' ? addCandidate(s, c.id, c.name) : { ok: false, reason: 'zły rekord' }; if (!r.ok) return bad('Kandydat: ' + r.reason); }
  for (const v of d.voters) { const r = v && typeof v === 'object' ? addVoter(s, v.id) : { ok: false, reason: 'zły rekord' }; if (!r.ok) return bad('Wyborca: ' + r.reason); }
  for (const a of d.attempts) {
    if (!a || typeof a.voter !== 'string' || typeof a.candidate !== 'string') return bad('Zła próba głosowania');
    const r = castVote(s, a.voter, a.candidate);
    if (!r.recorded || (r.ok ? 'ok' : 'rejected') !== a.status) return bad('Próba ' + a.voter + '→' + a.candidate + ' niezgodna z regułami');
  }
  return { ok: true, state: s };
}
// Scenariusze
function scenarioControl() {
  const s = newState(); addCandidate(s, 'A', 'Kandydat A'); addCandidate(s, 'B', 'Kandydat B');
  ['U1', 'U2', 'U3', 'U4'].forEach(v => addVoter(s, v));
  [['U1', 'A'], ['U2', 'B'], ['U1', 'B'], ['U3', 'X'], ['U3', 'A']].forEach(p => castVote(s, p[0], p[1]));
  return s;
}
function scenarioTie() {
  const s = newState(); addCandidate(s, 'A', 'Kandydat A'); addCandidate(s, 'B', 'Kandydat B'); addCandidate(s, 'C', 'Kandydat C');
  ['U1', 'U2', 'U3'].forEach(v => addVoter(s, v));
  [['U1', 'B'], ['U2', 'A'], ['U3', 'C']].forEach(p => castVote(s, p[0], p[1]));
  return s;
}
function lcg(seed) { let x = seed >>> 0; return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296; }
function scenarioLarge(seed) {
  const r = lcg(seed || 42), s = newState();
  for (let i = 1; i <= 20; i++) addCandidate(s, 'K' + i, 'Kandydat ' + i);
  for (let i = 1; i <= 1000; i++) addVoter(s, 'W' + i);
  for (let i = 0; i < 1000; i++) castVote(s, 'W' + (1 + Math.floor(r() * 1100)), r() < 0.95 ? 'K' + (1 + Math.floor(r() * 20)) : 'X');
  return s;
}
// Porównanie sortowania: kind = 'ordered' | 'reversed' | 'random'
function benchSort(n, kind) {
  const r = lcg(7), arr = [];
  for (let i = 0; i < n; i++) arr.push({ id: 'R' + String(i).padStart(4, '0'), votes: kind === 'ordered' ? n - i : kind === 'reversed' ? i : Math.floor(r() * n) });
  const before = (x, y) => x.votes > y.votes || (x.votes === y.votes && x.id < y.id);
  const st = { comparisons: 0 }, mine = insertionSort(arr, before, st);
  const ref = arr.slice().sort((x, y) => before(x, y) ? -1 : before(y, x) ? 1 : 0);
  return { n, kind, comparisons: st.comparisons, same: JSON.stringify(mine) === JSON.stringify(ref) };
}
// Porównanie wyszukiwania: pos = 'start' | 'end' | 'missing' (pierwsze dopasowanie)
function benchSearch(n, pos) {
  const list = []; for (let i = 0; i < n; i++) list.push({ id: 'V' + i });
  const key = pos === 'start' ? 'V0' : pos === 'end' ? 'V' + (n - 1) : 'NONE', st = { records: 0, comparisons: 0 };
  const idx = findBy(list, v => v.id === key, st);
  return { n, pos, found: idx >= 0, records: st.records, comparisons: st.comparisons };
}
const api = { newState, findBy, insertionSort, addCandidate, addVoter, castVote, results, exportJSON, importJSON, scenarioControl, scenarioTie, scenarioLarge, benchSort, benchSearch };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Sim = api;
})(typeof self !== 'undefined' ? self : this);
