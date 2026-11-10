# Shop categories Implementation Plan

> **For agentic workers:** Implement this plan task by task, in order. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every transaction gets a category key, taken from the shop its description names.

**Architecture:** One module, `src/lib/categories.js`, holds the category list, the shop list and one matching function. The matching is a plain case-insensitive `includes` over the shop list in its given order, so the first listed shop that the description contains decides the category.

**Tech Stack:** Node 22 ES modules, `node:test` run by `npm test`. No new dependencies.

**Spec:** `.wheelhouse/feature/approved.md`

## Global Constraints

- Files are ES modules (`"type": "module"` in `package.json`); imports use the `.js` extension.
- Tests use `node:test` and `node:assert/strict`, live in `tests/`, and run with `npm test`.
- Category keys and labels are copied verbatim from the spec: `groceries` / `Groceries`, `eating_out` / `Eating out`, `transport` / `Transport`, `bills` / `Bills`, `shopping` / `Shopping`, `health` / `Health`, `income` / `Income`, `other` / `Other`.
- Matching ignores case by lowercasing both the description and the shop name with `toLowerCase()`. Shop names are never used as regular expressions.
- Open question `q-shop-categories-1`: the spec lists 27 shops and the brief's done contract says 28. Build on the 27 listed in the spec. Do not add or change a shop until the director answers.

## Review Focus

1. An empty string description returns `other` and does not throw.
2. A missing description (`null` or `undefined`) returns `other` and does not throw.
3. A non-string description (for example a number) returns `other` and does not throw.
4. A shop name containing punctuation (`Pasta, Pizza & Co`) matches literally, not as a pattern.
5. A shop name matches in any letter case (`GREENBARROW FRESH`, `kestrel coffee bar`).

---

### Task 1: Category list and shop table

**Files:**
- Create: `src/lib/categories.js`
- Test: `tests/categories.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `export const CATEGORIES` — an array of 8 `{ key, label }` objects in the spec's order. `export const SHOPS` — an array of 27 `{ name, category }` objects in the spec's order, where `category` is a key from `CATEGORIES`.

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, SHOPS } from '../src/lib/categories.js';

test('the eight categories come in the order given', () => {
  assert.deepEqual(CATEGORIES, [
    { key: 'groceries', label: 'Groceries' },
    { key: 'eating_out', label: 'Eating out' },
    { key: 'transport', label: 'Transport' },
    { key: 'bills', label: 'Bills' },
    { key: 'shopping', label: 'Shopping' },
    { key: 'health', label: 'Health' },
    { key: 'income', label: 'Income' },
    { key: 'other', label: 'Other' },
  ]);
});

test('each shop in the spec maps to its category key', () => {
  assert.deepEqual(SHOPS, [
    { name: 'Greenbarrow Fresh', category: 'groceries' },
    { name: 'Pennywhistle Market', category: 'groceries' },
    { name: 'Lowtide Grocers', category: 'groceries' },
    { name: 'Harvest Lane Foods', category: 'groceries' },
    { name: 'Pasta, Pizza & Co', category: 'eating_out' },
    { name: 'Kestrel Coffee Bar', category: 'eating_out' },
    { name: 'Saltbush Noodle House', category: 'eating_out' },
    { name: 'Ember Grill', category: 'eating_out' },
    { name: 'Waverly Fuel Stop', category: 'transport' },
    { name: 'Tramline Fares', category: 'transport' },
    { name: 'Lantern Rideshare', category: 'transport' },
    { name: 'Northgate Parking', category: 'transport' },
    { name: 'Brightfield Power', category: 'bills' },
    { name: 'Clearwater Utilities', category: 'bills' },
    { name: 'Skyline Broadband', category: 'bills' },
    { name: 'Hollis Insurance', category: 'bills' },
    { name: 'Marlowe Homewares', category: 'shopping' },
    { name: 'Quillon Books', category: 'shopping' },
    { name: 'Fernhill Outfitters', category: 'shopping' },
    { name: 'Pixel Parade Tech', category: 'shopping' },
    { name: 'Larkspur Pharmacy', category: 'health' },
    { name: 'Elmgrove Physio', category: 'health' },
    { name: 'Cobalt Dental', category: 'health' },
    { name: 'Sunnyvale Optical', category: 'health' },
    { name: 'Brightwave Payroll', category: 'income' },
    { name: 'Tidepool Interest', category: 'income' },
    { name: 'Oakridge Dividends', category: 'income' },
  ]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, both tests fail because `src/lib/categories.js` does not exist yet.

- [ ] **Step 3: Create `src/lib/categories.js` with `CATEGORIES` and `SHOPS`**

Export the two arrays exactly as the test lists them. Add a one-line comment above `SHOPS` saying the order matters for matching.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, the two new tests and the two existing tests all pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/lib/categories.js tests/categories.test.js
git commit -m "feat: add category list and shop table"
```

