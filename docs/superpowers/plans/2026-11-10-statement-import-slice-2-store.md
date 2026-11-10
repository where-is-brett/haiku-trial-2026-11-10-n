# Statement import, slice 2: Store without duplicates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store parsed statement rows in the ledger table, skipping any row that duplicates a stored row, and report the added and skipped counts.

**Architecture:** One new module, `src/lib/store.js`, that takes an open `DatabaseSync` handle and the rows from `parseStatement`. Each import runs in one transaction. Duplicates are found with a query against the existing `transactions` table, checked row by row as they are inserted. No route, no page, and `src/server.js` is not edited.

**Tech Stack:** Node 22 ESM, `node:sqlite` (`DatabaseSync`), `node:test`, `node:assert/strict`. No new dependencies.

**Spec:** `.wheelhouse/feature/approved.md`

## Global Constraints

- Table `transactions (id INTEGER PRIMARY KEY, date TEXT, description TEXT, cents INTEGER)`; no schema change.
- A duplicate is a stored row with the same date, description and cents. Matching is exact.
- Amounts are signed integer cents; outflows are negative (from slice 1).
- Result shape is `{ added, skipped }`.
- Feature flag `statement-import` is not read in this slice.

## Review Focus

1. Importing the same rows a second time adds nothing and reports `added 0, skipped n`. Test in Task 2.
2. Two identical rows in one file (for example two identical card payments on one day) are stored once; the second is skipped. This is the spec's literal rule, so the test pins it and the report flags it as a concern. Test in Task 2.
3. Same date and description but different cents is not a duplicate. Test in Task 2.
4. Same date and cents but a different description, including a case difference, is not a duplicate. Test in Task 2.
5. A row that fails to store leaves nothing from that statement stored. Test in Task 1.
6. An empty row list reports `added 0, skipped 0` and stores nothing. Test in Task 1.

---

### Task 1: Store rows and count what was added

**Files:**
- Create: `src/lib/store.js`
- Test: `tests/store.test.js`

**Interfaces:**
- Consumes: statement rows `{ date: string, description: string, cents: number }[]` from `parseStatement` in `src/lib/statement.js`.
- Produces:
  - `export const LEDGER_SCHEMA: string`, the exact `CREATE TABLE IF NOT EXISTS transactions (...)` statement from `src/server.js`, so slice 3 can reuse it.
  - `export function importRows(db: DatabaseSync, rows: Row[]) -> { added: number, skipped: number }`. Task 1 sets `skipped` to 0; Task 2 fills it in.

- [ ] **Step 1: Write the failing tests**

`tests/store.test.js`:

```js
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
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `node --test tests/store.test.js`
Expected: FAIL with `Cannot find module` for `src/lib/store.js`.

- [ ] **Step 3: Implement `src/lib/store.js`**

- `LEDGER_SCHEMA` is the same string as the `db.exec` in `src/server.js` (line 8).
- `importRows`: `db.exec('BEGIN')`, then for each row run an `INSERT INTO transactions (date, description, cents) VALUES (?, ?, ?)` prepared once, count added; on success `db.exec('COMMIT')` and return `{ added, skipped: 0 }`; on any throw, `db.exec('ROLLBACK')` and rethrow.

- [ ] **Step 4: Run the tests and see them pass**

Run: `node --test tests/store.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/store.js tests/store.test.js
git commit -m "Store statement rows in one transaction"
```

---

### Task 2: Skip rows that duplicate a stored row

**Files:**
- Modify: `src/lib/store.js`
- Test: `tests/store.test.js` (append)

**Interfaces:**
- Consumes: `importRows` and `LEDGER_SCHEMA` from Task 1.
- Produces: unchanged signature; `skipped` is now filled in.

- [ ] **Step 1: Write the failing tests**

Append to `tests/store.test.js`:

```js
test('importing the same rows twice adds nothing the second time', () => {
  const db = ledger();
  importRows(db, ROWS);
  assert.deepEqual(importRows(db, ROWS), { added: 0, skipped: 2 });
  assert.equal(count(db), 2);
});

test('two identical rows in one file are stored once', () => {
  const db = ledger();
  const twice = [ROWS[0], ROWS[0]];
  assert.deepEqual(importRows(db, twice), { added: 1, skipped: 1 });
  assert.equal(count(db), 1);
});

test('same date and description with different cents is not a duplicate', () => {
  const db = ledger();
  importRows(db, [ROWS[0]]);
  assert.deepEqual(importRows(db, [{ ...ROWS[0], cents: 1300 }]), { added: 1, skipped: 0 });
});

test('same date and cents with a different description is not a duplicate', () => {
  const db = ledger();
  importRows(db, [ROWS[0]]);
  assert.deepEqual(importRows(db, [{ ...ROWS[0], description: 'corner shop' }]), { added: 1, skipped: 0 });
});
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `node --test tests/store.test.js`
Expected: FAIL on the four new tests; the second import adds rows instead of skipping.

- [ ] **Step 3: Implement the duplicate check**

In `importRows`, inside the transaction and before each insert, run a prepared `SELECT 1 FROM transactions WHERE date = ? AND description = ? AND cents = ? LIMIT 1`. If it returns a row, increment `skipped` and move on; otherwise insert and increment `added`. Because each row is checked after the previous insert, repeats within one file are caught.

- [ ] **Step 4: Run the full suite and see it pass**

Run: `npm test`
Expected: PASS, every test in `tests/` (42 existing plus 7 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/store.js tests/store.test.js
git commit -m "Skip statement rows that duplicate a stored row"
```
