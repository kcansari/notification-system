import { Logger } from "winston";
import { EmailConfig, EmailNotifier } from "@/notifiers/email-notifier";
import { NotificationType, RetryOptions } from "@/types/notification.types";
import { BaseNotifier } from "@/notifiers/base-notifier";
import { SMSConfig } from "@/interfaces/notifier.interface";
import { DEFAULT_RETRY_OPTIONS } from "@/constants";
import { SMSNotifier } from "@/notifiers/sms-notifier";

export interface NotificationFactoryConfig {
  email?: EmailConfig;
  sms?: SMSConfig;
}

export class NotificationFactory {
  private static notifiers: Map<NotificationType, BaseNotifier<any, any>> =
    new Map();
  private static logger: Logger;
  private static config: NotificationFactoryConfig;

  static initialize(config: NotificationFactoryConfig, logger: Logger): void {
    this.config = config;
    this.logger = logger;

    this.logger.info("NotificationFactory initialized");
  }

  static createNotifier(
    type: NotificationType,
    retryOptions: RetryOptions = DEFAULT_RETRY_OPTIONS,
  ): BaseNotifier<any, any> {
    if (this.notifiers.has(type)) {
      return this.notifiers.get(type)!;
    }

    if (!this.logger) {
      throw new Error(
        "NotificationFactory not initialized. Call initialize() first.",
      );
    }

    let notifier: BaseNotifier<any, any>;

    switch (type) {
      case NotificationType.EMAIL:
        if (!this.config.email) {
          throw new Error("Email configuration not provided");
        }
        notifier = new EmailNotifier(
          this.config.email,
          this.logger,
          retryOptions,
        );
        break;

      case NotificationType.SMS:
        if (!this.config.sms) {
          throw new Error("Email configuration not provided");
        }
        notifier = new SMSNotifier(this.config.sms, this.logger, retryOptions);
        break;

      case NotificationType.PUSH:
        throw new Error("Push notifications not yet implemented");

      case NotificationType.SLACK:
        throw new Error("Slack notifications not yet implemented");

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    this.notifiers.set(type, notifier);
    this.logger.info(`Created notifier for type: ${type}`);

    return notifier;
  }

  static registerNotifier(
    type: NotificationType,
    notifier: BaseNotifier<any, any>,
  ): void {
    this.notifiers.set(type, notifier);
    this.logger.info(`Registered custom notifier for type: ${type}`);
  }

  static getAvailableTypes(): NotificationType[] {
    return Array.from(this.notifiers.keys());
  }

  static clear(): void {
    this.notifiers.clear();
    this.logger.info("Cleared all notifier instances");
  }

  static async cleanup(): Promise<void> {
    for (const notifier of this.notifiers.values()) {
      if ("close" in notifier && typeof notifier.close === "function") {
        await notifier.close();
      }
    }
    this.clear();
  }
}
