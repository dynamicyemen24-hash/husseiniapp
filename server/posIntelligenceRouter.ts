import { z } from "zod";
import { eq, and, or, desc, sql, gte, lte, ilike } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, tenantProcedure } from "./_core/trpc";
import { getDb } from "./db";
import {
  products,
  customers,
  documents,
  salesInvoices,
  salesInvoiceItems,
  categories,
  units,
} from "../drizzle/schema";

function escapeIlike(s: string): string {
  return s.replace(/[%_\\]/g, "\\$&");
}
function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!
  );
}

export const posIntelligenceRouter = router({
  unifiedSearch: tenantProcedure
    .input(
      z.object({
        query: z.string().min(1).max(200),
        types: z
          .array(z.enum(["product", "service", "customer", "knowledge"]))
          .default(["product", "service"]),
        limit: z.number().min(1).max(50).default(20),
        warehouseId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId)
        return { products: [], services: [], customers: [], knowledge: [] };

      const safeQ = `%${escapeIlike(input.query)}%`;
      const results: any = {
        products: [],
        services: [],
        customers: [],
        knowledge: [],
      };

      if (input.types.includes("product") || input.types.includes("service")) {
        const productRows = await db
          .select()
          .from(products)
          .where(
            and(
              eq(products.tenantId, ctx.tenantId),
              or(
                ilike(products.name, safeQ),
                ilike(products.code, safeQ),
                ilike(products.barcode, safeQ),
                sql`${products.isActive} = true`
              ),
              input.types.includes("product")
                ? or(eq(products.type, "goods"), eq(products.type, "service"))
                : eq(products.type, "goods")
            )
          )
          .limit(input.limit);

        const serviceRows = input.types.includes("service")
          ? await db
              .select()
              .from(products)
              .where(
                and(
                  eq(products.tenantId, ctx.tenantId),
                  eq(products.type, "service"),
                  or(ilike(products.name, safeQ), ilike(products.code, safeQ))
                )
              )
              .limit(input.limit)
          : [];

        results.products = productRows.map((p: any) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          nameAr: p.nameAr,
          type: p.type,
          category: p.category,
          salePrice: parseFloat(p.salePrice || "0"),
          wholesalePrice: parseFloat(p.wholesalePrice || "0"),
          currentStock: p.currentStock || 0,
          minStock: p.minStock || 0,
          barcode: p.barcode,
          unitId: p.unitId,
          unitName: p.unitName || p.unit,
          conversionFactor: parseFloat(p.conversionFactor || "1"),
          imageUrl: p.imageUrl,
          isActive: p.isActive,
          taxRate: p.taxRate || 0,
          loyaltyPoints: p.loyaltyPoints || 0,
          trackingType: p.trackingType,
          isSerialized: p.isSerialized,
          isBatched: p.isBatched,
        }));
        results.services = serviceRows.map((p: any) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          nameAr: p.nameAr,
          type: p.type,
          category: p.category,
          salePrice: parseFloat(p.salePrice || "0"),
          currentStock: 0,
          isActive: p.isActive,
          taxRate: p.taxRate || 0,
        }));
      }

      if (input.types.includes("customer")) {
        const customerRows = await db
          .select()
          .from(customers)
          .where(
            and(
              eq(customers.tenantId, ctx.tenantId),
              or(
                ilike(customers.name, safeQ),
                ilike(customers.phone, safeQ),
                ilike(customers.email, safeQ)
              )
            )
          )
          .limit(input.limit);
        results.customers = customerRows.map((c: any) => ({
          id: c.id,
          name: c.name,
          nameAr: c.nameAr,
          phone: c.phone,
          email: c.email,
          balance: parseFloat(c.balance || "0"),
          creditLimit: parseFloat(c.creditLimit || "0"),
          loyaltyPoints: c.loyaltyPoints || 0,
          customerType: c.customerType || "regular",
          groupName: c.groupName,
        }));
      }

      if (input.types.includes("knowledge")) {
        const docRows = await db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.tenantId, ctx.tenantId),
              ilike(documents.title, safeQ)
            )
          )
          .limit(input.limit);
        results.knowledge = docRows.map((d: any) => ({
          id: d.id,
          title: d.title,
          type: d.type || "document",
          excerpt: d.notes ? d.notes.substring(0, 200) + "..." : "",
          fileUrl: d.fileUrl,
        }));
      }

      return results;
    }),

  analytics: tenantProcedure
    .input(
      z.object({
        period: z
          .enum(["today", "week", "month", "quarter", "year"])
          .default("today"),
        branchId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return {};

      const now = new Date();
      let startDate: Date;
      switch (input.period) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "quarter":
          startDate = new Date(
            now.getFullYear(),
            Math.floor(now.getMonth() / 3) * 3,
            1
          );
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      const whereClause = and(
        eq(salesInvoices.tenantId, ctx.tenantId),
        gte(salesInvoices.invoiceDate, startDate),
        lte(salesInvoices.invoiceDate, now),
        sql<boolean>`${salesInvoices.status} <> 'cancelled'`
      );

      const [totalSales] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${salesInvoices.total}), 0)`,
        })
        .from(salesInvoices)
        .where(whereClause);
      const [invoiceCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(salesInvoices)
        .where(whereClause);
      const [byMethod] = await db
        .select({
          method: salesInvoices.paymentMethod,
          total: sql<number>`COALESCE(SUM(${salesInvoices.total}), 0)`,
          count: sql<number>`count(*)::int`,
        })
        .from(salesInvoices)
        .where(whereClause)
        .groupBy(salesInvoices.paymentMethod);
      const [topProducts] = await db
        .select({
          productName: salesInvoiceItems.productName,
          quantity: sql<number>`SUM(${salesInvoiceItems.quantity})`,
          revenue: sql<number>`COALESCE(SUM(${salesInvoiceItems.total}), 0)`,
        })
        .from(salesInvoiceItems)
        .innerJoin(
          salesInvoices,
          eq(salesInvoiceItems.invoiceId, salesInvoices.id)
        )
        .where(whereClause)
        .groupBy(salesInvoiceItems.productName)
        .orderBy(sql`SUM(${salesInvoiceItems.total}) DESC`)
        .limit(10);
      const [averageTicket] = await db
        .select({ avg: sql<number>`COALESCE(AVG(${salesInvoices.total}), 0)` })
        .from(salesInvoices)
        .where(whereClause);

      return {
        period: input.period,
        startDate,
        totalSales: (totalSales?.total ?? 0) as number,
        invoiceCount: (invoiceCount?.count ?? 0) as number,
        averageTicket: (averageTicket?.avg ?? 0) as number,
        byMethod: (Array.isArray(byMethod) ? byMethod : [byMethod]).map(
          (r: any) => ({
            method: r.method,
            total: r.total as number,
            count: r.count,
          })
        ),
        topProducts: (Array.isArray(topProducts)
          ? topProducts
          : [topProducts]
        ).map((r: any) => ({
          productName: r.productName,
          quantity: r.quantity as number,
          revenue: r.revenue as number,
        })),
      };
    }),

  quickSale: tenantProcedure
    .input(
      z.object({
        customerId: z.number().optional(),
        items: z.array(
          z.object({
            productId: z.number(),
            productName: z.string(),
            quantity: z.number().min(1),
            unitPrice: z.number().min(0),
            discount: z.number().default(0),
            unitId: z.number().optional(),
          })
        ),
        paymentMethod: z.string().default("cash"),
        paidAmount: z.string().default("0"),
        notes: z.string().optional(),
        branchId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId || !ctx.user)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to complete quick sale",
        });

      const total = input.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity - item.discount,
        0
      );
      const invoiceNumber = `QS-${Date.now().toString(36).toUpperCase()}`;
      const now = new Date();

      const [invoice] = await db
        .insert(salesInvoices)
        .values({
          tenantId: ctx.tenantId,
          invoiceNumber,
          orderId: `QS-${Date.now()}`,
          customerId: input.customerId || null,
          branchId: input.branchId || null,
          status: "confirmed",
          subtotal: total,
          total,
          paidAmount: parseFloat(input.paidAmount),
          paymentMethod: input.paymentMethod,
          notes: input.notes || "",
          userId: ctx.user.id,
          salesRepId: ctx.user.id,
          currency: "YER",
          invoiceDate: now,
          postedAt: now,
          postedById: ctx.user.id,
        } as any)
        .returning();

      for (const item of input.items) {
        await db.insert(salesInvoiceItems).values({
          invoiceId: invoice.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          total: item.unitPrice * item.quantity - item.discount,
        } as any);
      }

      return { success: true, invoiceNumber, invoiceId: invoice.id, total };
    }),

  digitalReceipt: tenantProcedure
    .input(
      z.object({
        invoiceNumber: z.string(),
        format: z.enum(["pdf", "qr", "email"]).default("pdf"),
        email: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return null;

      const [invoice] = await db
        .select()
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.tenantId, ctx.tenantId),
            eq(salesInvoices.invoiceNumber, input.invoiceNumber)
          )
        )
        .limit(1);
      if (!invoice) return null;

      const items = await db
        .select()
        .from(salesInvoiceItems)
        .where(eq(salesInvoiceItems.invoiceId, invoice.id));

      const receiptHtml = `<div style="font-family:Arial;padding:20px;direction:rtl;text-align:right;"><h2>Sales Invoice</h2><p>Invoice: ${invoice.invoiceNumber}</p><p>Date: ${new Date(invoice.invoiceDate).toLocaleDateString("ar-YE")}</p><p>Total: ${invoice.total}</p><p>Payment: ${invoice.paymentMethod}</p>${items.map((i: any) => `<p>${i.productName} x ${i.quantity} = ${i.total}</p>`).join("")}</div>`;

      return {
        invoice,
        items,
        qrData: JSON.stringify({
          invoiceNumber: invoice.invoiceNumber,
          date: invoice.invoiceDate,
          total: invoice.total,
          items: items.length,
          tenantId: ctx.tenantId,
        }),
        receiptHtml,
      };
    }),

  recommendations: tenantProcedure
    .input(
      z.object({
        sessionId: z.number().optional(),
        recentProducts: z.array(z.number()).optional(),
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return [];

      const recentProductIds = input.recentProducts || [];
      const limit = input.limit;

      if (recentProductIds.length === 0) {
        const [topProducts] = await db
          .select({
            productId: salesInvoiceItems.productId,
            productName: salesInvoiceItems.productName,
            salePrice: salesInvoiceItems.unitPrice,
            revenue: sql<number>`COALESCE(SUM(${salesInvoiceItems.total}), 0)`,
          })
          .from(salesInvoiceItems)
          .innerJoin(
            salesInvoices,
            eq(salesInvoiceItems.invoiceId, salesInvoices.id)
          )
          .where(
            and(
              eq(salesInvoices.tenantId, ctx.tenantId),
              gte(
                salesInvoices.invoiceDate,
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              ),
              sql`${salesInvoices.status} <> 'cancelled'`
            )
          )
          .groupBy(
            salesInvoiceItems.productId,
            salesInvoiceItems.productName,
            salesInvoiceItems.unitPrice
          )
          .orderBy(sql`SUM(${salesInvoiceItems.total}) DESC`)
          .limit(limit);

        return (Array.isArray(topProducts) ? topProducts : [topProducts]).map(
          (r: any) => ({
            productId: r.productId,
            productName: r.productName,
            productNameAr: r.productNameAr,
            salePrice: r.salePrice as number,
            currentStock: r.currentStock || 0,
            score: (r.revenue as number) / 1000,
            reason: "Top Selling",
          })
        );
      }
      return [];
    }),

  customerLookup: tenantProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return [];

      const q = `%${input.query}%`;
      const rows = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.tenantId, ctx.tenantId),
            or(
              ilike(customers.name, q),
              ilike(customers.phone, q),
              ilike(customers.email, q)
            )
          )
        )
        .limit(input.limit);

      return rows.map((c: any) => ({
        id: c.id,
        name: c.name,
        nameAr: c.nameAr,
        phone: c.phone,
        email: c.email,
        customerCode: c.customerCode,
        balance: parseFloat(c.balance || "0"),
        creditLimit: parseFloat(c.creditLimit || "0"),
        loyaltyPoints: c.loyaltyPoints || 0,
        customerType: c.customerType || "regular",
        groupName: c.groupName,
      }));
    }),
});
