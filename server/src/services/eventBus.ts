/**
 * In-process event bus for real-time notifications.
 *
 * Services emit domain events (rental.created, asset.approved, etc.) and the
 * WebSocket layer broadcasts them to connected clients. This decouples business
 * logic from transport.
 */

import { EventEmitter } from "node:events";

export type DomainEventType =
  | "rental.created"
  | "rental.confirmed"
  | "rental.delivered"
  | "rental.returned"
  | "rental.closed"
  | "rental.cancelled"
  | "asset.submitted"
  | "asset.approved"
  | "asset.rejected"
  | "asset.listed"
  | "payment.captured"
  | "payment.refunded"
  | "dispute.opened"
  | "dispute.resolved"
  | "alert.created"
  | "shipment.updated"
  | "kpi.updated";

export interface DomainEvent {
  type: DomainEventType;
  payload: Record<string, unknown>;
  targetRoles?: string[];
  targetUserIds?: number[];
  timestamp: string;
}

class PlatformEventBus extends EventEmitter {
  emit(event: "domain", data: DomainEvent): boolean;
  emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  onDomainEvent(handler: (event: DomainEvent) => void): void {
    this.on("domain", handler);
  }

  emitDomainEvent(
    type: DomainEventType,
    payload: Record<string, unknown>,
    opts?: { targetRoles?: string[]; targetUserIds?: number[] }
  ): void {
    this.emit("domain", {
      type,
      payload,
      targetRoles: opts?.targetRoles,
      targetUserIds: opts?.targetUserIds,
      timestamp: new Date().toISOString(),
    });
  }
}

export const eventBus = new PlatformEventBus();
eventBus.setMaxListeners(50);
