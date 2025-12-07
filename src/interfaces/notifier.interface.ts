import { NotificationType } from "@/types/notification.types";

export interface NotificationConfig {
  type: NotificationType;
  retryOptions?: {
    maxRetries?: number;
    delayMs?: number;
    timeoutMs?: number;
  };
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
}

interface EmailAttachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
}

export interface EmailPayload {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface SMSPayload {
  from: string;
  to: string | string[];
  message: string;
}

export interface SendGridResponse {
  messageId: string;
  statusCode: number;
}

export type NotificationPayload = EmailPayload | SMSPayload;

export interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface TwilioResponse {
  sid: string;
  status: string;
  to: string;
  from: string;
}
