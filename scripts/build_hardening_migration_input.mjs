import { readFile, writeFile } from "node:fs/promises";

const migrationPath = new URL("../supabase/migrations/202608270003_harden_trigger_function.sql", import.meta.url);
const query = await readFile(migrationPath, "utf8");
await writeFile("/tmp/plo_hardening_migration.json", JSON.stringify({ project_id: "ootfwcssrgzpliadjlau", name: "harden_trigger_function", query }), "utf8");
console.log("/tmp/plo_hardening_migration.json");
