// services/notification.service.ts
import { Logger } from "winston";
import { NotificationType } from "@/types/notification.types";
import {
  EmailPayload,
  NotificationPayload,
  NotificationResult,
} from "@/interfaces/notifier.interface";
import { NotificationFactory } from "@/factories/notification-factory";

export class NotificationService {
  constructor(private logger: Logger) {}

  async send(
    type: NotificationType,
    payload: NotificationPayload,
  ): Promise<NotificationResult> {
    try {
      const notifier = NotificationFactory.createNotifier(type);
      return await notifier.send(payload);
    } catch (error: any) {
      this.logger.error("Failed to send notification", {
        type,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendEmail(payload: EmailPayload): Promise<NotificationResult> {
    return this.send(NotificationType.EMAIL, payload);
  }

  async sendMultiChannel(
    channels: Array<{
      type: NotificationType;
      payload: NotificationPayload;
    }>,
  ): Promise<NotificationResult[]> {
    this.logger.info(
      `Sending multi-channel notification to ${channels.length} channels`,
    );

    const results = await Promise.allSettled(
      channels.map(({ type, payload }) => this.send(type, payload)),
    );

    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        this.logger.error("Multi-channel notification failed", {
          channel: channels[index].type,
          error: result.reason,
        });
        return {
          success: false,
          error: result.reason?.message || "Unknown error",
        };
      }
    });
  }

  async sendWithFallback(
    primary: { type: NotificationType; payload: NotificationPayload },
    fallback: { type: NotificationType; payload: NotificationPayload },
  ): Promise<NotificationResult> {
    this.logger.info("Attempting notification with fallback", {
      primary: primary.type,
      fallback: fallback.type,
    });

    const primaryResult = await this.send(primary.type, primary.payload);

    if (primaryResult.success) {
      return primaryResult;
    }

    this.logger.warn("Primary notification failed, trying fallback", {
      primaryError: primaryResult.error,
    });

    return await this.send(fallback.type, fallback.payload);
  }
}
