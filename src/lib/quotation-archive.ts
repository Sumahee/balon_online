export const QUOTATION_SCHEMA = `CREATE TABLE IF NOT EXISTS bo_quotations (
 id TEXT PRIMARY KEY, export_key TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
 client_name TEXT NOT NULL, site_address TEXT NOT NULL, quote_date TEXT NOT NULL,
 installation_date TEXT NOT NULL, total REAL NOT NULL, vat_included INTEGER NOT NULL,
 document_json TEXT NOT NULL, created_at TEXT NOT NULL, created_by TEXT NOT NULL
)`;
