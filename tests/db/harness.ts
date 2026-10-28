import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import pg from "pg";

/*
  Builds a brand-new, throwaway database for each test file:
  Supabase stand-ins → schema.sql → every numbered migration in order (003_…, 004_…).
  This is exactly the order the owner runs them in Supabase.
  Needs DATABASE_URL pointing at a Postgres server where we may create databases
  (GitHub Actions starts one; locally, any Postgres 15+).
*/

const root = join(__dirname, "..", "..");
const supabaseDir = join(root, "supabase");

export function migrationFiles(): string[] {
  const numbered = readdirSync(supabaseDir)
    .filter((f) => /^\d{3}_.+\.sql$/.test(f))
    .sort();
  return ["schema.sql", ...numbered];
}

export const OWNER_ID = "11111111-1111-1111-1111-111111111111";
export const STRANGER_ID = "22222222-2222-2222-2222-222222222222";

export interface TestDb {
  /** Superuser connection to the throwaway database (setup and inspection). */
  admin: pg.Client;
  /** Run SQL as a given API role, exactly like Supabase does for real requests. */
  as: <T extends pg.QueryResultRow = pg.QueryResultRow>(
    who: "anon" | "owner" | "stranger" | "service_role",
    sql: string,
    params?: unknown[],
  ) => Promise<pg.QueryResult<T>>;
  drop: () => Promise<void>;
}

export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL;
}

export async function createTestDb(): Promise<TestDb> {
  const url = databaseUrl();
  if (!url) throw new Error("DATABASE_URL is not set");
  const name = `ls_test_${randomBytes(4).toString("hex")}`;

  const server = new pg.Client({ connectionString: url });
  await server.connect();
  await server.query(`create database ${name}`);
  await server.end();

  const dbUrl = new URL(url);
  dbUrl.pathname = `/${name}`;
  const admin = new pg.Client({ connectionString: dbUrl.toString() });
  await admin.connect();
  // Keep NOTICE messages out of the test output.
  admin.on("notice", () => undefined);

  await admin.query(readFileSync(join(supabaseDir, "tests", "supabase-stubs.sql"), "utf8"));
  for (const file of migrationFiles()) {
    try {
      await admin.query(readFileSync(join(supabaseDir, file), "utf8"));
    } catch (error) {
      throw new Error(`Applying ${file} failed: ${(error as Error).message}`);
    }
  }

  // The owner, a signed-in stranger (no profile), and one public brand.
  await admin.query(`insert into auth.users (id, email) values ($1, 'owner@example.com'), ($2, 'stranger@example.com')`, [OWNER_ID, STRANGER_ID]);
  await admin.query(`select bootstrap_owner('owner@example.com', 'Owner')`);

  const as: TestDb["as"] = async (who, sql, params) => {
    const role = who === "owner" || who === "stranger" ? "authenticated" : who;
    const uid = who === "owner" ? OWNER_ID : who === "stranger" ? STRANGER_ID : "";
    await admin.query("begin");
    try {
      await admin.query(`set local role ${role}`);
      await admin.query(`select set_config('request.uid', $1, true)`, [uid]);
      const result = await admin.query(sql, params);
      await admin.query("commit");
      return result;
    } catch (error) {
      await admin.query("rollback");
      throw error;
    }
  };

  return {
    admin,
    as,
    drop: async () => {
      await admin.end();
      const s = new pg.Client({ connectionString: url });
      await s.connect();
      await s.query(`drop database if exists ${name} with (force)`);
      await s.end();
    },
  };
}

/** Expect a query to be refused; returns the database's message for the assertion. */
export async function refused(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("Expected the database to refuse this, but it succeeded");
}
