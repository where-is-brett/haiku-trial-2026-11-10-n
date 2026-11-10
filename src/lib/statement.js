// src/lib/statement.js

import { parseAmount } from './money.js';
import { parseDate } from './dates.js';

// Reads statement CSV text into rows of { date, description, cents }.
// Outflows are negative: a bracketed or minus-signed amount is an outflow.
export function parseStatement(text) {
  const body = String(text).replace(/^﻿/, '');
  const lines = body
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');
  // The first line is the header.
  return lines.slice(1).map((line) => {
    const fields = splitCsvLine(line);
    return {
      date: parseDate(fields[0]),
      description: fields[1],
      // The amount is everything after the description, so an unquoted thousands separator survives.
      cents: readCents(fields.slice(2).join(',')),
    };
  });
}

// Reads one amount field as signed cents. This is the one place the sign rule lives.
function readCents(text) {
  const trimmed = text.trim();
  const bracketed = trimmed.match(/^\((.*)\)$/);
  if (bracketed) {
    return -parseAmount(bracketed[1]);
  }
  return parseAmount(trimmed);
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
