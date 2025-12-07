import { RetryOptions } from "@/types/notification.types";

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  delayMs: 1000,
  timeoutMs: 30000,
};

export const networkErrors = [
  "ETIMEDOUT", // Connection timeout
  "ECONNRESET", // Connection reset by peer
  "ENOTFOUND", // DNS lookup failed
  "ESOCKET", // Socket error
  "ECONNREFUSED", // Connection refused
  "EPIPE", // Broken pipe
  "EAI_AGAIN", // Temporary DNS failure
];

export const retryablePatterns = [
  /timeout/i,
  /rate limit/i,
  /too many/i,
  /temporarily unavailable/i,
  /try again/i,
  /busy/i,
];

export const permanentPatterns = [
  /auth/i,
  /credentials/i,
  /invalid recipient/i,
  /does not exist/i,
  /rejected/i,
];

export const retryableTwilioCodes = [
  20429, // Too Many Requests
  20500, // Service unavailable
  20503, // Service unavailable
  30001, // Queue overflow
  30003, // Unreachable destination
  30005, // Unknown destination
];
