import { getDb } from "./db";
import { notifications } from "../drizzle/schema";

export type CreateNotificationInput = {
  tenantId: number | null;
  userId?: number | null;
  title: string;
  body: string;
  link?: string | null;
  type: string;
};

/**
 * Inserts an in-app notification row. `userId` null = broadcast to every
 * user in the tenant. Reuses the existing `notifications` table, mapping the
 * helper's `title`/`link` onto `subject`/`metadata.link`.
 */
export async function createNotification(
  db: any,
  input: CreateNotificationInput
): Promise<void> {
  if (!db) {
    console.warn(
      "[notifications] createNotification skipped: no db available",
      {
        tenantId: input.tenantId,
        type: input.type,
      }
    );
    return;
  }
  await db.insert(notifications).values({
    tenantId: input.tenantId,
    userId: input.userId ?? null,
    type: input.type,
    channel: "inapp",
    subject: input.title,
    body: input.body,
    status: "unread",
    metadata: input.link ? { link: input.link } : null,
    createdAt: new Date(),
  });
}

/**
 * Convenience wrapper that lazily resolves the DB pool when none is passed.
 */
export async function notify(input: CreateNotificationInput): Promise<void> {
  const db = await getDb();
  await createNotification(db, input);
}
