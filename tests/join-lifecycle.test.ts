import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { withRollback, actAs, actAsPrivileged, closeDb } from "./helpers/db";
import { createTestUser, createTestMatch } from "./helpers/fixtures";

describe("join_requests: RLS on create/withdraw", () => {
  afterAll(closeDb);

  it("a player can create their own join request", async () => {
    await withRollback(async (client) => {
      const organizer = await createTestUser(client);
      const player = await createTestUser(client);
      const matchId = await createTestMatch(client, { organizerId: organizer });

      await actAs(client, player);
      const res = await client.query(
        "insert into join_requests (match_id, player_id) values ($1, $2) returning id, status",
        [matchId, player],
      );
      expect(res.rows[0].status).toBe("PENDING");
    });
  });

  it("a player cannot create a join request on behalf of someone else", async () => {
    await withRollback(async (client) => {
      const organizer = await createTestUser(client);
      const player = await createTestUser(client);
      const impostor = await createTestUser(client);
      const matchId = await createTestMatch(client, { organizerId: organizer });

      await actAs(client, impostor);
      await expect(
        client.query("insert into join_requests (match_id, player_id) values ($1, $2)", [matchId, player]),
      ).rejects.toThrow(/row-level security/i);
    });
  });

  it("a player can withdraw (delete) their own pending request but not someone else's", async () => {
    await withRollback(async (client) => {
      const organizer = await createTestUser(client);
      const playerA = await createTestUser(client);
      const playerB = await createTestUser(client);
      const matchId = await createTestMatch(client, { organizerId: organizer });

      await actAsPrivileged(client);
      const jrA = await client.query(
        "insert into join_requests (match_id, player_id) values ($1, $2) returning id",
        [matchId, playerA],
      );

      await actAs(client, playerB);
      const deletedByOther = await client.query("delete from join_requests where id = $1", [jrA.rows[0].id]);
      expect(deletedByOther.rowCount).toBe(0); // RLS silently filters, not an error

      await actAs(client, playerA);
      const deletedByOwner = await client.query("delete from join_requests where id = $1", [jrA.rows[0].id]);
      expect(deletedByOwner.rowCount).toBe(1);
    });
  });
});

describe("accept_join_request: capacity atomicity and identity checks", () => {
  afterAll(closeDb);

  it("the real organizer can accept a pending request under capacity", async () => {
    await withRollback(async (client) => {
      const organizer = await createTestUser(client);
      const player = await createTestUser(client);
      const matchId = await createTestMatch(client, { organizerId: organizer, maxPlayers: 2 });

      await actAsPrivileged(client);
      const jr = await client.query(
        "insert into join_requests (match_id, player_id, status) values ($1, $2, 'PENDING') returning id",
        [matchId, player],
      );

      await actAs(client, organizer);
      const result = await client.query("select public.accept_join_request($1, $2) as ok", [jr.rows[0].id, organizer]);
      expect(result.rows[0].ok).toBe(true);

      await actAsPrivileged(client);
      const status = await client.query("select status from join_requests where id = $1", [jr.rows[0].id]);
      expect(status.rows[0].status).toBe("ACCEPTED");
    });
  });

  it("marks the match FULL once capacity is reached, and further accepts fail", async () => {
    await withRollback(async (client) => {
      const organizer = await createTestUser(client);
      const p1 = await createTestUser(client);
      const p2 = await createTestUser(client);
      const p3 = await createTestUser(client);
      const matchId = await createTestMatch(client, { organizerId: organizer, maxPlayers: 2 });

      await actAsPrivileged(client);
      const jr1 = await client.query(
        "insert into join_requests (match_id, player_id, status) values ($1, $2, 'PENDING') returning id",
        [matchId, p1],
      );
      const jr2 = await client.query(
        "insert into join_requests (match_id, player_id, status) values ($1, $2, 'PENDING') returning id",
        [matchId, p2],
      );
      const jr3 = await client.query(
        "insert into join_requests (match_id, player_id, status) values ($1, $2, 'PENDING') returning id",
        [matchId, p3],
      );

      await actAs(client, organizer);
      await client.query("select public.accept_join_request($1, $2)", [jr1.rows[0].id, organizer]);
      const second = await client.query("select public.accept_join_request($1, $2) as ok", [jr2.rows[0].id, organizer]);
      expect(second.rows[0].ok).toBe(true);

      await actAsPrivileged(client);
      const matchStatus = await client.query("select status from matches where id = $1", [matchId]);
      expect(matchStatus.rows[0].status).toBe("FULL");

      await actAs(client, organizer);
      const third = await client.query("select public.accept_join_request($1, $2) as ok", [jr3.rows[0].id, organizer]);
      expect(third.rows[0].ok).toBe(false);

      await actAsPrivileged(client);
      const jr3Status = await client.query("select status from join_requests where id = $1", [jr3.rows[0].id]);
      expect(jr3Status.rows[0].status).toBe("PENDING");
    });
  });

  it("SECURITY REGRESSION: an anonymous caller cannot accept a request by guessing the real organizer id", async () => {
    await withRollback(async (client) => {
      const organizer = await createTestUser(client);
      const player = await createTestUser(client);
      const matchId = await createTestMatch(client, { organizerId: organizer, maxPlayers: 2 });

      await actAsPrivileged(client);
      const jr = await client.query(
        "insert into join_requests (match_id, player_id, status) values ($1, $2, 'PENDING') returning id",
        [matchId, player],
      );

      await client.query("set local role anon");
      await expect(
        client.query("select public.accept_join_request($1, $2)", [jr.rows[0].id, organizer]),
      ).rejects.toThrow(/permission denied/i);
    });
  });

  it("SECURITY REGRESSION: an authenticated caller who is NOT the organizer cannot accept the request", async () => {
    await withRollback(async (client) => {
      const organizer = await createTestUser(client);
      const player = await createTestUser(client);
      const attacker = await createTestUser(client);
      const matchId = await createTestMatch(client, { organizerId: organizer, maxPlayers: 2 });

      await actAsPrivileged(client);
      const jr = await client.query(
        "insert into join_requests (match_id, player_id, status) values ($1, $2, 'PENDING') returning id",
        [matchId, player],
      );

      // attacker passes the REAL organizer id as p_organizer_id, but is not
      // authenticated as that organizer — must fail, not succeed by spoofing.
      await actAs(client, attacker);
      const result = await client.query("select public.accept_join_request($1, $2) as ok", [jr.rows[0].id, organizer]);
      expect(result.rows[0].ok).toBe(false);

      await actAsPrivileged(client);
      const status = await client.query("select status from join_requests where id = $1", [jr.rows[0].id]);
      expect(status.rows[0].status).toBe("PENDING");
    });
  });

  it("an unknown join_request_id returns false rather than throwing", async () => {
    await withRollback(async (client) => {
      const organizer = await createTestUser(client);
      await actAs(client, organizer);
      const result = await client.query("select public.accept_join_request($1, $2) as ok", [randomUUID(), organizer]);
      expect(result.rows[0].ok).toBe(false);
    });
  });
});

