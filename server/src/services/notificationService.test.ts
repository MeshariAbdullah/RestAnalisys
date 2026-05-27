import { describe, it, expect, vi } from "vitest";
import { sendNotification, type NotificationPayload } from "./notificationService.js";

describe("sendNotification", () => {
  it("returns a notification ID", async () => {
    const payload: NotificationPayload = {
      recipientUserId: 1,
      recipientEmail: "test@example.com",
      channel: "email",
      priority: "normal",
      templateKey: "test",
      templateVars: { key: "value" },
      subject: "Test Subject",
    };

    const result = await sendNotification(payload);
    expect(result.id).toMatch(/^NOTIF-/);
    expect(result.status).toBe("sent");
    expect(result.provider).toBe("dev-stub");
  });

  it("handles email channel in dev mode", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await sendNotification({
      recipientUserId: 1,
      recipientEmail: "owner@example.com",
      channel: "email",
      priority: "high",
      templateKey: "asset_approved",
      templateVars: { assetTitle: "Chanel Bag" },
      subject: "Approved",
    });

    expect(result.channel).toBe("email");
    expect(result.status).toBe("sent");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("handles sms channel in dev mode", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await sendNotification({
      recipientUserId: 1,
      recipientPhone: "+966512345678",
      channel: "sms",
      priority: "normal",
      templateKey: "test_sms",
      templateVars: {},
    });

    expect(result.channel).toBe("sms");
    expect(result.status).toBe("sent");
    consoleSpy.mockRestore();
  });

  it("queues push notifications", async () => {
    const result = await sendNotification({
      recipientUserId: 1,
      channel: "push",
      priority: "low",
      templateKey: "test_push",
      templateVars: {},
    });

    expect(result.channel).toBe("push");
    expect(result.status).toBe("queued");
  });
});
