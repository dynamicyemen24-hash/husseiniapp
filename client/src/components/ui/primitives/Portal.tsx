/**
 * Portal — Primitive portal component
 * Renders children into document.body so overlays escape clipping ancestors.
 * Required by Modal and Select. Standalone primitive for menus/popovers.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface PortalProps {
  children: React.ReactNode;
  /** Container to portal into. Defaults to document.body. */
  container?: Element | null;
  /** Disable portalling (useful for tests / SSR snapshots). */
  disabled?: boolean;
  testId?: string;
}

export function Portal({
  children,
  container,
  disabled = false,
  testId,
}: PortalProps): React.JSX.Element {
  const [mount, setMount] = useState<Element | null>(null);

  useEffect(() => {
    if (disabled) return;
    setMount(container ?? (typeof document !== 'undefined' ? document.body : null));
  }, [container, disabled]);

  if (disabled) return <>{children}</>;
  if (!mount) return <span data-testid={testId} hidden aria-hidden="true" />;
  return createPortal(
    <span data-testid={testId} style={{ display: 'contents' }}>
      {children}
    </span>,
    mount
  );
}

export default Portal;
