import { readFile, writeFile } from "node:fs/promises";

const migrationPath = new URL("../supabase/migrations/202608270002_evidence_storage.sql", import.meta.url);
const outputPath = "/tmp/plo_evidence_storage_migration.json";
const query = await readFile(migrationPath, "utf8");

await writeFile(outputPath, JSON.stringify({ project_id: "ootfwcssrgzpliadjlau", name: "evidence_storage", query }), "utf8");
console.log(outputPath);
