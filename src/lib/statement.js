// src/lib/statement.js

import { parseAmount } from './money.js';
import { parseDate } from './dates.js';

// Thrown when a row cannot be read without guessing. The message is plain text for the director.
export class StatementError extends Error {
  name = 'StatementError';
}

// The header every statement must start with, in this order.
const HEADER = ['Date', 'Description', 'Amount'];
// A day and month of one or two digits, and a four-digit year.
const DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
// A field after the amount may only be the rest of an unquoted thousands group, such as 234.50 in £1,234.50.
const THOUSANDS_CONTINUATION = /^\d{3}(\.\d+)?$/;
// Digits with commas only as thousands groups, such as 1,234.50.
const UNSIGNED_AMOUNT = /^(\d+|\d{1,3}(,\d{3})+)(\.\d+)?$/;

// Reads statement CSV text into rows of { date, description, cents }.
// Outflows are negative: a bracketed or minus-signed amount is an outflow.
export function parseStatement(text) {
  const body = String(text).replace(/^﻿/, '');
  const lines = body
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');
  if (lines.length === 0) {
    throw new StatementError('the file is empty; the first line must be the header Date, Description, Amount');
  }
  const header = splitCsvLine(lines[0]);
  if (header.length !== HEADER.length || header.some((field, i) => field !== HEADER[i])) {
    throw new StatementError('the first line must be the header Date, Description, Amount');
  }
  return lines.slice(1).map((line, index) => readRow(line, index + 1));
}

// Reads one line. The amount is the third field plus any unquoted thousands groups after it.
// Any other field after the amount, or an unreadable amount, refuses the row.
function readRow(line, rowNumber) {
  const fields = splitCsvLine(line);
  if (fields.length < 3) {
    throw new StatementError(`row ${rowNumber} has no amount: ${line}`);
  }
  const [dateText, description, amountText, ...rest] = fields;
  if (!rest.every((field) => THOUSANDS_CONTINUATION.test(field))) {
    throw new StatementError(`row ${rowNumber} has an unexpected field after the amount: ${line}`);
  }
  return {
    date: readDate(dateText, rowNumber),
    description,
    cents: readCents([amountText, ...rest].join(','), rowNumber),
  };
}

// Reads a date only when it is DD/MM/YYYY with a real day and month. Anything else is refused
// before parseDate sees it.
function readDate(text, rowNumber) {
  const match = DATE.exec(text);
  const day = Number(match?.[1]);
  const month = Number(match?.[2]);
  if (!match || day < 1 || day > 31 || month < 1 || month > 12) {
    throw new StatementError(`row ${rowNumber} has a date that is not DD/MM/YYYY: ${text}`);
  }
  if (day > daysInMonth(month, Number(match[3]))) {
    throw new StatementError(`row ${rowNumber} has a date that does not exist in the calendar: ${text}`);
  }
  return parseDate(text);
}

// The number of days in a month of a year, with February of a leap year at 29 days.
function daysInMonth(month, year) {
  if (month === 2) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

// Reads one amount as signed cents. This is the one place the sign rule lives.
// A whole-bracket form or a single leading minus is an outflow. Both at once is refused,
// and so is a minus sign anywhere else, such as after the currency sign or at the end.
function readCents(text, rowNumber) {
  const compact = text.replace(/\s/g, '');
  const bracketed = compact.startsWith('(') && compact.endsWith(')');
  const body = bracketed ? compact.slice(1, -1) : compact;
  const minus = body.startsWith('-');
  const unsigned = (minus ? body.slice(1) : body).replace(/^[£$€]/, '');
  if ((bracketed && minus) || !UNSIGNED_AMOUNT.test(unsigned)) {
    throw new StatementError(`row ${rowNumber} has an unreadable amount: ${text}`);
  }
  const cents = parseAmount(unsigned.replace(/,/g, ''));
  if (!Number.isFinite(cents)) {
    throw new StatementError(`row ${rowNumber} has an amount too large to read: ${text}`);
  }
  return bracketed || minus ? -cents : cents;
}

// Splits one CSV line on commas, keeping commas inside double quotes.
// Inside quotes, two double quotes in a row stand for one double quote.
// A quote still open at the end of the line refuses the line.
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
  if (inQuotes) {
    throw new StatementError(`unclosed quote at the end of a line: ${line}`);
  }
  fields.push(current.trim());
  return fields;
}
