// tests/money-edge.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount } from '../src/lib/money.js';

// These pin what parseAmount returns today, not what a bank statement would want.

test('a blank amount is read as NaN today', () => {
  assert.equal(parseAmount(''), NaN);
});

test('a negative amount with a minus sign is read as negative cents', () => {
  assert.equal(parseAmount('-40.00'), -4000);
});

test('an amount with a thousands comma is read as cents without the comma', () => {
  assert.equal(parseAmount('1,234.50'), 123450);
});
