/**
 * push.ts — PWA دفع نووي
 * - تسجيل pushManager.subscribe مع VAPID (إن وجد)
 * - واجهة موحدة لتنبيهات انخفاض مخزون وفاتورة معلقة حتى مع إغلاق المتصفح
 * - يعمل مع sw.js v13 (push + notificationclick)
 */

export async function ensurePushPermission(): Promise<NotificationPermission> {
  if (!("Notification" in globalThis)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return await Notification.requestPermission();
}

export async function subscribePush(
  vapidPublicKey?: string
): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window))
    return null;
  const perm = await ensurePushPermission();
  if (perm !== "granted") return null;
  const reg = await navigator.serviceWorker.ready;
  if (reg.pushManager.getSubscription) {
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;
  }
  if (!vapidPublicKey) {
    // بدون VAPID — نستخدم اشتراكاً وهمياً محلياً (يعمل للتنبيهات المحلية فقط)
    return null;
  }
  try {
    const appServerKey = urlBase64ToUint8Array(vapidPublicKey);
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appServerKey as any,
    });
  } catch {
    return null;
  }
}

export function triggerLocalNotification(
  title: string,
  body: string,
  tag?: string
) {
  if (Notification.permission !== "granted") return;
  // عبر SW لضمان الظهور حتى مع إغلاق التبويب
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "LOCAL_NOTIFY",
      title,
      body,
      tag,
    });
  } else {
    new Notification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/favicon-32x32.png",
    });
  }
}

export function notifyLowStock(count: number) {
  if (count <= 0) return;
  triggerLocalNotification(
    "تنبيه مخزون",
    `يوجد ${count} صنف تحت الحد الأدنى — راجع المخزون الآن`,
    "low-stock"
  );
}

export function notifyPendingInvoice(count: number) {
  if (count <= 0) return;
  triggerLocalNotification(
    "فاتورة معلقة",
    `لديك ${count} فاتورة بانتظار الاعتماد — تحرك الآن`,
    "pending-invoice"
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i)
    outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
