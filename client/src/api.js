const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export class ApiError extends Error {
  constructor(message, errors = {}, status = 0) {
    super(message);
    this.errors = errors;
    this.status = status;
  }
}

export async function api(path, options = {}) {
  let res;
  try {
    res = await fetch(API + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError("Cannot reach the server. Check that the API is running.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.message || "Request failed", data.errors, res.status);
  return data;
}

export const qs = (params) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== "" && v != null && p.set(k, v));
  const s = p.toString();
  return s ? `?${s}` : "";
};
