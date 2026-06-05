import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimit } from "../middleware/rateLimit.js";
import type { Request, Response, NextFunction } from "express";

function mockReq(ip = "127.0.0.1"): Request {
  return { ip, headers: {} } as unknown as Request;
}

function mockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    _headers: {} as Record<string, string | number>,
    setHeader(k: string, v: string | number) { res._headers[k] = v; return res; },
    status(code: number) { res.statusCode = code; return res; },
    json(body: unknown) { res.body = body; return res; },
  };
  return res;
}

describe("rateLimit", () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 3, keyPrefix: "test" });

  it("allows requests under the limit", () => {
    const req = mockReq("10.0.0.1");
    const res = mockRes();
    const next = vi.fn();

    limiter(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it("blocks requests over the limit", () => {
    const req = mockReq("10.0.0.2");
    const next = vi.fn();

    for (let i = 0; i < 3; i++) {
      const res = mockRes();
      limiter(req, res, next);
    }

    const res = mockRes();
    limiter(req, res, next);
    expect(res.statusCode).toBe(429);
    expect(res.body).toHaveProperty("code", "RATE_LIMITED");
  });

  it("sets rate limit headers", () => {
    const req = mockReq("10.0.0.3");
    const res = mockRes();
    const next = vi.fn();

    limiter(req, res, next);
    expect(res._headers["X-RateLimit-Limit"]).toBe(3);
    expect(res._headers["X-RateLimit-Remaining"]).toBeDefined();
  });

  it("isolates limits per IP", () => {
    const next = vi.fn();
    const ip1 = mockReq("10.0.0.4");
    const ip2 = mockReq("10.0.0.5");

    for (let i = 0; i < 3; i++) {
      limiter(ip1, mockRes(), next);
    }
    const blocked = mockRes();
    limiter(ip1, blocked, next);
    expect(blocked.statusCode).toBe(429);

    const allowed = mockRes();
    limiter(ip2, allowed, next);
    expect(allowed.statusCode).toBe(200);
  });
});
