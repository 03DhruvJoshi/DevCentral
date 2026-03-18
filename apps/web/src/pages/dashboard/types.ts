const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_API_BASE_URL ?? "http://localhost:4000";

const token = localStorage.getItem("devcentral_token");

export { API_BASE_URL, token };
