// Uruchomienie: node tests.js
const assert = require('assert'), S = require('./logic.js');
let n = 0; const t = (name, f) => { f(); n++; console.log('OK  ' + name); };
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.05, a + ' != ' + b);

t('1. przykład kontrolny', () => {
  const s = S.scenarioControl(), r = S.results(s);
  assert.strictEqual(r.total, 3); assert.strictEqual(r.rejected, 2);
  assert.deepStrictEqual(r.rows.map(x => [x.id, x.votes]), [['A', 2], ['B', 1]]);
  near(r.rows[0].percent, 66.7); near(r.rows[1].percent, 33.3); near(r.turnout, 75);
  assert.deepStrictEqual(r.leaders.map(x => x.id), ['A']); assert.strictEqual(r.message, 'Wygrywa A.');
});
t('2. drugi głos tej samej osoby odrzucony', () => {
  const s = S.newState(); S.addCandidate(s, 'A', 'a'); S.addCandidate(s, 'B', 'b'); S.addVoter(s, 'U1');
  assert.ok(S.castVote(s, 'U1', 'A').ok);
  const r = S.castVote(s, 'U1', 'B'); assert.strictEqual(r.ok, false); assert.strictEqual(r.reason, 'Wyborca już zagłosował');
  assert.strictEqual(S.results(s).total, 1);
});
t('3. zły kandydat nie zużywa prawa głosu', () => {
  const s = S.newState(); S.addCandidate(s, 'A', 'a'); S.addVoter(s, 'U1');
  assert.strictEqual(S.castVote(s, 'U1', 'X').ok, false);
  assert.ok(S.castVote(s, 'U1', 'A').ok);
});
t('4. remis wskazuje wszystkich liderów', () => {
  const r = S.results(S.scenarioTie());
  assert.deepStrictEqual(r.leaders.map(x => x.id), ['A', 'B', 'C']); assert.ok(r.message.startsWith('Remis'));
});
t('5. brak głosów: 0% i brak dzielenia przez zero', () => {
  const s = S.newState(); S.addCandidate(s, 'A', 'a'); S.addVoter(s, 'U1');
  const r = S.results(s); assert.strictEqual(r.rows[0].percent, 0); assert.strictEqual(r.turnout, 0);
  assert.strictEqual(r.leaders.length, 0); assert.ok(r.message.startsWith('Brak danych'));
});
t('6. pusta lista', () => {
  const r = S.results(S.newState()); assert.deepStrictEqual(r.rows, []); assert.strictEqual(r.turnout, 0); assert.ok(!Number.isNaN(r.turnout));
});
t('7. eksport/import odtwarza wynik; błędny plik odrzucony', () => {
  const s = S.scenarioControl(), imp = S.importJSON(S.exportJSON(s));
  assert.ok(imp.ok); assert.deepStrictEqual(S.results(imp.state).rows, S.results(s).rows);
  assert.strictEqual(S.importJSON('{zły').ok, false);
  const d = JSON.parse(S.exportJSON(s)); d.attempts[0].status = 'rejected';
  assert.strictEqual(S.importJSON(JSON.stringify(d)).ok, false);
  const e = JSON.parse(S.exportJSON(s)); e.version = 99; assert.strictEqual(S.importJSON(JSON.stringify(e)).ok, false);
});
t('8. własne sortowanie vs wzorzec (uporządkowane, odwrócone, losowe)', () => {
  for (const n of [10, 100, 1000]) for (const k of ['ordered', 'reversed', 'random']) assert.ok(S.benchSort(n, k).same, n + k);
  assert.strictEqual(S.benchSort(100, 'ordered').comparisons, 99);
  assert.strictEqual(S.benchSort(100, 'reversed').comparisons, 100 * 99 / 2);
});
t('9. wyszukiwanie: początek / koniec / brak', () => {
  assert.strictEqual(S.benchSearch(100, 'start').records, 1);
  assert.strictEqual(S.benchSearch(100, 'end').records, 100);
  const m = S.benchSearch(100, 'missing'); assert.strictEqual(m.records, 100); assert.strictEqual(m.found, false);
});
t('10. walidacja ID, HTML jako tekst, brak częściowego zapisu', () => {
  const s = S.newState();
  assert.strictEqual(S.addCandidate(s, '', 'x').ok, false); assert.strictEqual(S.addCandidate(s, 'A B', 'x').ok, false);
  assert.ok(S.addCandidate(s, 'A', '<b>x</b>').ok); assert.strictEqual(S.addCandidate(s, 'A', 'y').ok, false);
  assert.strictEqual(s.candidates.length, 1); assert.strictEqual(s.candidates[0].name, '<b>x</b>');
});
t('11. scenariusz duży jest powtarzalny i w limicie', () => {
  const a = S.results(S.scenarioLarge(42)), b = S.results(S.scenarioLarge(42));
  assert.deepStrictEqual(a.rows, b.rows); assert.ok(a.total + a.rejected <= 1000);
});
console.log('\nPrzeszło ' + n + ' testów.');
