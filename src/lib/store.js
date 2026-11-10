// src/lib/store.js

// The ledger table, exactly as src/server.js creates it.
export const LEDGER_SCHEMA =
  'CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY, date TEXT, description TEXT, cents INTEGER)';

// Stores statement rows of { date, description, cents } in one transaction.
// If any row fails to store, the whole import is rolled back and the error is rethrown.
// A row is a duplicate when a stored row has the same date, description and cents.
// Each row is checked after the rows before it are inserted, so repeats within one file are caught.
// Returns { added, skipped }.
export function importRows(db, rows) {
  const find = db.prepare('SELECT 1 FROM transactions WHERE date = ? AND description = ? AND cents = ? LIMIT 1');
  const insert = db.prepare('INSERT INTO transactions (date, description, cents) VALUES (?, ?, ?)');
  let added = 0;
  let skipped = 0;
  db.exec('BEGIN');
  try {
    for (const row of rows) {
      if (find.get(row.date, row.description, row.cents)) {
        skipped += 1;
        continue;
      }
      insert.run(row.date, row.description, row.cents);
      added += 1;
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return { added, skipped };
}
