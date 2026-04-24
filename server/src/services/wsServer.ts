/**
 * WebSocket server for real-time dashboard updates.
 *
 * Uses native Node.js WebSocket support (ws-compatible via the http upgrade).
 * Clients connect to /ws with a JWT token as a query parameter.
 *
 * Events are filtered by role and userId — admins see everything, renters see
 * only their own events, etc.
 */

import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { verifyToken, AuthPayload } from "../middleware/auth.js";
import { eventBus, DomainEvent } from "./eventBus.js";

interface AuthedSocket extends WebSocket {
  user?: AuthPayload;
  isAlive?: boolean;
}

let wss: WebSocketServer | null = null;

export function initWebSocketServer(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: AuthedSocket, req) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(4001, "Missing token");
      return;
    }

    try {
      ws.user = verifyToken(token);
    } catch {
      ws.close(4001, "Invalid token");
      return;
    }

    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("error", () => {
      ws.isAlive = false;
    });

    ws.send(JSON.stringify({
      type: "connected",
      userId: ws.user.userId,
      role: ws.user.role,
      timestamp: new Date().toISOString(),
    }));
  });

  const heartbeat = setInterval(() => {
    if (!wss) return;
    for (const ws of wss.clients as Set<AuthedSocket>) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30_000);

  wss.on("close", () => clearInterval(heartbeat));

  eventBus.onDomainEvent((event: DomainEvent) => {
    if (!wss) return;

    for (const ws of wss.clients as Set<AuthedSocket>) {
      if (ws.readyState !== WebSocket.OPEN || !ws.user) continue;

      if (!shouldReceive(ws.user, event)) continue;

      ws.send(JSON.stringify(event));
    }
  });

  console.log("   WebSocket: enabled (path: /ws)");
  return wss;
}

function shouldReceive(user: AuthPayload, event: DomainEvent): boolean {
  if (user.role === "admin" || user.role === "super_admin") return true;

  if (event.targetUserIds?.length && !event.targetUserIds.includes(user.userId)) {
    return false;
  }

  if (event.targetRoles?.length && !event.targetRoles.includes(user.role)) {
    return false;
  }

  if (!event.targetRoles && !event.targetUserIds) {
    return user.role === "admin" || user.role === "super_admin" || user.role === "operations";
  }

  return true;
}

export function getConnectedClients(): number {
  return wss?.clients.size ?? 0;
}
