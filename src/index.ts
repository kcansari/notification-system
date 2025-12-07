import winston from "winston";
import dotenv from "dotenv";
import { NotificationFactory } from "@/factories/notification-factory";
import { NotificationService } from "@/services/notification.service";

dotenv.config();

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
    new winston.transports.File({
      filename: "notifications-error.log",
      level: "error",
    }),
    new winston.transports.File({ filename: "notifications.log" }),
  ],
});

NotificationFactory.initialize(
  {
    email: {
      service: process.env.SMTP_SERVICE!,
      host: process.env.SMTP_HOST!,
      port: parseInt(process.env.SMTP_PORT!),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    },
    sms: {
      accountSid: process.env.TWILIO_ACCOUNT_SID!,
      authToken: process.env.TWILIO_AUTH_TOKEN!,
      fromNumber: process.env.TWILIO_FROM_NUMBER!,
    },
  },
  logger,
);

const notificationService = new NotificationService(logger);

(async () => {
  const result = await notificationService.sendEmail({
    from: process.env.FROM_EMAIL!,
    to: process.env.TO_EMAIL!,
    subject: "Welcome!",
    html: `<h1>Welcome to App</h1>`,
    text: `Welcome to App`,
  });

  logger.info("Welcome email result", { result });
})();

(async () => {
  const result = await notificationService.sendSMS({
    from: process.env.TWILIO_FROM_NUMBER!,
    to: process.env.TWILIO_TO_NUMBER!,
    message: `Your verification code is: ${1234}`,
  });

  logger.info("Verification SMS result", { result });
})();
