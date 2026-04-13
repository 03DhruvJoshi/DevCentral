// packages/database/prisma/seed.ts
import { PrismaClient } from "./prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import seedWizardCatalog from "./prisma/seed/scaffolder/seedWizardCatalog";
import {
  INITIAL_TEMPLATES,
  CATEGORIES,
} from "./prisma/seed/scaffolder/yamlgenerate";

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Missing DATABASE_URL or DIRECT_DATABASE_URL for database seed connection.",
  );
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  await seedWizardCatalog(prisma);

  await prisma.template.deleteMany();
  await prisma.category.deleteMany();

  for (const categoryData of CATEGORIES) {
    await prisma.category.create({
      data: categoryData,
    });
  }

  for (const templateData of INITIAL_TEMPLATES) {
    await prisma.template.create({
      data: templateData,
    });
  }

  // Create an initial admin user

  const adminEmail = "admin@devcentral.com";

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log("⚠️ Admin account already exists. Skipping seed.");
  } else {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("SecureAdmin123!", salt);

    await prisma.user.create({
      data: {
        name: "System Administrator",
        email: adminEmail,
        passwordHash: passwordHash,
        role: "ADMIN", // CRITICAL: Hardcoding the admin role
        githubUsername: "devcentral-admin",
      },
    });
    console.log("✅ Super Admin account created successfully.");
  }

  console.log("Seeding complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
