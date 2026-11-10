// src/lib/flags.js

// Reads a feature flag from the environment. The flag name 'statement-import' is read from
// FLAG_STATEMENT_IMPORT. A flag is on only when that variable is exactly 'on'; otherwise it is off.
export function flagOn(name, env = process.env) {
  return env['FLAG_' + name.toUpperCase().replaceAll('-', '_')] === 'on';
}
