import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimit } from "../middleware/rateLimiter.js";
import type { Request, Response, NextFunction } from "express";

function mockReq(ip = "1.2.3.4"): Partial<Request> {
  return { ip, headers: {} } as Partial<Request>;
}

function mockRes(): { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; setHeader: ReturnType<typeof vi.fn> } {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
  };
  return res;
}

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("allows requests under the limit", () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 5, keyPrefix: "test1" });
    const req = mockReq("10.0.0.1");
    const res = mockRes();
    const next = vi.fn();

    for (let i = 0; i < 5; i++) {
      limiter(req as Request, res as unknown as Response, next as NextFunction);
    }
    expect(next).toHaveBeenCalledTimes(5);
  });

  it("blocks requests over the limit", () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 3, keyPrefix: "test2" });
    const req = mockReq("10.0.0.2");
    const res = mockRes();
    const next = vi.fn();

    for (let i = 0; i < 4; i++) {
      limiter(req as Request, res as unknown as Response, next as NextFunction);
    }
    expect(next).toHaveBeenCalledTimes(3);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it("resets after window expires", () => {
    const limiter = rateLimit({ windowMs: 1000, maxRequests: 2, keyPrefix: "test3" });
    const req = mockReq("10.0.0.3");
    const res = mockRes();
    const next = vi.fn();

    limiter(req as Request, res as unknown as Response, next as NextFunction);
    limiter(req as Request, res as unknown as Response, next as NextFunction);
    expect(next).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(1500);

    limiter(req as Request, res as unknown as Response, next as NextFunction);
    expect(next).toHaveBeenCalledTimes(3);
  });

  it("tracks different IPs independently", () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 1, keyPrefix: "test4" });
    const next = vi.fn();

    const req1 = mockReq("10.0.0.10");
    const res1 = mockRes();
    limiter(req1 as Request, res1 as unknown as Response, next as NextFunction);
    expect(next).toHaveBeenCalledTimes(1);

    const req2 = mockReq("10.0.0.11");
    const res2 = mockRes();
    limiter(req2 as Request, res2 as unknown as Response, next as NextFunction);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it("sets rate limit headers", () => {
    const limiter = rateLimit({ windowMs: 60_000, maxRequests: 10, keyPrefix: "test5" });
    const req = mockReq("10.0.0.20");
    const res = mockRes();
    const next = vi.fn();

    limiter(req as Request, res as unknown as Response, next as NextFunction);
    expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", 10);
    expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", 9);
  });
});
