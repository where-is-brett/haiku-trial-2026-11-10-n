import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { LEDGER_SCHEMA, importRows } from '../src/lib/store.js';

function ledger() {
  const db = new DatabaseSync(':memory:');
  db.exec(LEDGER_SCHEMA);
  return db;
}

const count = (db) => db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n;

const ROWS = [
  { date: '2026-08-31', description: 'Corner shop', cents: 1250 },
  { date: '2026-09-01', description: 'Rent', cents: -85000 },
];

test('new rows are stored and the added count is reported', () => {
  const db = ledger();
  assert.deepEqual(importRows(db, ROWS), { added: 2, skipped: 0 });
  assert.equal(count(db), 2);
});

test('an empty row list stores nothing and reports zero', () => {
  const db = ledger();
  assert.deepEqual(importRows(db, []), { added: 0, skipped: 0 });
  assert.equal(count(db), 0);
});

test('a row that cannot be stored leaves nothing from the statement stored', () => {
  const db = ledger();
  const bad = [...ROWS, { date: '2026-09-02', description: 'Bad', cents: {} }];
  assert.throws(() => importRows(db, bad));
  assert.equal(count(db), 0);
});
