import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Two tenants with overlapping data, so you can verify isolation by logging in as each
async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  for (const [name, slug, email] of [
    ["Acme Agency", "acme", "admin@acme.test"],
    ["Globex Studio", "globex", "admin@globex.test"],
  ] as const) {
    const org = await prisma.organization.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });

    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name: `${name} Admin`, passwordHash, role: "ADMIN", organizationId: org.id },
    });

    const client = await prisma.client.upsert({
      where: { organizationId_email: { organizationId: org.id, email: `contact@${slug}-client.test` } },
      update: {},
      create: { name: `${name} Client`, email: `contact@${slug}-client.test`, organizationId: org.id },
    });

    const existing = await prisma.project.count({ where: { organizationId: org.id } });
    if (existing === 0) {
      await prisma.project.createMany({
        data: [
          { title: `${name} website redesign`, status: "IN_PROGRESS", clientId: client.id, organizationId: org.id },
          { title: `${name} Q4 campaign`, status: "PENDING", clientId: client.id, organizationId: org.id },
          { title: `${name} brand audit`, status: "COMPLETED", clientId: client.id, organizationId: org.id },
        ],
      });
      await prisma.workflow.create({
        data: { name: "Log new projects", trigger: "PROJECT_CREATED", action: "LOG_ACTIVITY", organizationId: org.id },
      });
    }
  }

  console.log("Seeded. Log in as admin@acme.test or admin@globex.test / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
