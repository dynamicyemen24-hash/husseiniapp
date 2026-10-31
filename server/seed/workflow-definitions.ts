import { getDb } from "../db";
import { workflowDefinitions, tenants } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
// import {
//   invoiceApprovalDefinition,
//   voucherApprovalDefinition,
//   requisitionApprovalDefinition,
//   procurementApprovalDefinition,
// } from "@alhusseiniya/workflow-engine/machines";

export async function seedWorkflowDefinitions(
  tenantId?: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const targetTenants = tenantId
    ? [{ id: tenantId }]
    : await db.select({ id: tenants.id }).from(tenants);

  // TODO: Re-enable when @alhusseiniya/workflow-engine package is built
  // for (const tenant of targetTenants) {
  //   console.log(`Seeding workflow definitions for tenant ${tenant.id}...`);
  //
  //   const definitions = [
  //     { ...invoiceApprovalDefinition, tenantId: tenant.id },
  //     { ...voucherApprovalDefinition, tenantId: tenant.id },
  //     { ...requisitionApprovalDefinition, tenantId: tenant.id },
  //     { ...procurementApprovalDefinition, tenantId: tenant.id },
  //   ];
  //
  //   for (const def of definitions) {
  //     const existing = await db
  //       .select()
  //       .from(workflowDefinitions)
  //       .where(and(eq(workflowDefinitions.code, def.code), eq(workflowDefinitions.tenantId, tenant.id)))
  //       .limit(1);
  //
  //     if (existing.length === 0) {
  //       await db.insert(workflowDefinitions).values({
  //         tenantId: tenant.id,
  //         code: def.code,
  //         name: def.name,
  //         nameAr: def.nameAr,
  //         description: def.description,
  //         entityType: def.entityType,
  //         version: def.version,
  //         steps: def.steps as any,
  //         settings: def.settings as any,
  //         isActive: def.isActive,
  //         createdAt: new Date(),
  //         updatedAt: new Date(),
  //         createdById: null,
  //         updatedById: null,
  //       } as any);
  //       console.log(`  Created workflow definition: ${def.code}`);
  //     } else {
  //       console.log(`  Workflow definition already exists: ${def.code}`);
  //     }
  //   }
  // }

  console.log(
    "Workflow definitions seeding skipped (workflow-engine not built)."
  );
}

if (require.main === module) {
  const tenantId = process.argv[2] ? parseInt(process.argv[2]) : undefined;
  seedWorkflowDefinitions(tenantId)
    .then(() => process.exit(0))
    .catch(e => {
      console.error("Seeding failed:", e);
      process.exit(1);
    });
}
