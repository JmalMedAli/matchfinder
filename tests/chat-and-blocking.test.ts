import { describe, it, expect, afterAll } from "vitest";
import { withRollback, actAs, actAsPrivileged, closeDb } from "./helpers/db";
import { createTestUser, createTestMatch } from "./helpers/fixtures";

/**
 * Regression guard for the CRITICAL pre-existing bug found while building
 * block/mute (Stage C): conversation_participants' own SELECT policy
 * self-references the table, and conversations'/messages' policies also
 * reference conversation_participants — nesting a table's self-referential
 * RLS inside another table's RLS is a genuine Postgres infinite-recursion
 * trap. A bare `select * from conversation_participants` recursed under a
 * real authenticated session before the fix (is_conversation_participant()).
 * messages had zero rows in production at the time — as far as could be
 * determined, chat had never successfully sent a message under real RLS.
 */
describe("chat RLS: no infinite recursion (regression guard)", () => {
  afterAll(closeDb);

  it("a plain SELECT on conversation_participants does not recurse", async () => {
    await withRollback(async (client) => {
      const user = await createTestUser(client);
      await actAs(client, user);
      await expect(client.query("select * from public.conversation_participants limit 1")).resolves.toBeDefined();
    });
  });

  it("a plain SELECT on conversations does not recurse", async () => {
    await withRollback(async (client) => {
      const user = await createTestUser(client);
      await actAs(client, user);
      await expect(client.query("select * from public.conversations limit 1")).resolves.toBeDefined();
    });
  });

  it("a plain SELECT on messages does not recurse", async () => {
    await withRollback(async (client) => {
      const user = await createTestUser(client);
      await actAs(client, user);
      await expect(client.query("select * from public.messages limit 1")).resolves.toBeDefined();
    });
  });

  it("end to end: a real user can create a DM and send a message into it", async () => {
    await withRollback(async (client) => {
      const userA = await createTestUser(client);
      const userB = await createTestUser(client);

      await actAs(client, userA);
      const dm = await client.query("select public.get_or_create_dm($1, $2) as id", [userA, userB]);
      const conversationId = dm.rows[0].id;
      expect(conversationId).toBeTruthy();

      const msg = await client.query(
        "insert into public.messages (conversation_id, sender_id, content) values ($1, $2, 'hello') returning id",
        [conversationId, userA],
      );
      expect(msg.rows).toHaveLength(1);

      const seen = await client.query("select content from public.messages where conversation_id = $1", [conversationId]);
      expect(seen.rows[0].content).toBe("hello");
    });
  });
});

describe("get_or_create_dm: identity + block checks", () => {
  afterAll(closeDb);

  it("SECURITY REGRESSION: a caller cannot spoof creator to insert themselves into a DM with an unwilling victim", async () => {
    await withRollback(async (client) => {
      const victim = await createTestUser(client);
      const attacker = await createTestUser(client);

      await actAs(client, attacker);
      await expect(
        client.query("select public.get_or_create_dm($1, $2)", [victim, attacker]),
      ).rejects.toThrow(/not authorized/i);
    });
  });

  it("refuses to create a DM between a blocked pair", async () => {
    await withRollback(async (client) => {
      const userA = await createTestUser(client);
      const userB = await createTestUser(client);

      await actAs(client, userA);
      await client.query("insert into public.blocked_users (blocker_id, blocked_id) values ($1, $2)", [userA, userB]);

      await actAs(client, userB);
      await expect(client.query("select public.get_or_create_dm($1, $2)", [userB, userA])).rejects.toThrow(/blocked/i);
    });
  });

  it("is idempotent — calling it twice for the same pair returns the same conversation", async () => {
    await withRollback(async (client) => {
      const userA = await createTestUser(client);
      const userB = await createTestUser(client);

      await actAs(client, userA);
      const first = await client.query("select public.get_or_create_dm($1, $2) as id", [userA, userB]);
      const second = await client.query("select public.get_or_create_dm($1, $2) as id", [userA, userB]);
      expect(second.rows[0].id).toBe(first.rows[0].id);
    });
  });
});

