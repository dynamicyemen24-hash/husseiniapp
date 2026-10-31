import { useState, useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import type { Notification, ScheduledTask } from "@/modules/pos/types";

interface UsePOSNotificationsOptions {
  autoFetch?: boolean;
  fetchInterval?: number;
  maxNotifications?: number;
  onNotification?: (notification: Notification) => void;
}

export function usePOSNotifications(options: UsePOSNotificationsOptions = {}) {
  const {
    autoFetch = true,
    fetchInterval = 30000,
    maxNotifications = 100,
    onNotification,
  } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchNotifications = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const stored = localStorage.getItem("pos_notifications");
      const newNotifications = stored ? JSON.parse(stored) : [];

      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const merged = [
          ...newNotifications.filter(
            (n: Notification) => !existingIds.has(n.id)
          ),
          ...prev,
        ].slice(0, maxNotifications);
        return merged;
      });

      setUnreadCount(
        newNotifications.filter((n: Notification) => !n.read).length
      );

      const latestUnread = newNotifications.find((n: Notification) => !n.read);
      if (
        latestUnread &&
        (!lastFetchRef.current ||
          new Date(latestUnread.timestamp).getTime() > lastFetchRef.current)
      ) {
        onNotification?.(latestUnread);
      }

      lastFetchRef.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل جلب التنبيهات");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, maxNotifications, onNotification]);

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        localStorage.setItem(
          "pos_notifications",
          JSON.stringify(
            notifications.map(n => (n.id === id ? { ...n, read: true } : n))
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل تحديث التنبيه");
      }
    },
    [notifications]
  );

  const markAllAsRead = useCallback(async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      localStorage.setItem(
        "pos_notifications",
        JSON.stringify(notifications.map(n => ({ ...n, read: true })))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحديث التنبيهات");
    }
  }, [notifications]);

  const dismiss = useCallback(
    async (id: string) => {
      try {
        setNotifications(prev => prev.filter(n => n.id !== id));
        localStorage.setItem(
          "pos_notifications",
          JSON.stringify(notifications.filter(n => n.id !== id))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل حذف التنبيه");
      }
    },
    [notifications]
  );

  const clearAll = useCallback(async () => {
    try {
      setNotifications([]);
      setUnreadCount(0);
      localStorage.removeItem("pos_notifications");
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل مسح التنبيهات");
    }
  }, []);

  const createNotification = useCallback(
    async (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
      try {
        const newNotification: Notification = {
          ...notification,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          read: false,
        };
        const updated = [newNotification, ...notifications].slice(
          0,
          maxNotifications
        );
        setNotifications(updated);
        localStorage.setItem("pos_notifications", JSON.stringify(updated));
        if (!newNotification.read) {
          setUnreadCount(prev => prev + 1);
        }
        onNotification?.(newNotification);
        return newNotification;
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل إنشاء التنبيه");
        return null;
      }
    },
    [maxNotifications, notifications, onNotification]
  );

  useEffect(() => {
    if (autoFetch) {
      fetchNotifications();
      intervalRef.current = setInterval(fetchNotifications, fetchInterval);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [autoFetch, fetchInterval, fetchNotifications]);

  const getNotificationsByType = useCallback(
    (type: Notification["type"]) => {
      return notifications.filter(n => n.type === type);
    },
    [notifications]
  );

  const getUnreadNotifications = useCallback(() => {
    return notifications.filter(n => !n.read);
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
    createNotification,
    getNotificationsByType,
    getUnreadNotifications,
  };
}

interface UsePOSScheduledTasksOptions {
  autoFetch?: boolean;
  onTaskTriggered?: (task: ScheduledTask) => void;
}

export function usePOSScheduledTasks(
  options: UsePOSScheduledTasksOptions = {}
) {
  const { autoFetch = true, onTaskTriggered } = options;

  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const lastRunRef = useRef<Map<string, number>>(new Map());
  const scheduleTaskRef = useRef<(task: ScheduledTask) => void>(() => {});
  const unscheduleTaskRef = useRef<(id: string) => void>(() => {});
  const executeTaskRef = useRef<(task: ScheduledTask) => Promise<void>>(
    async () => {}
  );

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const stored = localStorage.getItem("pos_scheduled_tasks");
      setTasks(stored ? JSON.parse(stored) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل جلب المهام المجدولة");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTask = useCallback(
    async (task: Omit<ScheduledTask, "id" | "lastRun" | "nextRun">) => {
      try {
        const newTask: ScheduledTask = {
          ...task,
          id: crypto.randomUUID(),
          lastRun: undefined,
          nextRun: undefined,
        };
        const updated = [...tasks, newTask];
        setTasks(updated);
        localStorage.setItem("pos_scheduled_tasks", JSON.stringify(updated));
        scheduleTaskRef.current(newTask);
        return newTask;
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل إنشاء المهمة");
        return null;
      }
    },
    [tasks]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<ScheduledTask>) => {
      try {
        const updatedTasks = tasks.map(t =>
          t.id === id ? { ...t, ...updates } : t
        );
        setTasks(updatedTasks);
        localStorage.setItem(
          "pos_scheduled_tasks",
          JSON.stringify(updatedTasks)
        );
        unscheduleTaskRef.current(id);
        const updatedTask = updatedTasks.find(t => t.id === id);
        if (updatedTask?.enabled) scheduleTaskRef.current(updatedTask);
        return updatedTask || null;
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل تحديث المهمة");
        return null;
      }
    },
    [tasks]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      try {
        const updatedTasks = tasks.filter(t => t.id !== id);
        setTasks(updatedTasks);
        localStorage.setItem(
          "pos_scheduled_tasks",
          JSON.stringify(updatedTasks)
        );
        unscheduleTaskRef.current(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل حذف المهمة");
      }
    },
    [tasks]
  );

  const runTaskNow = useCallback(
    async (id: string) => {
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      try {
        await executeTaskRef.current(task);
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل تشغيل المهمة");
      }
    },
    [tasks]
  );

  const scheduleTask = useCallback((task: ScheduledTask) => {
    unscheduleTaskRef.current(task.id);

    const calculateNextRun = (task: ScheduledTask): number => {
      const now = Date.now();
      const schedule = task.schedule;

      if (schedule.frequency === "once" && schedule.time) {
        const [hours, minutes] = schedule.time.split(":").map(Number);
        const next = new Date();
        next.setHours(hours, minutes, 0, 0);
        if (next.getTime() <= now) next.setDate(next.getDate() + 1);
        return next.getTime();
      }

      if (schedule.frequency === "daily" && schedule.time) {
        const [hours, minutes] = schedule.time.split(":").map(Number);
        const next = new Date();
        next.setHours(hours, minutes, 0, 0);
        if (next.getTime() <= now) next.setDate(next.getDate() + 1);
        return next.getTime();
      }

      if (
        schedule.frequency === "weekly" &&
        schedule.time &&
        schedule.daysOfWeek?.length
      ) {
        const [hours, minutes] = schedule.time.split(":").map(Number);
        const nowDay = new Date().getDay();
        let daysAhead = 7;
        for (const day of schedule.daysOfWeek.sort((a, b) => a - b)) {
          const diff = (day - nowDay + 7) % 7;
          if (diff === 0) {
            const today = new Date();
            today.setHours(hours, minutes, 0, 0);
            if (today.getTime() > now) {
              daysAhead = 0;
              break;
            }
          } else if (diff > 0 && diff < daysAhead) {
            daysAhead = diff;
          }
        }
        const next = new Date();
        next.setDate(next.getDate() + daysAhead);
        next.setHours(hours, minutes, 0, 0);
        return next.getTime();
      }

      if (
        schedule.frequency === "monthly" &&
        schedule.time &&
        schedule.dayOfMonth
      ) {
        const [hours, minutes] = schedule.time.split(":").map(Number);
        const next = new Date();
        next.setDate(schedule.dayOfMonth);
        next.setHours(hours, minutes, 0, 0);
        if (next.getTime() <= now) next.setMonth(next.getMonth() + 1);
        return next.getTime();
      }

      return now + 86400000;
    };

    const nextRun = calculateNextRun(task);
    const delay = Math.max(0, nextRun - Date.now());

    const timeout = setTimeout(() => {
      executeTaskRef.current(task);
    }, delay);

    timerRefs.current.set(task.id, timeout);
    lastRunRef.current.set(task.id, nextRun);
  }, []);

  const unscheduleTask = useCallback((id: string) => {
    const timeout = timerRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timerRefs.current.delete(id);
      lastRunRef.current.delete(id);
    }
  }, []);

  const executeTask = useCallback(
    async (task: ScheduledTask) => {
      try {
        switch (task.action.type) {
          case "notification": {
            // Create a local notification
            const newNotification: Notification = {
              id: crypto.randomUUID(),
              type: task.action.config.type || "info",
              title: task.action.config.title,
              titleAr: task.action.config.titleAr,
              message: task.action.config.message,
              messageAr: task.action.config.messageAr,
              timestamp: new Date().toISOString(),
              read: false,
            };
            const stored = localStorage.getItem("pos_notifications");
            const existingNotifications = stored ? JSON.parse(stored) : [];
            const updatedNotifications = [
              newNotification,
              ...existingNotifications,
            ].slice(0, 100);
            localStorage.setItem(
              "pos_notifications",
              JSON.stringify(updatedNotifications)
            );
            break;
          }
          case "api_call":
            await fetch(task.action.config.url, {
              method: task.action.config.method || "POST",
              headers: {
                "Content-Type": "application/json",
                ...task.action.config.headers,
              },
              body: JSON.stringify(task.action.config.body),
            });
            break;
          case "webhook":
            await fetch(task.action.config.url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                taskId: task.id,
                timestamp: Date.now(),
                ...task.action.config.payload,
              }),
            });
            break;
          case "email":
            console.warn(
              "Email channel not yet implemented:",
              task.action.type
            );
            break;
        }

        onTaskTriggered?.(task);

        const updatedTasks = tasks.map(t =>
          t.id === task.id ? { ...t, lastRun: new Date().toISOString() } : t
        );
        setTasks(updatedTasks);
        localStorage.setItem(
          "pos_scheduled_tasks",
          JSON.stringify(updatedTasks)
        );

        if (task.schedule.frequency !== "once") {
          scheduleTaskRef.current(task);
        } else {
          setTasks(prev =>
            prev.map(t => (t.id === task.id ? { ...t, enabled: false } : t))
          );
        }
      } catch (err) {
        console.error("Task execution failed:", err);
      }
    },
    [onTaskTriggered, tasks]
  );

  // Keep the latest callback refs in sync so the scheduleTask ↔ executeTask
  // cycle stays stable (no redundant re-creation, no stale-closure timers).
  scheduleTaskRef.current = scheduleTask;
  unscheduleTaskRef.current = unscheduleTask;
  executeTaskRef.current = executeTask;

  useEffect(() => {
    // Snapshot the ref so the cleanup holds a stable reference.
    const timers = timerRefs.current;
    if (autoFetch) {
      fetchTasks().then(() => {
        tasks.filter(t => t.enabled).forEach(scheduleTask);
      });
    }
    return () => {
      timers.forEach(timeout => clearTimeout(timeout));
      timers.clear();
    };
  }, [autoFetch, fetchTasks, tasks, scheduleTask]);

  return {
    tasks,
    isLoading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    runTaskNow,
  };
}
