// Centralized API Base URL Configuration
// In development, empty string routes through Vite's dev server proxy (/api -> http://127.0.0.1:5000),
// ensuring 100% same-origin requests without CORS preflight failures or cross-port cookie partitioning.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
