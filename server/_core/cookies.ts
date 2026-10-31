import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    // SameSite=None is only legal WITH Secure (browsers reject `None` over
    // plain HTTP — the session would silently never be stored, so login
    // "succeeds" yet every protected screen bounces the user). On insecure
    // (local/self-hosted HTTP) requests we fall back to Lax, which fully
    // supports same-site operation. HTTPS production keeps None+Secure for
    // OAuth/embedded contexts.
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
