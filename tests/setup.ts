import { config } from "dotenv";

config({ path: ".env.test" });

if (!process.env.SUPABASE_TEST_DB_URL) {
  throw new Error(
    "SUPABASE_TEST_DB_URL is not set. Add it to .env.test (gitignored) locally, " +
      "or SUPABASE_TEST_DB_URL as a GitHub Actions secret in CI.",
  );
}
