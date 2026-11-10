// src/lib/statement.js

import { parseAmount } from './money.js';
import { parseDate } from './dates.js';

// Thrown when a row cannot be read without guessing.
export class StatementError extends Error {}

// A field after the amount may only be the rest of an unquoted thousands group, such as 234.50 in £1,234.50.
const THOUSANDS_CONTINUATION = /^\d{3}(\.\d+)?$/;
// Digits with commas only as thousands groups, such as 1,234.50.
const UNSIGNED_AMOUNT = /^\d+(,\d{3})*(\.\d+)?$/;

// Reads statement CSV text into rows of { date, description, cents }.
// Outflows are negative: a bracketed or minus-signed amount is an outflow.
export function parseStatement(text) {
  const body = String(text).replace(/^﻿/, '');
  const lines = body
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');
  // The first line is the header.
  return lines.slice(1).map(readRow);
}

// Reads one line. The amount is the third field plus any unquoted thousands groups after it.
// Any other field after the amount, or an unreadable amount, refuses the row.
function readRow(line) {
  const [dateText, description, amountText = '', ...rest] = splitCsvLine(line);
  if (!rest.every((field) => THOUSANDS_CONTINUATION.test(field))) {
    throw new StatementError(`unexpected field after the amount: ${line}`);
  }
  return {
    date: parseDate(dateText),
    description,
    cents: readCents([amountText, ...rest].join(',')),
  };
}

// Reads one amount as signed cents. This is the one place the sign rule lives.
// A whole-bracket form or a single leading minus is an outflow. Both at once is refused,
// and so is a minus sign anywhere else, such as after the currency sign or at the end.
function readCents(text) {
  const compact = text.replace(/\s/g, '');
  const bracketed = compact.startsWith('(') && compact.endsWith(')');
  const body = bracketed ? compact.slice(1, -1) : compact;
  const minus = body.startsWith('-');
  const unsigned = (minus ? body.slice(1) : body).replace(/^[£$€]/, '');
  if ((bracketed && minus) || !UNSIGNED_AMOUNT.test(unsigned)) {
    throw new StatementError(`unreadable amount: ${text}`);
  }
  const cents = parseAmount(unsigned.replace(/,/g, ''));
  return bracketed || minus ? -cents : cents;
}

// Splits one CSV line on commas, keeping commas inside double quotes.
// Inside quotes, two double quotes in a row stand for one double quote.
function splitCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}
