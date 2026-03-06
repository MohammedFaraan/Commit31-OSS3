const rawBaseUrl = import.meta.env.VITE_API_URL;

if (!rawBaseUrl) {
  throw new Error("Missing VITE_API_URL");
}

const BASE_URL = rawBaseUrl.replace(/\/+$/, "");

async function request(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    ...options.headers,
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Validate endpoint before using it
  if (typeof endpoint !== "string" || endpoint.trim() === "") {
    throw new Error("Endpoint must be a non-empty string");
  }

  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  let response;

  try {
    response = await fetch(`${BASE_URL}${normalizedEndpoint}`, {
      ...options,
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
  get(endpoint) {
    return request(endpoint, { method: "GET" });
  },

  post(endpoint, body) {
    return request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  put(endpoint, body) {
    return request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  delete(endpoint) {
    return request(endpoint, { method: "DELETE" });
  },
};

export default api;