describe("blocking enforcement on messages and join_requests", () => {
  afterAll(closeDb);

  it("refuses a message into an existing DM once either party has blocked the other", async () => {
    await withRollback(async (client) => {
      const userA = await createTestUser(client);
      const userB = await createTestUser(client);

      await actAs(client, userA);
      const dm = await client.query("select public.get_or_create_dm($1, $2) as id", [userA, userB]);
      const conversationId = dm.rows[0].id;

      await client.query("insert into public.blocked_users (blocker_id, blocked_id) values ($1, $2)", [userA, userB]);

      await actAs(client, userB);
      await expect(
        client.query(
          "insert into public.messages (conversation_id, sender_id, content) values ($1, $2, 'should fail')",
          [conversationId, userB],
        ),
      ).rejects.toThrow(/row-level security/i);
    });
  });

  it("refuses a join request between a blocked organizer/player pair", async () => {
    await withRollback(async (client) => {
      const organizer = await createTestUser(client);
      const player = await createTestUser(client);
      const matchId = await createTestMatch(client, { organizerId: organizer });

      await actAs(client, player);
      await client.query("insert into public.blocked_users (blocker_id, blocked_id) values ($1, $2)", [player, organizer]);

      await expect(
        client.query("insert into public.join_requests (match_id, player_id) values ($1, $2)", [matchId, player]),
      ).rejects.toThrow(/row-level security/i);
    });
  });

  it("a join request succeeds normally once unblocked", async () => {
    await withRollback(async (client) => {
      const organizer = await createTestUser(client);
      const player = await createTestUser(client);
      const matchId = await createTestMatch(client, { organizerId: organizer });

      await actAs(client, player);
      const res = await client.query(
        "insert into public.join_requests (match_id, player_id) values ($1, $2) returning id",
        [matchId, player],
      );
      expect(res.rows).toHaveLength(1);
    });
  });
});

describe("blocked_users: RLS scoping", () => {
  afterAll(closeDb);

  it("a user can only see blocks they created, not blocks against them", async () => {
    await withRollback(async (client) => {
      const userA = await createTestUser(client);
      const userB = await createTestUser(client);

      await actAsPrivileged(client);
      await client.query("insert into public.blocked_users (blocker_id, blocked_id) values ($1, $2)", [userB, userA]);

      await actAs(client, userA);
      const visible = await client.query("select * from public.blocked_users where blocked_id = $1", [userA]);
      expect(visible.rows).toHaveLength(0); // can't see that userB blocked them
    });
  });

  it("a user can create and then delete their own block", async () => {
    await withRollback(async (client) => {
      const userA = await createTestUser(client);
      const userB = await createTestUser(client);

      await actAs(client, userA);
      await client.query("insert into public.blocked_users (blocker_id, blocked_id) values ($1, $2)", [userA, userB]);
      const before = await client.query("select * from public.blocked_users where blocker_id = $1", [userA]);
      expect(before.rows).toHaveLength(1);

      await client.query("delete from public.blocked_users where blocker_id = $1 and blocked_id = $2", [userA, userB]);
      const after = await client.query("select * from public.blocked_users where blocker_id = $1", [userA]);
      expect(after.rows).toHaveLength(0);
    });
  });

  it("a user cannot create a block on someone else's behalf", async () => {
    await withRollback(async (client) => {
      const userA = await createTestUser(client);
      const userB = await createTestUser(client);
      const attacker = await createTestUser(client);

      await actAs(client, attacker);
      await expect(
        client.query("insert into public.blocked_users (blocker_id, blocked_id) values ($1, $2)", [userA, userB]),
      ).rejects.toThrow(/row-level security/i);
    });
  });
});
