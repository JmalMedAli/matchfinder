import { describe, it, expect, afterAll } from "vitest";
import { withRollback, actAs, actAsPrivileged, closeDb } from "./helpers/db";
import { createTestUser } from "./helpers/fixtures";

/**
 * Regression suite for prevent_self_role_escalation (BEFORE UPDATE trigger
 * on profiles) — the fix for the critical self-promotion vulnerability found
 * while building the Admin Panel, later refined in Stage B to allow staff
 * (not just true admins) to change status. Role changes must always require
 * a true admin; status changes must require any staff (admin or moderator);
 * a plain user must never be able to change either field on any row,
 * including their own, and this must hold whether role/status are changed
 * alone or together in one UPDATE statement.
 */
describe("prevent_self_role_escalation", () => {
  afterAll(closeDb);

  it("a plain user cannot change their own role", async () => {
    await withRollback(async (client) => {
      const user = await createTestUser(client);
      await actAs(client, user);
      await client.query("update public.profiles set role = 'admin' where id = $1", [user]);

      await actAsPrivileged(client);
      const row = await client.query("select role from public.profiles where id = $1", [user]);
      expect(row.rows[0].role).toBe("user");
    });
  });

  it("a plain user cannot change their own status", async () => {
    await withRollback(async (client) => {
      const user = await createTestUser(client);
      await actAs(client, user);
      await client.query("update public.profiles set status = 'banned' where id = $1", [user]);

      await actAsPrivileged(client);
      const row = await client.query("select status from public.profiles where id = $1", [user]);
      expect(row.rows[0].status).toBe("active");
    });
  });

  it("a plain user cannot change role AND status together in one statement", async () => {
    await withRollback(async (client) => {
      const user = await createTestUser(client);
      await actAs(client, user);
      await client.query("update public.profiles set role = 'admin', status = 'banned' where id = $1", [user]);

      await actAsPrivileged(client);
      const row = await client.query("select role, status from public.profiles where id = $1", [user]);
      expect(row.rows[0].role).toBe("user");
      expect(row.rows[0].status).toBe("active");
    });
  });

  it("a moderator cannot change a role, even their own to admin", async () => {
    await withRollback(async (client) => {
      const moderator = await createTestUser(client, { role: "moderator" });
      await actAs(client, moderator);
      await client.query("update public.profiles set role = 'admin' where id = $1", [moderator]);

      await actAsPrivileged(client);
      const row = await client.query("select role from public.profiles where id = $1", [moderator]);
      expect(row.rows[0].role).toBe("moderator");
    });
  });

  it("a moderator CAN change another user's status (suspend/ban)", async () => {
    await withRollback(async (client) => {
      const moderator = await createTestUser(client, { role: "moderator" });
      const target = await createTestUser(client);
      await actAs(client, moderator);
      await client.query("update public.profiles set status = 'suspended' where id = $1", [target]);

      await actAsPrivileged(client);
      const row = await client.query("select status from public.profiles where id = $1", [target]);
      expect(row.rows[0].status).toBe("suspended");
    });
  });

  it("a moderator attempting role+status together: role reverts, status goes through", async () => {
    await withRollback(async (client) => {
      const moderator = await createTestUser(client, { role: "moderator" });
      const target = await createTestUser(client);
      await actAs(client, moderator);
      await client.query("update public.profiles set role = 'admin', status = 'banned' where id = $1", [target]);

      await actAsPrivileged(client);
      const row = await client.query("select role, status from public.profiles where id = $1", [target]);
      expect(row.rows[0].role).toBe("user");
      expect(row.rows[0].status).toBe("banned");
    });
  });

  it("a true admin CAN change another user's role", async () => {
    await withRollback(async (client) => {
      const admin = await createTestUser(client, { role: "admin" });
      const target = await createTestUser(client);
      await actAs(client, admin);
      await client.query("update public.profiles set role = 'moderator' where id = $1", [target]);

      await actAsPrivileged(client);
      const row = await client.query("select role from public.profiles where id = $1", [target]);
      expect(row.rows[0].role).toBe("moderator");
    });
  });

  it("a true admin can change role and status together in one statement", async () => {
    await withRollback(async (client) => {
      const admin = await createTestUser(client, { role: "admin" });
      const target = await createTestUser(client);
      await actAs(client, admin);
      await client.query("update public.profiles set role = 'moderator', status = 'suspended' where id = $1", [target]);

      await actAsPrivileged(client);
      const row = await client.query("select role, status from public.profiles where id = $1", [target]);
      expect(row.rows[0].role).toBe("moderator");
      expect(row.rows[0].status).toBe("suspended");
    });
  });
});
