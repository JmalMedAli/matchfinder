import { Pool, type PoolClient } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.SUPABASE_TEST_DB_URL, max: 5 });
  }
  return pool;
}

/**
 * Runs `fn` inside a transaction that is ALWAYS rolled back, whether it
 * throws or not — fixture setup (auth.users/profiles rows, blocks, matches,
 * ...) and the test's own assertions all happen in the same transaction, so
 * a single ROLLBACK undoes everything atomically. Nothing this suite does is
 * ever visible outside the transaction it ran in, and a hard crash mid-test
 * can't leave orphaned rows the way explicit afterEach cleanup could.
 */
export async function withRollback<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    try {
      return await fn(client);
    } finally {
      await client.query("rollback");
    }
  } finally {
    client.release();
  }
}

/**
 * Switches the current transaction's effective role to `authenticated` and
 * sets auth.uid() to `userId` for it — the same technique used throughout
 * this project's migration testing (SET ROLE + request.jwt.claims), which
 * actually exercises RLS, unlike the pool's own default (privileged) role.
 * Pass `null` to act as an unauthenticated (anon-equivalent) session.
 */
export async function actAs(client: PoolClient, userId: string | null): Promise<void> {
  await client.query("set local role authenticated");
  if (userId) {
    // SET does not accept bind parameters — build the literal ourselves.
    // Safe here: userId is always a UUID we generated (see fixtures.ts), but
    // escape single quotes defensively regardless of that invariant.
    const claims = JSON.stringify({ sub: userId, role: "authenticated" }).replace(/'/g, "''");
    await client.query(`set local request.jwt.claims = '${claims}'`);
  } else {
    await client.query("reset request.jwt.claims");
  }
}

/** Returns to the pool's own privileged role (bypasses RLS) — for fixture setup/teardown, never for assertions. */
export async function actAsPrivileged(client: PoolClient): Promise<void> {
  await client.query("reset role");
  await client.query("reset request.jwt.claims");
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