describe("remove_accepted_player: identity check and capacity reopen", () => {
  afterAll(closeDb);

  it("the real organizer can remove an accepted player, reopening a FULL match", async () => {
    await withRollback(async (client) => {
      const organizer = await createTestUser(client);
      const p1 = await createTestUser(client);
      const p2 = await createTestUser(client);
      const matchId = await createTestMatch(client, { organizerId: organizer, maxPlayers: 2 });

      await actAsPrivileged(client);
      const jr1 = await client.query(
        "insert into join_requests (match_id, player_id, status) values ($1, $2, 'ACCEPTED') returning id",
        [matchId, p1],
      );
      await client.query(
        "insert into join_requests (match_id, player_id, status) values ($1, $2, 'ACCEPTED')",
        [matchId, p2],
      );
      await client.query("update matches set status = 'FULL' where id = $1", [matchId]);

      await actAs(client, organizer);
      const result = await client.query("select public.remove_accepted_player($1, $2) as ok", [jr1.rows[0].id, organizer]);
      expect(result.rows[0].ok).toBe(true);

      await actAsPrivileged(client);
      const matchStatus = await client.query("select status from matches where id = $1", [matchId]);
      expect(matchStatus.rows[0].status).toBe("OPEN");
      const jrStatus = await client.query("select status from join_requests where id = $1", [jr1.rows[0].id]);
      expect(jrStatus.rows[0].status).toBe("REJECTED");
    });
  });

  it("SECURITY REGRESSION: a non-organizer cannot remove an accepted player by spoofing organizer_id", async () => {
    await withRollback(async (client) => {
      const organizer = await createTestUser(client);
      const player = await createTestUser(client);
      const attacker = await createTestUser(client);
      const matchId = await createTestMatch(client, { organizerId: organizer, maxPlayers: 2 });

      await actAsPrivileged(client);
      const jr = await client.query(
        "insert into join_requests (match_id, player_id, status) values ($1, $2, 'ACCEPTED') returning id",
        [matchId, player],
      );

      await actAs(client, attacker);
      const result = await client.query("select public.remove_accepted_player($1, $2) as ok", [jr.rows[0].id, organizer]);
      expect(result.rows[0].ok).toBe(false);

      await actAsPrivileged(client);
      const status = await client.query("select status from join_requests where id = $1", [jr.rows[0].id]);
      expect(status.rows[0].status).toBe("ACCEPTED");
    });
  });
});
