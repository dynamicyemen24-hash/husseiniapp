import { getDb } from "../server/db.js";
import {
  salesInvoices,
  products,
  users,
  journalEntries,
} from "../drizzle/schema.js";

const db = await getDb();
for (const [name, table] of [
  ["sales_invoices", salesInvoices],
  ["products", products],
  ["users", users],
  ["journal_entries", journalEntries],
] as const) {
  try {
    await (db as any).select().from(table).limit(1);
    console.log("drizzle " + name + ": OK");
  } catch (e: any) {
    const cause = e?.cause ?? e;
    console.log(
      "drizzle " +
        name +
        " FAIL: " +
        String(cause?.message ?? cause).slice(0, 300)
    );
  }
}
process.exit(0);
