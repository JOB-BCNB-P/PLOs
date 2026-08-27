import { readFile, writeFile } from "node:fs/promises";

const migrationPath = new URL("../supabase/migrations/202608270001_initial_plo_schema.sql", import.meta.url);
const outputPath = "/tmp/plo_initial_schema_migration.json";
const query = await readFile(migrationPath, "utf8");

await writeFile(
  outputPath,
  JSON.stringify({
    project_id: "ootfwcssrgzpliadjlau",
    name: "initial_plo_schema",
    query,
  }),
  "utf8",
);

console.log(outputPath);
