import "../common/config/load-env";

import type { AuthRole } from "@tk182/shared-types";

import { createDatabasePool } from "../common/database/database.pool";
import { runMigrations } from "../common/database/migration-runner";
import { hashPassword } from "../modules/auth/auth.crypto";

interface SeedDocument {
  category: string;
  createdByUserId: string;
  id: string;
  publishedAt: string;
  summary: string;
  title: string;
  visibility: "public" | "participant" | "secretariat";
}

interface SeedUser {
  displayName: string;
  email: string;
  id: string;
  organizationId: string;
  password: string;
  role: AuthRole;
}

const organization = {
  id: "org-tk182-demo",
  name: "TK182 Demonstration Secretariat",
  shortName: "TK182 Demo",
  countryCode: "RU"
};

const users: SeedUser[] = [
  {
    id: "user-admin",
    displayName: "Portal Administrator",
    email: "admin@tk182.local",
    password: "AdminPass123!",
    role: "ADMIN",
    organizationId: organization.id
  },
  {
    id: "user-secretariat",
    displayName: "Secretariat Lead",
    email: "secretariat@tk182.local",
    password: "SecretariatPass123!",
    role: "SECRETARIAT",
    organizationId: organization.id
  },
  {
    id: "user-participant",
    displayName: "Participant Reviewer",
    email: "participant@tk182.local",
    password: "ParticipantPass123!",
    role: "PARTICIPANT",
    organizationId: organization.id
  }
];

const documents: SeedDocument[] = [
  {
    id: "doc-public-charter",
    title: "TK182 Portal MVP Charter",
    category: "charter",
    visibility: "public",
    summary: "Public overview of the committee portal MVP scope and responsibilities.",
    publishedAt: "2026-01-15T09:00:00.000Z",
    createdByUserId: "user-admin"
  },
  {
    id: "doc-participant-draft",
    title: "Draft Standard 182-7 Working Copy",
    category: "draft-standard",
    visibility: "participant",
    summary: "Participant review draft prepared for the current committee feedback cycle.",
    publishedAt: "2026-02-10T09:00:00.000Z",
    createdByUserId: "user-participant"
  },
  {
    id: "doc-secretariat-brief",
    title: "Secretariat Review Window Briefing",
    category: "operations",
    visibility: "secretariat",
    summary: "Internal guidance for managing the current approval window and participant outreach.",
    publishedAt: "2026-02-18T09:00:00.000Z",
    createdByUserId: "user-secretariat"
  }
];

async function main(): Promise<void> {
  const pool = createDatabasePool();

  try {
    await runMigrations(pool);

    const passwordHashes = new Map<string, string>();

    for (const user of users) {
      passwordHashes.set(user.id, await hashPassword(user.password));
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
          INSERT INTO organizations (id, name, short_name, country_code, updated_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (id) DO UPDATE
          SET
            name = EXCLUDED.name,
            short_name = EXCLUDED.short_name,
            country_code = EXCLUDED.country_code,
            updated_at = NOW()
        `,
        [
          organization.id,
          organization.name,
          organization.shortName,
          organization.countryCode
        ]
      );

      for (const user of users) {
        await client.query(
          `
            INSERT INTO users (
              id,
              email,
              display_name,
              password_hash,
              role,
              organization_id,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (id) DO UPDATE
            SET
              email = EXCLUDED.email,
              display_name = EXCLUDED.display_name,
              password_hash = EXCLUDED.password_hash,
              role = EXCLUDED.role,
              organization_id = EXCLUDED.organization_id,
              updated_at = NOW()
          `,
          [
            user.id,
            user.email,
            user.displayName,
            passwordHashes.get(user.id),
            user.role,
            user.organizationId
          ]
        );
      }

      for (const document of documents) {
        await client.query(
          `
            INSERT INTO documents (
              id,
              title,
              category,
              visibility,
              summary,
              organization_id,
              created_by_user_id,
              published_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (id) DO UPDATE
            SET
              title = EXCLUDED.title,
              category = EXCLUDED.category,
              visibility = EXCLUDED.visibility,
              summary = EXCLUDED.summary,
              organization_id = EXCLUDED.organization_id,
              created_by_user_id = EXCLUDED.created_by_user_id,
              published_at = EXCLUDED.published_at,
              updated_at = NOW()
          `,
          [
            document.id,
            document.title,
            document.category,
            document.visibility,
            document.summary,
            organization.id,
            document.createdByUserId,
            document.publishedAt
          ]
        );
      }

      await client.query(`DELETE FROM sessions`);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    console.info("Seed completed successfully.");
    console.info("Admin: admin@tk182.local / AdminPass123!");
    console.info("Secretariat: secretariat@tk182.local / SecretariatPass123!");
    console.info("Participant: participant@tk182.local / ParticipantPass123!");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Seed failed.", error);
  process.exit(1);
});
