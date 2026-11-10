import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStatement, StatementError } from '../src/lib/statement.js';

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
  const [row] = parseStatement(`﻿${HEADER}31/08/2026,Corner shop,12.50`);
  assert.equal(row.date, '2026-08-31');
  assert.equal(row.cents, 1250);
});

test('a trailing comma after a bracketed amount is refused', () => {
  assert.throws(() => parseStatement(`${HEADER}01/09/2026,Rent,(850.00),`), StatementError);
});

test('a field after a bracketed amount is refused', () => {
  assert.throws(() => parseStatement(`${HEADER}01/09/2026,Rent,(850.00),1020.00`), StatementError);
});

test('an unquoted extra numeric field is refused', () => {
  assert.throws(() => parseStatement(`${HEADER}01/09/2026,Shop,45,1020.00`), StatementError);
});

test('a minus sign after the number is refused', () => {
  assert.throws(() => parseStatement(`${HEADER}01/09/2026,Coffee,3.20-`), StatementError);
});

test('a minus sign after the currency sign is refused', () => {
  assert.throws(() => parseStatement(`${HEADER}01/09/2026,Coffee,£-3.20`), StatementError);
});

test('a minus sign before the currency sign is an outflow', () => {
  const [row] = parseStatement(`${HEADER}01/09/2026,Coffee,-£3.20`);
  assert.equal(row.cents, -320);
});

test('a double negative is refused', () => {
  assert.throws(() => parseStatement(`${HEADER}01/09/2026,Rent,(-40.00)`), StatementError);
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

test('an unquoted amount with a four-digit lead group and a comma group is refused', () => {
  assert.throws(() => parseStatement(`${HEADER}01/09/2026,Shop,1020,500`), StatementError);
});

test('a one-digit day and month are read', () => {
  const [row] = parseStatement(`${HEADER}1/9/2026,Shop,1.00`);
  assert.equal(row.date, '2026-09-01');
});

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

test('a row with two fields is refused as a missing amount', () => {
  assert.throws(
    () => parseStatement(`${HEADER}01/09/2026,Rent`),
    (err) => err instanceof StatementError && /amount/.test(err.message) && /row 1/.test(err.message),
  );
});

test('a day of zero or above 31 is refused', () => {
  assert.throws(() => parseStatement(`${HEADER}00/09/2026,Rent,1.00`), StatementError);
  assert.throws(() => parseStatement(`${HEADER}32/09/2026,Rent,1.00`), StatementError);
});

test('a month of zero is refused', () => {
  assert.throws(() => parseStatement(`${HEADER}01/00/2026,Rent,1.00`), StatementError);
});

test('a day past the end of its month is refused', () => {
  assert.throws(() => parseStatement(`${HEADER}31/04/2026,Rent,1.00`), StatementError);
  assert.throws(() => parseStatement(`${HEADER}31/06/2026,Rent,1.00`), StatementError);
  assert.throws(() => parseStatement(`${HEADER}31/09/2026,Rent,1.00`), StatementError);
  assert.throws(() => parseStatement(`${HEADER}31/11/2026,Rent,1.00`), StatementError);
});

test('29 February in a non-leap year is refused', () => {
  assert.throws(() => parseStatement(`${HEADER}29/02/2026,Rent,1.00`), StatementError);
});

test('30 and 31 February are refused', () => {
  assert.throws(() => parseStatement(`${HEADER}30/02/2026,Rent,1.00`), StatementError);
  assert.throws(() => parseStatement(`${HEADER}31/02/2026,Rent,1.00`), StatementError);
});

test('the refusal for an impossible date names its row', () => {
  assert.throws(
    () => parseStatement(`${HEADER}01/09/2026,Rent,1.00\n31/02/2026,Rent,1.00`),
    (err) => err instanceof StatementError && /row 2/.test(err.message),
  );
});

test('29 February in a leap year is read', () => {
  const [row] = parseStatement(`${HEADER}29/02/2028,Rent,1.00`);
  assert.equal(row.date, '2028-02-29');
});

test('29 February in a century year divisible by 400 is read', () => {
  const [row] = parseStatement(`${HEADER}29/02/2000,Rent,1.00`);
  assert.equal(row.date, '2000-02-29');
});

test('the last day of a 31-day month is read', () => {
  const [dec] = parseStatement(`${HEADER}31/12/2026,Rent,1.00`);
  assert.equal(dec.date, '2026-12-31');
  const [jan] = parseStatement(`${HEADER}31/01/2026,Rent,1.00`);
  assert.equal(jan.date, '2026-01-31');
});

test('a two-digit year is refused without parsing it', () => {
  assert.throws(() => parseStatement(`${HEADER}01/09/26,Rent,1.00`), StatementError);
});

test('an unclosed double quote at the end of a line is refused', () => {
  assert.throws(
    () => parseStatement(`${HEADER}01/09/2026,"Tea,3.00`),
    (err) => err instanceof StatementError && /unclosed quote/.test(err.message),
  );
});

test('an amount too large to hold as cents is refused', () => {
  assert.throws(() => parseStatement(`${HEADER}01/09/2026,Rent,${'9'.repeat(400)}`), StatementError);
});

test('a BOM-prefixed Date,Description,Amount header is accepted', () => {
  const rows = parseStatement(`﻿${HEADER}01/09/2026,Rent,1.00`);
  assert.equal(rows.length, 1);
});

test('a BOM-prefixed Date,Payee,Amount header is refused', () => {
  assert.throws(() => parseStatement('﻿Date,Payee,Amount\n01/09/2026,Rent,1.00'), StatementError);
});
