function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizeRedirectPath(raw?: string | null, fallback = "/") {
  if (!raw) return fallback;

  let current = raw.trim();

  for (let i = 0; i < 6; i += 1) {
    const decoded = safeDecode(current);
    if (decoded === current) break;
    current = decoded;
  }

  for (let i = 0; i < 6; i += 1) {
    if (!current || /^https?:\/\//i.test(current) || !current.startsWith("/") || current.startsWith("//")) {
      return fallback;
    }

    const [pathname, search = ""] = current.split("?", 2);
    if (pathname !== "/login" && pathname !== "/onboarding") {
      return current;
    }

    const nested = new URLSearchParams(search).get("redirect");
    if (!nested || nested === current) {
      return fallback;
    }

    current = safeDecode(nested).trim();
  }

  return fallback;
}