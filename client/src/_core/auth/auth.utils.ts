/**
 * Pure utilities shared across the auth layer.
 */

/**
 * Validate a redirect target coming from outside the app (query param,
 * caller-supplied option) as a same-origin relative path.
 *
 * Returns the sanitized path, or `null` when the value is unsafe — absolute
 * URLs, protocol-relative URLs (`//evil.com`), backslash tricks (`/\evil.com`)
 * and any embedded URI scheme are rejected to prevent open redirects.
 * Embedded-colon forms such as `/foo:bar` are rejected too; slightly strict,
 * but no route in this app contains a colon.
 */
export function sanitizeRedirectPath(path: string): string | null {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.startsWith("/\\")
  ) {
    return null;
  }
  // Control characters can be used to smuggle alternate URLs in some clients.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(path)) return null;
  if (/[a-z][a-z\d+\-.]*:/i.test(path)) return null;
  return path;
}
