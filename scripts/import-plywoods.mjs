import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client';
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) throw new Error('Turso environment variables are required.');
const db = createClient({ url, authToken });
const source = await readFile(new URL('../src/lib/plywood-catalog.ts', import.meta.url), 'utf8');
const catalog = JSON.parse(source.split('export const plywoodCatalog: PlywoodSample[] = ')[1].trim().replace(/;$/, ''));
await db.execute(`CREATE TABLE IF NOT EXISTS bo_plywood_official (
 id TEXT PRIMARY KEY, code TEXT NOT NULL COLLATE NOCASE, name TEXT NOT NULL,
 data TEXT NOT NULL, sort_order INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
const entries = [];
for (const [index, item] of catalog.entries()) {
 const bytes = await readFile(new URL('../public' + item.image, import.meta.url));
 const mime = bytes[0] === 0x89 ? 'image/png' : 'image/jpeg';
 const saved = { ...item, image: `data:${mime};base64,${bytes.toString('base64')}` };
 entries.push({ sql: 'INSERT INTO bo_plywood_official (id, code, name, data, sort_order) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING', args: [item.id, item.code, item.name, JSON.stringify(saved), index] });
}
// Restartable import: never overwrite existing data or user image overrides.
for (let offset = 0; offset < entries.length; offset += 5) await db.batch(entries.slice(offset, offset + 5), 'write');
const result = await db.execute('SELECT id, code, name, data FROM bo_plywood_official');
for (const item of catalog) {
 const row = result.rows.find((r) => r.id === item.id);
 if (!row || row.code !== item.code || row.name !== item.name || !JSON.parse(String(row.data)).image?.startsWith('data:image/')) throw new Error(`Verification failed: ${item.id}`);
}
console.log(`Verified ${catalog.length} official plywood records with images stored in DB.`);
db.close();
