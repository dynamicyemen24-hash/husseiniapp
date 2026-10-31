import React from "react";

/**
 * SAP Fiori-inspired 3D technical background.
 * Pure CSS (no WebGL dependency) — perspective grid + floating data orbs
 * with purposeful motion. Respects prefers-reduced-motion.
 */
export function Background3D({
  variant = "app",
}: {
  variant?: "app" | "marketing";
}) {
  return (
    <div
      aria-hidden="true"
      className={`bg3d bg3d-${variant} pointer-events-none fixed inset-0 z-0 overflow-hidden`}
    >
      <div className="bg3d-grid" />
      <div className="bg3d-orb bg3d-orb-1" />
      <div className="bg3d-orb bg3d-orb-2" />
      <div className="bg3d-orb bg3d-orb-3" />
      <div className="bg3d-scan" />
    </div>
  );
}

export default Background3D;
