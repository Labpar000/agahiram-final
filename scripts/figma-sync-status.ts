#!/usr/bin/env npx tsx
/**
 * Report Figma UI Kit sync status from docs/figma-inventory.json
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Item = { status: string; figmaName: string };

type Inventory = {
  components: Item[];
  templates: Item[];
};

const root = resolve(import.meta.dirname ?? __dirname, '..');
const invPath = resolve(root, 'docs/figma-inventory.json');

function summarize(items: Item[], label: string) {
  const counts = items.reduce(
    (acc, i) => {
      acc[i.status] = (acc[i.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const done = counts.done ?? 0;
  const blocked = counts.blocked ?? 0;
  const total = items.length;
  const actionable = total - blocked;
  const pct = actionable ? Math.round((done / actionable) * 100) : 100;
  console.log(
    `\n${label}: ${done}/${actionable} done (${pct}%)${blocked ? `, ${blocked} blocked` : ''}`,
  );
  for (const [status, n] of Object.entries(counts).sort()) {
    if (status === 'done') continue;
    const names = items.filter((i) => i.status === status).map((i) => i.figmaName);
    console.log(
      `  ${status}: ${n} — ${names.slice(0, 8).join(', ')}${names.length > 8 ? '…' : ''}`,
    );
  }
}

const raw = readFileSync(invPath, 'utf8');
const inv = JSON.parse(raw) as Inventory;

console.log('Figma UI Kit sync —', invPath);
summarize(inv.components, 'Components');
summarize(inv.templates, 'Templates');

const all = [...inv.components, ...inv.templates].filter((i) => i.status !== 'blocked');
const missing = all.filter((i) => i.status !== 'done');
if (missing.length) {
  console.log(`\n⚠ ${missing.length} items not done`);
  process.exit(1);
}
console.log('\n✓ All items done');
