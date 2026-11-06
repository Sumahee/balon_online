export async function connectionCode(db: Pick<import('@libsql/client').Client, 'execute'>, projectId: string) {
    await db.execute(`CREATE TABLE IF NOT EXISTS bo_drawing_codes (
        project_id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE
    )`);
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', year: '2-digit', month: '2-digit' }).formatToParts(new Date());
    const prefix = parts.find(p => p.type === 'year')!.value + parts.find(p => p.type === 'month')!.value;
    await db.execute({ sql: `INSERT OR IGNORE INTO bo_drawing_codes(project_id,code)
        SELECT ?, ? || printf('%03d', COALESCE(MAX(CAST(substr(code,5) AS INTEGER)),0)+1)
        FROM bo_drawing_codes WHERE substr(code,1,4)=?`, args: [projectId, prefix, prefix] });
    const result = await db.execute({ sql: 'SELECT code FROM bo_drawing_codes WHERE project_id=?', args: [projectId] });
    return String(result.rows[0].code);
}