---

### Task 2: Matching a description to a category

**Files:**
- Modify: `src/lib/categories.js` (add the function)
- Test: `tests/categories.test.js` (add tests)

**Interfaces:**
- Consumes: `CATEGORIES` and `SHOPS` from Task 1.
- Produces: `export function categoryFor(description)` — takes a description (any value) and returns one category key string from `CATEGORIES`. Returns `'other'` when no shop matches or the description is not a non-empty string.

- [ ] **Step 1: Write the failing tests**

Append to `tests/categories.test.js`:

```js
import { categoryFor } from '../src/lib/categories.js';

test('a description containing a shop name gets that shop category', () => {
  assert.equal(categoryFor('Card payment at Greenbarrow Fresh #203'), 'groceries');
});

test('matching ignores case', () => {
  assert.equal(categoryFor('KESTREL COFFEE BAR'), 'eating_out');
  assert.equal(categoryFor('greenbarrow fresh'), 'groceries');
});

test('when several shops match, the first shop in the list decides', () => {
  // Ember Grill is listed before Waverly Fuel Stop, so it wins whichever comes first in the text.
  assert.equal(categoryFor('Ember Grill then Waverly Fuel Stop'), 'eating_out');
  assert.equal(categoryFor('Waverly Fuel Stop then Ember Grill'), 'eating_out');
});

test('a description matching no shop gets other', () => {
  assert.equal(categoryFor('Mystery payment 0042'), 'other');
});

test('an empty, missing or non-string description gets other', () => {
  assert.equal(categoryFor(''), 'other');
  assert.equal(categoryFor(null), 'other');
  assert.equal(categoryFor(undefined), 'other');
  assert.equal(categoryFor(42), 'other');
});

test('a shop name with punctuation matches literally', () => {
  assert.equal(categoryFor('POS Pasta, Pizza & Co, Sydney'), 'eating_out');
});

test('every shop in the table maps to its category through categoryFor', () => {
  for (const shop of SHOPS) {
    assert.equal(categoryFor(shop.name), shop.category, shop.name);
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, the new tests fail with `categoryFor is not a function`.

- [ ] **Step 3: Implement `categoryFor(description)` in `src/lib/categories.js`**

If `description` is not a string, or is empty, return `'other'`. Otherwise lowercase it, walk `SHOPS` in order, and return the `category` of the first shop whose lowercased name is contained in the lowercased description. If none matches, return `'other'`. Use `String.prototype.includes`, not a regular expression.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, all tests in both files pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/lib/categories.js tests/categories.test.js
git commit -m "feat: match a description to its shop category"
```

---

## Self-review

- **Spec coverage:** file and categories (Task 1), 27 shops mapped (Task 1), case-insensitive contains match (Task 2), first-listed shop decides (Task 2), `other` for no match (Task 2), one function taking a description (Task 2). The brief's "28 shops" is the open question `q-shop-categories-1`; the table holds the spec's 27.
- **Types:** `CATEGORIES`, `SHOPS` and `categoryFor` are named the same in both tasks.
- **Review Focus:** each of the five lines has a test in Task 2.
