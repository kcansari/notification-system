export enum NotificationType {
  EMAIL = "EMAIL",
  SMS = "SMS",
  PUSH = "PUSH",
  SLACK = "SLACK",
}

export type RetryOptions = {
  maxRetries: number;
  delayMs: number;
  timeoutMs: number;
};
