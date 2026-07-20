import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { actAsPrivileged } from "./db";

export interface TestUserOptions {
  role?: "user" | "moderator" | "admin";
  status?: "active" | "suspended" | "banned";
  city?: string;
}

/**
 * Creates a throwaway auth.users row (public.profiles is auto-created by the
 * handle_new_user trigger) and returns its id. Must be called on a client
 * inside withRollback() — the insert (and everything downstream) is undone
 * when that transaction rolls back. Run while NOT acting as any user
 * (actAsPrivileged), since role/status here need to bypass
 * prevent_self_role_escalation the same way a real migration/seed would.
 */
export async function createTestUser(client: PoolClient, opts: TestUserOptions = {}): Promise<string> {
  await actAsPrivileged(client);
  const id = randomUUID();
  const email = `vitest-${id}@test.invalid`;
  await client.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);

  if (opts.role || opts.status || opts.city) {
    const sets: string[] = [];
    const values: unknown[] = [];
    if (opts.role) {
      values.push(opts.role);
      sets.push(`role = $${values.length}`);
    }
    if (opts.status) {
      values.push(opts.status);
      sets.push(`status = $${values.length}`);
    }
    if (opts.city) {
      values.push(opts.city);
      sets.push(`city = $${values.length}`);
    }
    values.push(id);
    await client.query(`update public.profiles set ${sets.join(", ")} where id = $${values.length}`, values);
  }

  return id;
}

export interface TestMatchOptions {
  organizerId: string;
  maxPlayers?: number;
  status?: "OPEN" | "FULL" | "CLOSED" | "COMPLETED" | "ARCHIVED";
}

/** Creates a throwaway match. Same transaction-scoped lifetime as createTestUser. */
export async function createTestMatch(client: PoolClient, opts: TestMatchOptions): Promise<string> {
  await actAsPrivileged(client);
  const id = randomUUID();
  await client.query(
    `insert into public.matches (id, title, date, location, max_players, organizer_id, status)
     values ($1, 'Vitest test match', now() + interval '1 day', 'Test field', $2, $3, $4)`,
    [id, opts.maxPlayers ?? 10, opts.organizerId, opts.status ?? "OPEN"],
  );
  return id;
}
