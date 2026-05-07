import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000, // 15s timeout — generous enough for chaos-injected latency
});

// ─── Retry Configuration ────────────────────────────────
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,    // 1 second
  maxDelay: 8000,     // 8 seconds cap
  retryableStatuses: [500, 502, 503, 504, 408],
  retryableMethods: ['get', 'head', 'options', 'put', 'delete', 'patch'],
  // POST is intentionally excluded from auto-retry to prevent duplicate side-effects
  // (e.g., joining a queue twice). Pages handle POST retries explicitly.
};

/**
 * Calculate exponential backoff delay with jitter.
 * Jitter prevents "thundering herd" when many clients retry simultaneously.
 */
function getRetryDelay(attempt) {
  const exponentialDelay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt);
  const capped = Math.min(exponentialDelay, RETRY_CONFIG.maxDelay);
  const jitter = capped * (0.5 + Math.random() * 0.5); // 50-100% of computed delay
  return Math.round(jitter);
}

/**
 * Determine if a failed request should be retried.
 */
function shouldRetry(error, retryCount) {
  if (retryCount >= RETRY_CONFIG.maxRetries) return false;

  // Network errors (connection refused, dropped, DNS failure) — always retryable
  if (!error.response) return true;

  const status = error.response.status;
  const method = (error.config?.method || '').toLowerCase();

  // Only retry idempotent methods automatically
  if (!RETRY_CONFIG.retryableMethods.includes(method)) return false;

  // Retry server errors and timeouts
  return RETRY_CONFIG.retryableStatuses.includes(status);
}

/**
 * Check if an error is a chaos-injected failure (helps UI show appropriate messaging)
 */
export function isChaosError(error) {
  if (!error.response) return false;
  const data = error.response.data;
  return data?.error === 'Chaos Injection' ||
         data?.message?.includes('Chaos Middleware');
}

/**
 * Check if an error is a network/connectivity issue
 */
export function isNetworkError(error) {
  return !error.response && (
    error.code === 'ECONNABORTED' ||
    error.code === 'ERR_NETWORK' ||
    error.message?.includes('Network Error') ||
    error.message?.includes('timeout')
  );
}

/**
 * Get a user-friendly error message from an axios error
 */
export function getErrorMessage(error) {
  if (isNetworkError(error)) {
    return 'Unable to reach the server. Please check your connection and try again.';
  }
  if (isChaosError(error)) {
    return 'The server encountered a temporary issue. Retrying...';
  }
  if (error.response?.status === 429) {
    return 'Too many requests. Please wait a moment before trying again.';
  }
  return error.response?.data?.error ||
         error.response?.data?.message ||
         'Something went wrong. Please try again.';
}

// ─── Request Interceptor: Attach JWT ────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('queuex_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Track retry count on the config object
  config.__retryCount = config.__retryCount || 0;
  return config;
});

// ─── Response Interceptor: Retry + Auth Handling ────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Don't retry if no config (shouldn't happen, but safety)
    if (!config) return Promise.reject(error);

    // Handle 401 (expired/invalid token)
    if (error.response?.status === 401) {
      localStorage.removeItem('queuex_token');
      localStorage.removeItem('queuex_user');
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Attempt retry for transient failures
    if (shouldRetry(error, config.__retryCount)) {
      config.__retryCount += 1;
      const delay = getRetryDelay(config.__retryCount - 1);

      console.warn(
        `🔄 Retry ${config.__retryCount}/${RETRY_CONFIG.maxRetries} for ${config.method?.toUpperCase()} ${config.url} in ${delay}ms`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
      return api(config);
    }

    return Promise.reject(error);
  }
);

export default api;
