const API_BASE = import.meta.env.VITE_LARAVEL_API || "/api";

if (!import.meta.env.VITE_LARAVEL_API) {
  console.warn("VITE_LARAVEL_API is not set. Using /api (works with Vite proxy in dev).");
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

