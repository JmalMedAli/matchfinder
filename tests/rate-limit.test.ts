import { describe, it, expect, afterAll } from "vitest";
import { withRollback, actAs, closeDb } from "./helpers/db";
import { createTestUser } from "./helpers/fixtures";

/**
 * Regression suite for check_rate_limit — replaced an in-memory
 * implementation that reset on every serverless cold start (Stage B), then
 * had its own vulnerability found and fixed before ever shipping: the first
 * version took a caller-supplied key AND caller-supplied limit, so any
 * authenticated caller could target another user's bucket or inflate their
 * own limit by calling the RPC directly. The fixed version derives the key
 * from auth.uid() and looks the limit up from rate_limit_policies — neither
 * is ever caller-supplied.
 */
describe("check_rate_limit", () => {
  afterAll(closeDb);

  it("allows requests up to the configured policy limit, then refuses", async () => {
    await withRollback(async (client) => {
      const user = await createTestUser(client);
      await actAs(client, user);

      // 'report' scope is configured as 10/60s in rate_limit_policies
      for (let i = 0; i < 10; i++) {
        const r = await client.query("select public.check_rate_limit('report') as ok");
        expect(r.rows[0].ok).toBe(true);
      }
      const eleventh = await client.query("select public.check_rate_limit('report') as ok");
      expect(eleventh.rows[0].ok).toBe(false);
    });
  });

  it("tracks separate buckets per user for the same scope", async () => {
    await withRollback(async (client) => {
      const userA = await createTestUser(client);
      const userB = await createTestUser(client);

      await actAs(client, userA);
      for (let i = 0; i < 5; i++) {
        await client.query("select public.check_rate_limit('join-request')"); // 5/60s
      }
      const aExhausted = await client.query("select public.check_rate_limit('join-request') as ok");
      expect(aExhausted.rows[0].ok).toBe(false);

      await actAs(client, userB);
      const bFresh = await client.query("select public.check_rate_limit('join-request') as ok");
      expect(bFresh.rows[0].ok).toBe(true);
    });
  });

  it("fails closed for an unknown scope rather than allowing unlimited requests", async () => {
    await withRollback(async (client) => {
      const user = await createTestUser(client);
      await actAs(client, user);
      const r = await client.query("select public.check_rate_limit('not-a-real-scope') as ok");
      expect(r.rows[0].ok).toBe(false);
    });
  });

  it("fails closed for an unauthenticated caller", async () => {
    await withRollback(async (client) => {
      await client.query("set local role authenticated");
      await client.query("reset request.jwt.claims"); // no auth.uid()
      const r = await client.query("select public.check_rate_limit('report') as ok");
      expect(r.rows[0].ok).toBe(false);
    });
  });

  it("SECURITY REGRESSION: anon cannot call check_rate_limit at all", async () => {
    await withRollback(async (client) => {
      await client.query("set local role anon");
      await expect(client.query("select public.check_rate_limit('report')")).rejects.toThrow(/permission denied/i);
    });
  });

  it("SECURITY REGRESSION: the function signature takes only a scope — no caller-controllable key or limit exists", async () => {
    await withRollback(async (client) => {
      const proc = await client.query(
        `select pg_get_function_identity_arguments(oid) as args
         from pg_proc where proname = 'check_rate_limit'`,
      );
      expect(proc.rows[0].args).toBe("p_scope text");
    });
  });
});
