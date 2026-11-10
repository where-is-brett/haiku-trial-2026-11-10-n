# Statement import, slice 1: Parse a statement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read a bank statement CSV into rows of date, description and signed cents, and refuse any file that is not a statement with a plain error, storing nothing.

**Architecture:** One pure module, `src/lib/statement.js`, built on the existing `parseAmount` and `parseDate`. No database and no route in this slice. A small `src/lib/flags.js` reads the `statement-import` flag from the environment, default off. Nothing reads it until slice 3 mounts the page.

**Tech Stack:** Node 22 ESM, `node:test`, `node:assert/strict`. No new dependencies.

**Spec:** `.wheelhouse/feature/approved.md`

## Global Constraints

- Reuse `parseAmount` (`src/lib/money.js`) and `parseDate` (`src/lib/dates.js`) as they are; do not edit or re-implement them.
- Header is `Date`, `Description`, `Amount`, in that order, matched exactly after trimming whitespace.
- Dates are DD/MM/YYYY; output dates are `YYYY-MM-DD`.
- A bracketed amount and a minus-signed amount are both outflows: negative cents. (Pending the director's answer on the sign convention; see Task 1.)
- Feature flag name: `statement-import`.

## Review Focus

1. File starts with a UTF-8 byte-order mark, as spreadsheet exports do. Expect: the header is still recognised.
2. A description with a comma inside double quotes. Expect: one field, comma kept.
3. CRLF line endings and blank lines. Expect: rows parsed, blank lines skipped.
4. An amount with a currency sign and thousands separator, such as `£1,234.50`. Expect: 123450 cents.
5. A one-digit day or month, such as `1/9/2026`. Expect: `2026-09-01`.

Each line has its test in Task 1.

---

### Task 1: Read statement rows

**Files:**
- Create: `src/lib/statement.js`
- Test: `tests/statement.test.js`

**Interfaces:**
- Consumes: `parseAmount(text) -> number` and `parseDate(text) -> string` from `src/lib/money.js` and `src/lib/dates.js`.
- Produces: `parseStatement(text: string) -> { date: string, description: string, cents: number }[]`. Task 2 adds refusal; the return shape is fixed here.

- [ ] **Step 1: Write the failing tests**

`tests/statement.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStatement } from '../src/lib/statement.js';

const HEADER = 'Date,Description,Amount\n';

test('a row reads its date as YYYY-MM-DD and keeps its description', () => {
  const [row] = parseStatement(`${HEADER}31/08/2026,Corner shop,12.50`);
  assert.equal(row.date, '2026-08-31');
  assert.equal(row.description, 'Corner shop');
});

test('a bracketed amount is an outflow', () => {
  const [row] = parseStatement(`${HEADER}01/09/2026,Rent,(850.00)`);
  assert.equal(row.cents, -85000);
});

test('a minus-signed amount is an outflow', () => {
  const [row] = parseStatement(`${HEADER}01/09/2026,Coffee,-3.20`);
  assert.equal(row.cents, -320);
});

test('a plain amount is read as a positive figure', () => {
  const [row] = parseStatement(`${HEADER}01/09/2026,Salary,1500.00`);
  assert.equal(row.cents, 150000);
});

test('a byte-order mark before the header is ignored', () => {
  const rows = parseStatement(`﻿${HEADER}31/08/2026,Corner shop,12.50`);
  assert.equal(rows.length, 1);
});

test('a comma inside quotes stays in the description', () => {
  const [row] = parseStatement(`${HEADER}01/09/2026,"Tea, biscuits",3.00`);
  assert.equal(row.description, 'Tea, biscuits');
});

test('CRLF line endings and blank lines are skipped', () => {
  const rows = parseStatement('Date,Description,Amount\r\n31/08/2026,A,1.00\r\n\r\n01/09/2026,B,2.00\r\n');
  assert.equal(rows.length, 2);
});

test('an amount with a currency sign and thousands separator is read', () => {
  const [row] = parseStatement(`${HEADER}01/09/2026,Car,£1,234.50`);
  assert.equal(row.cents, 123450);
});

test('a one-digit day and month are read', () => {
  const [row] = parseStatement(`${HEADER}1/9/2026,Shop,1.00`);
  assert.equal(row.date, '2026-09-01');
});
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `node --test tests/statement.test.js`
Expected: FAIL, `Cannot find module '.../src/lib/statement.js'`.

- [ ] **Step 3: Implement `parseStatement` in `src/lib/statement.js`**

- Strip a leading `﻿`, split on `/\r?\n/`, drop lines that are blank after trimming, and skip the first line as the header (the header check comes in Task 2).
- `splitCsvLine(line)` splits on commas, keeps commas inside double quotes, and treats `""` inside quotes as one `"`. Trim each field.
- Date: `parseDate(fields[0])`.
- Amount: if the trimmed text matches `/^\((.*)\)$/`, return `-parseAmount(inner)`; otherwise return `parseAmount(text)`. Parsing a minus sign is already in `parseAmount`.
- Each row is `{ date, description: fields[1], cents }`.

- [ ] **Step 4: Run the tests and see them pass**

Run: `node --test tests/statement.test.js`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/statement.js tests/statement.test.js
git commit -m "Read statement rows from CSV text"
```

---

### Task 2: Refuse what is not a statement, and the flag

**Files:**
- Modify: `src/lib/statement.js`
- Create: `src/lib/flags.js`
- Test: `tests/statement.test.js` (append), `tests/flags.test.js`

**Interfaces:**
- Consumes: `parseStatement` from Task 1.
- Produces: `class StatementError extends Error` exported from `src/lib/statement.js`, whose `message` is plain text for the director. `flagOn(name: string, env?: Record<string, string | undefined>) -> boolean` exported from `src/lib/flags.js`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/statement.test.js` (add `StatementError` to the import):

```js
test('a header that is not Date, Description, Amount is refused', () => {
  assert.throws(
    () => parseStatement('Date,Payee,Amount\n01/09/2026,Rent,(850.00)'),
    (err) => err instanceof StatementError && /Date, Description, Amount/.test(err.message),
  );
});

test('an empty file is refused', () => {
  assert.throws(() => parseStatement(''), StatementError);
});

test('a date that is not DD/MM/YYYY is refused', () => {
  assert.throws(() => parseStatement(`${HEADER}2026-09-01,Rent,850.00`), StatementError);
});

test('a day or month out of range is refused', () => {
  assert.throws(() => parseStatement(`${HEADER}31/13/2026,Rent,850.00`), StatementError);
});

test('an amount that is not a number is refused', () => {
  assert.throws(() => parseStatement(`${HEADER}01/09/2026,Rent,abc`), StatementError);
});

test('an amount that is both bracketed and minus-signed is refused', () => {
  assert.throws(() => parseStatement(`${HEADER}01/09/2026,Rent,(-40.00)`), StatementError);
});

test('a row with the wrong number of fields is refused', () => {
  assert.throws(() => parseStatement(`${HEADER}01/09/2026,Rent`), StatementError);
});
```

`tests/flags.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flagOn } from '../src/lib/flags.js';

test('a flag is on only when its environment variable is "on"', () => {
  assert.equal(flagOn('statement-import', { FLAG_STATEMENT_IMPORT: 'on' }), true);
  assert.equal(flagOn('statement-import', { FLAG_STATEMENT_IMPORT: 'off' }), false);
  assert.equal(flagOn('statement-import', {}), false);
});
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `node --test tests/`
Expected: FAIL on the new tests, `flags.js` not found and `StatementError` not exported.

- [ ] **Step 3: Implement**

- `class StatementError extends Error` in `statement.js`, with `name = 'StatementError'`.
- Header: no lines, or the first line's trimmed fields are not exactly `['Date', 'Description', 'Amount']`, throws `StatementError` with a message that names those three columns.
- Row checks, each throwing `StatementError` with a message naming the data row number: field count is 3; date matches `/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/` with month 1 to 12 and day 1 to 31; amount core (after removing `£ $ €`, commas and spaces) matches `/^(\(\d+(\.\d+)?\)|-?\d+(\.\d+)?)$/`, which rejects bracket and minus together.
- `flags.js`: `flagOn(name, env = process.env)` returns `env['FLAG_' + name.toUpperCase().replaceAll('-', '_')] === 'on'`.

- [ ] **Step 4: Run the tests and see them pass**

Run: `npm test`
Expected: PASS, every test in `tests/`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/statement.js src/lib/flags.js tests/statement.test.js tests/flags.test.js
git commit -m "Refuse files that are not statements; add statement-import flag reader"
```
