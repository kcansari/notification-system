import { Logger } from "winston";
import { BaseNotifier } from "@/notifiers/base-notifier";
import {
  SMSConfig,
  SMSPayload,
  TwilioResponse,
} from "@/interfaces/notifier.interface";
import twilio, { Twilio } from "twilio";
import { RetryOptions } from "@/types/notification.types";
import {
  networkErrors,
  permanentPatterns,
  retryablePatterns,
  retryableTwilioCodes,
} from "@/constants";

export class SMSNotifier extends BaseNotifier<SMSPayload, TwilioResponse> {
  private client: Twilio;
  private fromNumber: string;

  constructor(config: SMSConfig, logger: Logger, retryOptions: RetryOptions) {
    super(logger, retryOptions);

    this.client = twilio(config.accountSid, config.authToken);
    this.fromNumber = config.fromNumber;
  }

  protected validatePayload(payload: SMSPayload): void {
    if (!payload.to || (Array.isArray(payload.to) && payload.to.length === 0)) {
      throw new Error("SMS recipient is required");
    }
    if (!payload.message) {
      throw new Error("SMS message is required");
    }
    if (payload.message.length > 1600) {
      throw new Error("SMS message exceeds maximum length of 1600 characters");
    }

    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];

    recipients.forEach((phone) => {
      if (!phoneRegex.test(phone)) {
        throw new Error(
          `Invalid phone number format: ${phone}. Must be in E.164 format (e.g., +1234567890)`,
        );
      }
    });
  }

  protected shouldRetry(error: Error): boolean {
    interface TwilioError extends Error {
      code?: string | number;
      status?: number;
    }

    const err = error as TwilioError;

    if (typeof err.code === "string" && networkErrors.includes(err.code)) {
      this.logger.warn("Retrying due to network error", {
        code: err.code,
        message: err.message,
      });
      return true;
    }

    if (
      typeof err.code === "number" &&
      retryableTwilioCodes.includes(err.code)
    ) {
      this.logger.warn("Retrying due to Twilio error", {
        code: err.code,
        message: err.message,
      });
      return true;
    }

    const messageRetryable = retryablePatterns.some((pattern) =>
      pattern.test(err.message),
    );

    if (messageRetryable) {
      this.logger.warn("Retrying based on error message pattern", {
        message: err.message,
      });
      return true;
    }

    const isPermanent = permanentPatterns.some((pattern) =>
      pattern.test(err.message),
    );

    if (isPermanent) {
      this.logger.error("Not retrying permanent error", {
        message: err.message,
      });
      return false;
    }

    this.logger.warn("Unknown error, not retrying", {
      message: err.message,
      code: err.code,
    });
    return false;
  }

  protected async sendNotification(
    payload: SMSPayload,
  ): Promise<TwilioResponse> {
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];

    const response = await this.client.messages.create({
      body: payload.message,
      from: payload.from || this.fromNumber,
      to: recipients[0],
    });

    return {
      sid: response.sid,
      status: response.status,
      to: response.to,
      from: response.from,
    };
  }
}
