import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import type { Request, Response, NextFunction } from "express";

function mockReq(ip = "127.0.0.1"): Partial<Request> {
  return { ip, headers: {} as any };
}

function mockRes(): Partial<Response> & { statusCode?: number; body?: any; headers: Record<string, any> } {
  const res: any = {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(key: string, value: any) {
      res.headers[key] = value;
      return res;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res.body = data;
      return res;
    },
  };
  return res;
}

describe("createRateLimiter", () => {
  it("allows requests within the limit", () => {
    const limiter = createRateLimiter("test-allow", {
      windowMs: 60_000,
      maxRequests: 5,
    });

    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    for (let i = 0; i < 5; i++) {
      limiter(req as Request, res as unknown as Response, next as NextFunction);
    }

    expect(next).toHaveBeenCalledTimes(5);
  });

  it("blocks requests exceeding the limit", () => {
    const limiter = createRateLimiter("test-block", {
      windowMs: 60_000,
      maxRequests: 3,
    });

    const req = mockReq();
    const next = vi.fn();

    for (let i = 0; i < 3; i++) {
      const res = mockRes();
      limiter(req as Request, res as unknown as Response, next as NextFunction);
    }
    expect(next).toHaveBeenCalledTimes(3);

    const res = mockRes();
    limiter(req as Request, res as unknown as Response, next as NextFunction);
    expect(next).toHaveBeenCalledTimes(3);
    expect(res.statusCode).toBe(429);
    expect(res.body?.code).toBe("RATE_LIMIT");
  });

  it("sets rate limit response headers", () => {
    const limiter = createRateLimiter("test-headers", {
      windowMs: 60_000,
      maxRequests: 10,
    });

    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    limiter(req as Request, res as unknown as Response, next as NextFunction);

    expect(res.headers["X-RateLimit-Limit"]).toBe(10);
    expect(res.headers["X-RateLimit-Remaining"]).toBe(9);
    expect(res.headers["X-RateLimit-Reset"]).toBeDefined();
  });

  it("tracks different IPs independently", () => {
    const limiter = createRateLimiter("test-ips", {
      windowMs: 60_000,
      maxRequests: 2,
    });

    const next = vi.fn();

    for (let i = 0; i < 2; i++) {
      limiter(mockReq("1.1.1.1") as Request, mockRes() as unknown as Response, next as NextFunction);
    }
    expect(next).toHaveBeenCalledTimes(2);

    limiter(mockReq("2.2.2.2") as Request, mockRes() as unknown as Response, next as NextFunction);
    expect(next).toHaveBeenCalledTimes(3);
  });

  it("uses custom message when provided", () => {
    const limiter = createRateLimiter("test-msg", {
      windowMs: 60_000,
      maxRequests: 1,
      message: "Custom rate limit message",
    });

    const req = mockReq();
    const next = vi.fn();

    limiter(req as Request, mockRes() as unknown as Response, next as NextFunction);

    const res = mockRes();
    limiter(req as Request, res as unknown as Response, next as NextFunction);
    expect(res.body?.error).toBe("Custom rate limit message");
  });
});
