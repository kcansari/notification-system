import { Logger } from "winston";
import { retry, RetryConfig } from "ts-retry-promise";
import { NotificationResult } from "@/interfaces/notifier.interface";
import { RetryOptions } from "@/types/notification.types";

export abstract class BaseNotifier<TPayload, TResponse = unknown> {
  protected logger: Logger;
  protected retryConfig: Partial<RetryConfig<TResponse>>;

  constructor(logger: Logger, retryOptions?: RetryOptions) {
    this.logger = logger;
    this.retryConfig = {
      retries: retryOptions?.maxRetries ?? 10,
      delay: retryOptions?.delayMs ?? 100,
      timeout: retryOptions?.timeoutMs ?? 60 * 1000,
      retryIf: (error: Error) => this.shouldRetry(error),
    };
  }

  protected abstract sendNotification(payload: TPayload): Promise<TResponse>;
  protected abstract shouldRetry(error: Error): boolean;
  protected abstract validatePayload(payload: TPayload): void;

  async send(payload: TPayload): Promise<NotificationResult> {
    try {
      this.validatePayload(payload);

      this.logger.info(
        `Attempting to send notification via ${this.constructor.name}`,
        {
          payload: this.sanitizePayload(payload),
        },
      );

      const result = await retry(
        () => this.sendNotification(payload),
        this.retryConfig,
      );

      this.logger.info(
        `Notification sent successfully via ${this.constructor.name}`,
        {
          result,
        },
      );

      return {
        success: true,
        messageId: this.extractMessageId(result),
        provider: this.constructor.name,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Notification failed via ${this.constructor.name}`, {
        error: errorMessage,
        stack: errorStack,
        payload: this.sanitizePayload(payload),
      });

      return {
        success: false,
        error: errorMessage,
        provider: this.constructor.name,
      };
    }
  }

  protected sanitizePayload(payload: TPayload): Partial<TPayload> {
    const sanitized = structuredClone(payload) as Record<string, unknown>;
    const sensitiveFields = ["auth", "password", "apiKey", "token", "secret"];
    sensitiveFields.forEach((field) => delete sanitized[field]);

    if (sanitized.html) sanitized.html = "(html content)";
    if (
      typeof sanitized.message === "string" &&
      sanitized.message.length > 100
    ) {
      sanitized.message = sanitized.message.substring(0, 100) + "...";
    }

    return sanitized as Partial<TPayload>;
  }

  protected extractMessageId(result: TResponse): string | undefined {
    if (result && typeof result === "object") {
      const obj = result as Record<string, unknown>;
      return (obj.messageId || obj.sid || obj.id) as string | undefined;
    }
    return undefined;
  }
}
