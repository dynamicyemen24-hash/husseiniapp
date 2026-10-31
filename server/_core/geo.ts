import type { Request } from "express";

export interface GeoInfo {
  country: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
}

const PRIVATE_RE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;
const ABORT_MS = 2500;

export function getClientIp(req: Request): string | null {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length) return xff.split(",")[0].trim();
  if (Array.isArray(xff)) return xff[0] || null;
  const real = req.headers["x-real-ip"];
  if (typeof real === "string") return real;
  return (req.socket?.remoteAddress as string) || null;
}

export function parseDevice(userAgent?: string | null): string {
  const ua = userAgent || "";
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|Windows Phone/i.test(ua);
  let browser = "متصفح";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && /Version\//i.test(ua)) browser = "Safari";
  return isMobile ? `جوال — ${browser}` : `حاسوب — ${browser}`;
}

export async function geolocate(ip: string | null): Promise<GeoInfo> {
  if (!ip || PRIVATE_RE.test(ip) || ip === "::1" || ip === "localhost") {
    return { country: null, city: null, lat: null, lng: null };
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ABORT_MS);
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { country: null, city: null, lat: null, lng: null };
    const data = (await res.json()) as Record<string, unknown>;
    const lat = typeof data.latitude === "number" ? data.latitude : null;
    const lng = typeof data.longitude === "number" ? data.longitude : null;
    return {
      country: typeof data.country_name === "string" ? data.country_name : null,
      city: typeof data.city === "string" ? data.city : null,
      lat,
      lng,
    };
  } catch {
    return { country: null, city: null, lat: null, lng: null };
  }
}
