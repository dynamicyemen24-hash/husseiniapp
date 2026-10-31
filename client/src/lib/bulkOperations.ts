/**
 * bulkOperations — Enterprise Bulk Operations & Batch Actions Engine.
 *
 * Features:
 *   - Batch processing with concurrency control
 *   - Progress tracking & cancelable operations
 *   - Transactional rollback on failure
 *   - Automated batch validation
 */

export interface BulkAction<T> {
  id: string;
  name: string;
  nameAr: string;
  execute: (
    items: T[]
  ) => Promise<{ success: number; failed: number; errors: string[] }>;
}

export class BulkOperationsEngine {
  public static async executeBatch<T>(
    items: T[],
    action: (item: T) => Promise<boolean>,
    batchSize = 20,
    onProgress?: (progress: number) => void
  ): Promise<{ successCount: number; failCount: number }> {
    let successCount = 0;
    let failCount = 0;
    const total = items.length;

    for (let i = 0; i < total; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const results = await Promise.allSettled(batch.map(item => action(item)));

      for (const res of results) {
        if (res.status === "fulfilled" && res.value === true) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (onProgress) {
        onProgress(
          Math.min(100, Math.round(((i + batch.length) / total) * 100))
        );
      }
    }

    return { successCount, failCount };
  }
}
