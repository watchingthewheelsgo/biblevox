import { sql } from "drizzle-orm";
import { db } from ".";

export async function ensureDbSchema() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      name text NOT NULL,
      email text UNIQUE,
      email_verified boolean NOT NULL DEFAULT false,
      image text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      unlocked_all boolean NOT NULL DEFAULT false,
      creem_customer_id text UNIQUE
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id text PRIMARY KEY,
      expires_at timestamp NOT NULL,
      token text NOT NULL UNIQUE,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      ip_address text,
      user_agent text,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id text PRIMARY KEY,
      account_id text NOT NULL,
      provider_id text NOT NULL,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      access_token text,
      refresh_token text,
      id_token text,
      access_token_expires_at timestamp,
      refresh_token_expires_at timestamp,
      scope text,
      password text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS verifications (
      id text PRIMARY KEY,
      identifier text NOT NULL,
      value text NOT NULL,
      expires_at timestamp NOT NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS purchases (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_usd integer NOT NULL,
      product text NOT NULL,
      creem_checkout_id text UNIQUE,
      creem_customer_id text,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS chapter_unlocks (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id text NOT NULL,
      chapter text NOT NULL,
      purchase_id text REFERENCES purchases(id) ON DELETE SET NULL,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS creem_customer_id text;
  `);
  await db.execute(sql`
    ALTER TABLE purchases
    ADD COLUMN IF NOT EXISTS creem_checkout_id text;
  `);
  await db.execute(sql`
    ALTER TABLE purchases
    ADD COLUMN IF NOT EXISTS creem_customer_id text;
  `);
  await db.execute(sql`
    ALTER TABLE chapter_unlocks
    ADD COLUMN IF NOT EXISTS purchase_id text;
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS voice_presets (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      kind text NOT NULL,
      voice_description text,
      reference_audio_url text,
      reference_text text,
      language text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS voice_presets_user_name_idx
    ON voice_presets(user_id, name);
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS chapter_unlock_user_book_ch_idx
    ON chapter_unlocks(user_id, book_id, chapter);
  `);
}
