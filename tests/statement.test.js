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
