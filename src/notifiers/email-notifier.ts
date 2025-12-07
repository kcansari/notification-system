import { BaseNotifier } from "@/notifiers/base-notifier";
import {
  EmailPayload,
  SendGridResponse,
} from "@/interfaces/notifier.interface";
import { Logger } from "winston";
import { RetryOptions } from "@/types/notification.types";
import nodemailer from "nodemailer";
import {
  networkErrors,
  permanentPatterns,
  retryablePatterns,
} from "@/constants";

export interface EmailConfig {
  service: string;
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export class EmailNotifier extends BaseNotifier<
  EmailPayload,
  nodemailer.SentMessageInfo
> {
  private transporter: nodemailer.Transporter;
  private verified = false;

  constructor(config: EmailConfig, logger: Logger, retryOptions: RetryOptions) {
    super(logger, retryOptions);

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      service: config.service,
    });
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
    } catch (e) {
      this.logger.error("Email notifier connection failed", {
        error: e instanceof Error ? e.message : String(e),
      });
      throw new Error("Failed to connect to email service");
    }
  }

  protected validatePayload(payload: EmailPayload) {
    if (!payload.to || (Array.isArray(payload.to) && payload.to.length === 0)) {
      throw new Error("Email recipient is required");
    }

    if (!payload.subject) {
      throw new Error("Email subject is required");
    }

    if (!payload.html && !payload.text) {
      throw new Error("Email must have either html or text content");
    }
  }

  protected shouldRetry(error: Error): boolean {
    interface NodemailerError extends Error {
      code?: string;
      responseCode?: number;
      command?: string;
    }

    const err = error as NodemailerError;

    if (err.code && networkErrors.includes(err.code)) {
      this.logger.warn("Retrying due to network error", {
        code: err.code,
        message: err.message,
      });
      return true;
    }

    if (err.responseCode) {
      // 4xx = Temporary failure (mailbox busy, rate limit, etc.)
      if (err.responseCode >= 400 && err.responseCode < 500) {
        this.logger.warn("Retrying due to temporary SMTP error", {
          responseCode: err.responseCode,
          message: err.message,
        });
        return true;
      }

      // 5xx = Permanent failure (invalid recipient, auth failed, etc.)
      if (err.responseCode >= 500 && err.responseCode < 600) {
        this.logger.error("Not retrying permanent SMTP error", {
          responseCode: err.responseCode,
          message: err.message,
        });
        return false;
      }
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

  protected async sendNotification(payload: EmailPayload) {
    if (!this.verified) {
      await this.verifyConnection();
      this.verified = true;
    }

    return await this.transporter.sendMail(payload);
  }
  async close() {
    this.transporter.close();
    this.logger.info("Email notifier connection closed");
  }
}
