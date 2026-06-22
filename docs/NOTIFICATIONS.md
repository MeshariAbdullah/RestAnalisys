# Notifications System

MLR supports in-app notifications with hooks for email and SMS delivery.

## Architecture

- Notifications are stored in the `notifications` table (PostgreSQL)
- In dev mode, all notifications are in-app only
- In production, configure SMTP and SMS credentials to enable multi-channel delivery

## API Endpoints

| Method | Path                          | Description               |
|--------|-------------------------------|---------------------------|
| GET    | `/api/notifications`          | List notifications (paginated) |
| GET    | `/api/notifications/unread`   | Get unread count (for badge) |
| POST   | `/api/notifications/:id/read` | Mark one as read          |
| POST   | `/api/notifications/read-all` | Mark all as read          |

### Query Parameters (GET /api/notifications)

| Param      | Type    | Default | Description            |
|------------|---------|---------|------------------------|
| unreadOnly | boolean | false   | Filter to unread only  |
| limit      | number  | 20      | Max items (1-50)       |
| offset     | number  | 0       | Pagination offset      |

## Notification Types

| Type                  | Triggered by                     | Recipient     |
|-----------------------|----------------------------------|---------------|
| `rental.created`      | Renter creates a rental          | Renter        |
| `rental.asset_reserved` | Asset reserved for rental      | Owner         |
| `asset.approved`      | Admin approves asset submission  | Owner         |
| `asset.rejected`      | Admin rejects asset submission   | Owner         |

## Configuration

```env
# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@mlr.sa
SMTP_PASS=secret
SMTP_FROM=noreply@mlr.sa

# SMS (Unifonic / Twilio)
SMS_PROVIDER=unifonic
SMS_API_KEY=your-key
SMS_SENDER_ID=MLR
```

## Extending

To add a new notification trigger, call `notify()` from any route handler:

```ts
import { notify } from "../services/notificationService.js";

notify({
  userId: targetUserId,
  type: "custom.event",
  title: "English Title",
  titleAr: "العنوان بالعربي",
  body: "Description of what happened.",
  bodyAr: "وصف ما حدث.",
  entityType: "rental",
  entityId: 123,
  actionUrl: "/rentals/123",
  channel: "in_app", // or "email" | "sms"
});
```
