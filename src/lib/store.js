// src/lib/store.js

// The ledger table, exactly as src/server.js creates it.
export const LEDGER_SCHEMA =
  'CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY, date TEXT, description TEXT, cents INTEGER)';

// Stores statement rows of { date, description, cents } in one transaction.
// If any row fails to store, the whole import is rolled back and the error is rethrown.
// Returns { added, skipped }. Skipping duplicates is not done yet, so skipped is always 0.
export function importRows(db, rows) {
  const insert = db.prepare('INSERT INTO transactions (date, description, cents) VALUES (?, ?, ?)');
  let added = 0;
  db.exec('BEGIN');
  try {
    for (const row of rows) {
      insert.run(row.date, row.description, row.cents);
      added += 1;
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return { added, skipped: 0 };
}
