/**
 * ActivityIndicator — Real-time presence and activity indicators.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ActivityIndicatorProps {
  status: "online" | "typing" | "idle" | "offline";
  label?: string;
  className?: string;
}

export function ActivityIndicator({
  status,
  label,
  className,
}: ActivityIndicatorProps) {
  const config = {
    online: {
      dot: "bg-green-500",
      ring: "border-green-500",
      text: "text-green-600",
      animation: "activity-ring",
    },
    typing: {
      dot: "bg-brand animate-pulse",
      ring: "border-brand",
      text: "text-brand",
      animation: "typing-dot",
    },
    idle: {
      dot: "bg-neutral-400",
      ring: "border-neutral-400",
      text: "text-neutral-500",
      animation: "",
    },
    offline: {
      dot: "bg-neutral-300",
      ring: "border-neutral-300",
      text: "text-neutral-400",
      animation: "",
    },
  };

  const c = config[status];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <div className={cn("size-2 rounded-full", c.dot)} />
        {c.animation && (
          <div
            className={cn(
              "absolute inset-0 rounded-full border-2",
              c.ring,
              c.animation
            )}
          />
        )}
      </div>
      {label && (
        <span className={cn("text-xs font-medium", c.text)}>{label}</span>
      )}
    </div>
  );
}

/**
 * TypingIndicator — Animated typing dots.
 */
export function TypingIndicator({
  className,
  label = "يكتب...",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="size-2 rounded-full bg-brand"
          animate={{
            y: [0, -6, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
      <span className="text-xs text-neutral-500 mr-1">{label}</span>
    </div>
  );
}

/**
 * PresenceList — Online users list.
 */
export function PresenceList({
  users,
  className,
}: {
  users: { name: string; status: "online" | "typing" | "idle" }[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {users.map((user, i) => (
        <motion.div
          key={user.name}
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <ActivityIndicator status={user.status} />
          <span className="text-sm text-neutral-700">{user.name}</span>
        </motion.div>
      ))}
    </div>
  );
}
