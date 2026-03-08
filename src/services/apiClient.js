const API_BASE = import.meta.env.VITE_LARAVEL_API || "/api";

if (!import.meta.env.VITE_LARAVEL_API) {
  console.warn("VITE_LARAVEL_API is not set. Using /api (works with Vite proxy in dev).");
}

/**
 * Get the storage base URL (API origin without /api) for logo and other public storage.
 * Used so logo images load from the API when the server returns a URL that hits the client (403).
 */
function getStorageBaseUrl() {
  const base = import.meta.env.VITE_LARAVEL_API || "";
  if (!base) return null;
  try {
    const u = new URL(base.startsWith("/") ? `${typeof window !== "undefined" ? window.location.origin : ""}${base}` : base);
    const path = u.pathname.replace(/\/api\/?$/, "").replace(/\/$/, "") || "";
    return `${u.origin}${path ? `/${path.replace(/^\//, "")}` : ""}`;
  } catch {
    return null;
  }
}

/**
 * Normalize logo/storage URL for use in img src.
 * - Fixes "http://https//..." and "https//..." so images load over HTTPS.
 * - Resolves relative paths (starting with /) to absolute using current origin.
 * - If the URL is same-origin (client app) and we have an API base, rewrites to the API storage URL
 *   so the image is loaded from the backend (avoids 403 when the client does not proxy /storage).
 */
export function normalizeLogoUrl(url) {
  if (url == null || url === "") return null;
  let u = String(url).trim();
  u = u.replace(/^http:\/\/https?\/\//i, "https://");
  u = u.replace(/^https\/\//i, "https://");
  if (u.startsWith("/")) {
    u = (typeof window !== "undefined" ? window.location.origin : "") + u;
  }
  if (typeof window !== "undefined" && u) {
    try {
      const urlObj = new URL(u);
      const storagePathMatch = u.match(/\/storage\/[^?#]+/);
      if (
        storagePathMatch &&
        urlObj.origin === window.location.origin &&
        getStorageBaseUrl()
      ) {
        const storageBase = getStorageBaseUrl();
        if (storageBase && new URL(storageBase).origin !== window.location.origin) {
          u = storageBase.replace(/\/$/, "") + storagePathMatch[0];
        }
      }
    } catch {
      // ignore
    }
  }
  return u || null;
}

export function getAuthToken() {
  return localStorage.getItem("midtask_token");
}

export function setAuthToken(token) {
  if (!token) localStorage.removeItem("midtask_token");
  else localStorage.setItem("midtask_token", token);
}

export async function apiRequest(path, { method = "GET", body, auth = false } = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = { Accept: "application/json" };

  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (fetchErr) {
    const msg = fetchErr?.message === "Failed to fetch"
      ? "Could not reach the server. Ensure the backend is running (php artisan serve) and the dev server was restarted after config changes."
      : fetchErr?.message || "Network error";
    const err = new Error(msg);
    err.cause = fetchErr;
    throw err;
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const err = new Error(data?.message || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

/** Multipart/form-data request (e.g. file upload). Do not set Content-Type. */
export async function apiRequestFormData(path, { method = "POST", formData, auth = false } = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = { Accept: "application/json" };

  if (auth) {
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: formData,
    });
  } catch (fetchErr) {
    const msg = fetchErr?.message === "Failed to fetch"
      ? "Could not reach the server. Ensure the backend is running (php artisan serve) and the dev server was restarted after config changes."
      : fetchErr?.message || "Network error";
    const err = new Error(msg);
    err.cause = fetchErr;
    throw err;
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const err = new Error(data?.message || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

const API_BASE_FOR_DOWNLOAD = import.meta.env.VITE_LARAVEL_API || "/api";

/**
 * Download a file from an API path (e.g. report Excel). Uses GET with auth and triggers browser download.
 * @param {string} path - e.g. "/reports/performance-report?date_from=2026-01-01&date_to=2026-12-31"
 * @param {string} [suggestedFilename] - optional filename for the download
 * @returns {Promise<void>}
 */
export async function apiDownload(path, suggestedFilename) {
  const url = `${API_BASE_FOR_DOWNLOAD}${path.startsWith("/") ? path : `/${path}`}`;
  const token = getAuthToken();
  const headers = { Accept: "application/octet-stream, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { method: "GET", headers });
  if (!res.ok) {
    const contentType = res.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");
    const data = isJson ? await res.json() : null;
    const err = new Error(data?.message || "Download failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }

  const blob = await res.blob();
  const disp = res.headers.get("content-disposition");
  let filename = suggestedFilename;
  if (!filename && disp) {
    const match = /filename[^;=\n]*=(?:"([^"]*)"|([^;\n]*))/.exec(disp);
    if (match) filename = (match[1] || match[2] || "").trim();
  }
  if (!filename) filename = "download";

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

