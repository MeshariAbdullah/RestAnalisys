import { describe, it, expect, vi } from "vitest";
import { rateLimit } from "../middleware/rateLimit.js";
import type { Request, Response, NextFunction } from "express";

function mockReqRes() {
  const req = { ip: "127.0.0.1" } as Request;
  const headers: Record<string, string | number> = {};
  const res = {
    setHeader: (k: string, v: string | number) => { headers[k] = v; },
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next, headers };
}

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    const limiter = rateLimit({ windowMs: 60000, max: 3 });
    const { req, res, next } = mockReqRes();
    limiter(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("blocks requests over the limit", () => {
    const limiter = rateLimit({ windowMs: 60000, max: 2 });
    for (let i = 0; i < 2; i++) {
      const { req, res, next } = mockReqRes();
      limiter(req, res, next);
    }
    const { req, res, next } = mockReqRes();
    limiter(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it("sets rate limit headers", () => {
    const limiter = rateLimit({ windowMs: 60000, max: 10 });
    const { req, res, next, headers } = mockReqRes();
    limiter(req, res, next);
    expect(headers["X-RateLimit-Limit"]).toBe(10);
    expect(headers["X-RateLimit-Remaining"]).toBe(9);
    expect(headers["X-RateLimit-Reset"]).toBeDefined();
  });

  it("tracks different IPs separately", () => {
    const limiter = rateLimit({ windowMs: 60000, max: 1 });
    const m1 = mockReqRes();
    m1.req.ip = "1.1.1.1";
    limiter(m1.req, m1.res, m1.next);
    expect(m1.next).toHaveBeenCalled();

    const m2 = mockReqRes();
    m2.req.ip = "2.2.2.2";
    limiter(m2.req, m2.res, m2.next);
    expect(m2.next).toHaveBeenCalled();

    const m3 = mockReqRes();
    m3.req.ip = "1.1.1.1";
    limiter(m3.req, m3.res, m3.next);
    expect(m3.next).not.toHaveBeenCalled();
  });
});
