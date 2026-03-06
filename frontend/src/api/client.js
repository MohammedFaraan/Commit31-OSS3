const rawBaseUrl = import.meta.env.VITE_API_URL;

if (!rawBaseUrl) {
  throw new Error("Missing VITE_API_URL");
}

const BASE_URL = rawBaseUrl.replace(/\/+$/, "");

/**
 * Default token provider (reads from localStorage)
 */
let tokenProvider = () => localStorage.getItem("token");

/**
 * Allow AuthContext or other parts of the app
 * to provide a token dynamically.
 */
export function setTokenProvider(provider) {
  tokenProvider =
    typeof provider === "function"
      ? provider
      : () => localStorage.getItem("token");
}

async function request(endpoint, options = {}) {
  const { token: tokenOverride, ...fetchOptions } = options;

  const token = tokenOverride || tokenProvider();

  const headers = {
    ...fetchOptions.headers,
  };

  if (fetchOptions.body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Validate endpoint
  if (typeof endpoint !== "string" || endpoint.trim() === "") {
    throw new Error("Endpoint must be a non-empty string");
  }

  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  let response;

  try {
    response = await fetch(`${BASE_URL}${normalizedEndpoint}`, {
      ...fetchOptions,
      headers,
    });
  } catch (err) {
    throw new Error(err.message || "Network request failed");
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.message || "API request failed";
    throw new Error(message);
  }

  return data;
}

const api = {
  get(endpoint, options = {}) {
    return request(endpoint, { ...options, method: "GET" });
  },

  post(endpoint, body, options = {}) {
    return request(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  put(endpoint, body, options = {}) {
    return request(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  delete(endpoint, options = {}) {
    return request(endpoint, { ...options, method: "DELETE" });
  },
};

export default api;