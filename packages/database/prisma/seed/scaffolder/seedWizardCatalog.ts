import type { PrismaClient } from "../../generated/client";
import {
  WIZARD_CATALOG_CATEGORIES,
  WIZARD_FRAMEWORKS,
  WIZARD_OPTIONS,
  FRAMEWORK_OPTION_MAP,
} from "./yamlgenerate";

type WizardSeederDelegates = {
  wizardCatalogCategory?: {
    upsert(args: unknown): Promise<unknown>;
  };
  wizardFramework?: {
    upsert(args: unknown): Promise<unknown>;
  };
  wizardOption?: {
    upsert(args: unknown): Promise<unknown>;
  };
  wizardFrameworkOption?: {
    deleteMany(args?: unknown): Promise<unknown>;
    createMany(args: unknown): Promise<unknown>;
  };
};

export default async function seedWizardCatalog(prisma: PrismaClient) {
  const db = prisma as unknown as PrismaClient & WizardSeederDelegates;

  if (
    !db.wizardCatalogCategory ||
    !db.wizardFramework ||
    !db.wizardOption ||
    !db.wizardFrameworkOption
  ) {
    console.warn(
      "⚠️ Wizard catalog models are not available in the generated Prisma client. Run `pnpm prisma generate` and ensure migrations are applied before reseeding wizard catalog.",
    );
    return;
  }

  for (const category of WIZARD_CATALOG_CATEGORIES) {
    await db.wizardCatalogCategory.upsert({
      where: { id: category.id },
      update: {
        label: category.label,
        description: category.description,
        icon: category.icon,
        accentClass: category.accentClass,
        displayOrder: category.displayOrder,
        isActive: true,
      },
      create: {
        id: category.id,
        label: category.label,
        description: category.description,
        icon: category.icon,
        accentClass: category.accentClass,
        displayOrder: category.displayOrder,
        isActive: true,
      },
    });
  }

  for (const framework of WIZARD_FRAMEWORKS) {
    await db.wizardFramework.upsert({
      where: { id: framework.id },
      update: {
        categoryId: framework.categoryId,
        label: framework.label,
        description: framework.description,
        badge: framework.badge,

        tags: framework.tags,
        displayOrder: framework.displayOrder,
        isActive: true,
      },
      create: {
        id: framework.id,
        categoryId: framework.categoryId,
        label: framework.label,
        description: framework.description,
        badge: framework.badge,
        tags: framework.tags,
        displayOrder: framework.displayOrder,
        isActive: true,
      },
    });
  }

  for (const option of WIZARD_OPTIONS) {
    await db.wizardOption.upsert({
      where: { id: option.id },
      update: {
        label: option.label,
        description: option.description,
        tier: option.tier,
        displayOrder: option.displayOrder,
        isActive: true,
      },
      create: {
        id: option.id,
        label: option.label,
        description: option.description,
        tier: option.tier,
        displayOrder: option.displayOrder,
        isActive: true,
      },
    });
  }

  await db.wizardFrameworkOption.deleteMany();

  const mappingRows: Array<{
    frameworkId: string;
    optionId: string;
    defaultEnabled: boolean;
    displayOrder: number;
  }> = [];

  for (const [frameworkId, optionIds] of Object.entries(FRAMEWORK_OPTION_MAP)) {
    optionIds.forEach((optionId, index) => {
      mappingRows.push({
        frameworkId,
        optionId,
        defaultEnabled: false,
        displayOrder: index + 1,
      });
    });
  }

  await db.wizardFrameworkOption.createMany({
    data: mappingRows,
  });

  console.log("✅ Wizard catalog seeded successfully.");
}
