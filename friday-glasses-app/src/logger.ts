// ── Debug logger ────────────────────────────────────────────────────────
// Writes to both console and the phone-side WebView #log element.

const MAX_LINES = 200;
const lines: string[] = [];

export function log(msg: string): void {
  const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
  const line = `[${ts}] ${msg}`;
  console.log(line);
  lines.push(line);
  if (lines.length > MAX_LINES) lines.shift();

  const el = document.getElementById('log');
  if (el) el.textContent = lines.join('\n');
}

export function setStatus(msg: string): void {
  const el = document.getElementById('status');
  if (el) el.textContent = msg;
  log(`Status: ${msg}`);
}
