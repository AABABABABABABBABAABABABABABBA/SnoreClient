// Minimal D1 compatible shim backed by node:sqlite, for tests only.
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

export function createD1(schemaFile) {
    const db = new DatabaseSync(":memory:");
    db.exec(readFileSync(schemaFile, "utf8"));

    const stmt = (sql, args = []) => ({
        bind: (...a) => stmt(sql, a),
        first: async () => db.prepare(sql).get(...args) ?? null,
        all: async () => ({ results: db.prepare(sql).all(...args) }),
        run: async () => {
            const r = db.prepare(sql).run(...args);
            return { meta: { changes: Number(r.changes) } };
        },
    });

    return {
        prepare: sql => stmt(sql),
        batch: async stmts => {
            db.exec("BEGIN");
            try {
                const out = [];
                for (const s of stmts) out.push(await s.run());
                db.exec("COMMIT");
                return out;
            } catch (e) {
                db.exec("ROLLBACK");
                throw e;
            }
        },
    };
}
