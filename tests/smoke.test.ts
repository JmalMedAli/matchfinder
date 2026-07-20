import { describe, it, expect, afterAll } from "vitest";
import { withRollback, actAs, closeDb } from "./helpers/db";
import { createTestUser } from "./helpers/fixtures";

describe("test scaffold smoke test", () => {
  afterAll(closeDb);

  it("creates a throwaway user and can act as them under real RLS", async () => {
    await withRollback(async (client) => {
      const userId = await createTestUser(client, { city: "Ben Arous" });

      await actAs(client, userId);
      const self = await client.query("select id, city, role from public.profiles where id = $1", [userId]);
      expect(self.rows).toHaveLength(1);
      expect(self.rows[0].city).toBe("Ben Arous");
      expect(self.rows[0].role).toBe("user");

      // a plain user must not be able to see other users' rows they don't organize with/etc.
      // (weak assertion here — full RLS behavior is covered by the real test files)
      const count = await client.query("select count(*)::int as c from public.profiles");
      expect(count.rows[0].c).toBeGreaterThan(0);
    });
  });

  it("rolls back cleanly — the throwaway user does not persist", async () => {
    let leakedId: string | null = null;
    await withRollback(async (client) => {
      leakedId = await createTestUser(client);
    });

    await withRollback(async (client) => {
      const check = await client.query("select id from public.profiles where id = $1", [leakedId]);
      expect(check.rows).toHaveLength(0);
    });
  });
});
