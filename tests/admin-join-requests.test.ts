import { describe, it, expect, afterAll } from "vitest";
import { withRollback, actAs, actAsPrivileged, closeDb } from "./helpers/db";
import { createTestUser, createTestMatch } from "./helpers/fixtures";

/**
 * Regression suite for admin_set_join_request_status — the staff-gated
 * equivalent of accept_join_request/remove_accepted_player, needed because
 * those two are locked to the real organizer's own auth.uid() (see
 * migration-join-request-identity-fix.sql). This function must preserve the
 * same capacity/reopen guarantees while being usable by staff on matches
 * they don't organize.
 */
describe("admin_set_join_request_status", () => {
  afterAll(closeDb);

  async function createRequest(client: Parameters<typeof actAsPrivileged>[0], matchId: string, playerId: string, status = "PENDING") {
    await actAsPrivileged(client);
    const res = await client.query(
      "insert into join_requests (match_id, player_id, status) values ($1, $2, $3) returning id",
      [matchId, playerId, status],
    );
    return res.rows[0].id as string;
  }

  it("a plain user (not staff) cannot call it", async () => {
    await withRollback(async (client) => {
      const organizer = await createTestUser(client);
      const player = await createTestUser(client);
      const matchId = await createTestMatch(client, { organizerId: organizer, maxPlayers: 2 });
      const requestId = await createRequest(client, matchId, player);

      await actAs(client, player); // acting as the plain requester, not staff
      const result = await client.query("select public.admin_set_join_request_status($1, $2) as ok", [requestId, "ACCEPTED"]);
      expect(result.rows[0].ok).toBe(false);
    });
  });

  it("a moderator can accept a pending request on a match they don't organize", async () => {
    await withRollback(async (client) => {
      const organizer = await createTestUser(client);
      const moderator = await createTestUser(client, { role: "moderator" });
      const player = await createTestUser(client);
      const matchId = await createTestMatch(client, { organizerId: organizer, maxPlayers: 2 });
      const requestId = await createRequest(client, matchId, player);

      await actAs(client, moderator);
      const result = await client.query("select public.admin_set_join_request_status($1, $2) as ok", [requestId, "ACCEPTED"]);
      expect(result.rows[0].ok).toBe(true);

      await actAsPrivileged(client);
      const status = await client.query("select status from join_requests where id = $1", [requestId]);
      expect(status.rows[0].status).toBe("ACCEPTED");
    });
  });

  it("respects capacity: fills a match to FULL and refuses to overfill it", async () => {
    await withRollback(async (client) => {
      const organizer = await createTestUser(client);
      const moderator = await createTestUser(client, { role: "moderator" });
      const p1 = await createTestUser(client);
      const p2 = await createTestUser(client);
      const p3 = await createTestUser(client);
      const matchId = await createTestMatch(client, { organizerId: organizer, maxPlayers: 2 });
      const r1 = await createRequest(client, matchId, p1);
      const r2 = await createRequest(client, matchId, p2);
      const r3 = await createRequest(client, matchId, p3);

      await actAs(client, moderator);
      await client.query("select public.admin_set_join_request_status($1, 'ACCEPTED')", [r1]);
      const second = await client.query("select public.admin_set_join_request_status($1, 'ACCEPTED') as ok", [r2]);
      expect(second.rows[0].ok).toBe(true);

      await actAsPrivileged(client);
      const matchStatus = await client.query("select status from matches where id = $1", [matchId]);
      expect(matchStatus.rows[0].status).toBe("FULL");

      await actAs(client, moderator);
      const third = await client.query("select public.admin_set_join_request_status($1, 'ACCEPTED') as ok", [r3]);
      expect(third.rows[0].ok).toBe(false);
    });
  });

  it("removing an accepted player reopens a FULL match back to OPEN", async () => {
    await withRollback(async (client) => {
      const organizer = await createTestUser(client);
      const moderator = await createTestUser(client, { role: "moderator" });
      const p1 = await createTestUser(client);
      const p2 = await createTestUser(client);
      const matchId = await createTestMatch(client, { organizerId: organizer, maxPlayers: 2 });
      const r1 = await createRequest(client, matchId, p1, "ACCEPTED");
      await createRequest(client, matchId, p2, "ACCEPTED");

      await actAsPrivileged(client);
      await client.query("update matches set status = 'FULL' where id = $1", [matchId]);

      await actAs(client, moderator);
      const result = await client.query("select public.admin_set_join_request_status($1, 'REJECTED') as ok", [r1]);
      expect(result.rows[0].ok).toBe(true);

      await actAsPrivileged(client);
      const matchStatus = await client.query("select status from matches where id = $1", [matchId]);
      expect(matchStatus.rows[0].status).toBe("OPEN");
    });
  });

  it("SECURITY REGRESSION: anon cannot call it at all", async () => {
    await withRollback(async (client) => {
      await client.query("set local role anon");
      await expect(
        client.query("select public.admin_set_join_request_status('00000000-0000-0000-0000-000000000000', 'ACCEPTED')"),
      ).rejects.toThrow(/permission denied/i);
    });
  });
});
