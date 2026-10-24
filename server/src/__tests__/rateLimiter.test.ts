import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimit } from "../middleware/rateLimiter.js";

function mockReq(ip = "127.0.0.1") {
  return {
    ip,
    headers: {},
  } as any;
}

function mockRes() {
  const headers: Record<string, string | number> = {};
  const res: any = {
    statusCode: 200,
    setHeader: (k: string, v: string | number) => { headers[k] = v; },
    status: (code: number) => { res.statusCode = code; return res; },
    json: vi.fn(),
    _headers: headers,
  };
  return res;
}

describe("rateLimit", () => {
  beforeEach(() => {
    // Clear the store between tests by using a unique key prefix
  });

  it("allows requests under the limit", () => {
    const prefix = `test-${Date.now()}`;
    const limiter = rateLimit({ windowMs: 60_000, max: 5, keyPrefix: prefix });
    const next = vi.fn();

    for (let i = 0; i < 5; i++) {
      limiter(mockReq(), mockRes(), next);
    }

    expect(next).toHaveBeenCalledTimes(5);
  });

  it("blocks requests over the limit with 429", () => {
    const prefix = `test-block-${Date.now()}`;
    const limiter = rateLimit({ windowMs: 60_000, max: 3, keyPrefix: prefix });
    const next = vi.fn();
    const ip = `192.168.1.${Math.floor(Math.random() * 255)}`;

    for (let i = 0; i < 3; i++) {
      limiter(mockReq(ip), mockRes(), next);
    }
    expect(next).toHaveBeenCalledTimes(3);

    const res = mockRes();
    limiter(mockReq(ip), res, next);
    expect(res.statusCode).toBe(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Too many requests" })
    );
    expect(next).toHaveBeenCalledTimes(3); // not called again
  });

  it("sets rate limit headers", () => {
    const prefix = `test-headers-${Date.now()}`;
    const limiter = rateLimit({ windowMs: 60_000, max: 10, keyPrefix: prefix });
    const res = mockRes();
    const next = vi.fn();
    const ip = `10.0.0.${Math.floor(Math.random() * 255)}`;

    limiter(mockReq(ip), res, next);

    expect(res._headers["X-RateLimit-Limit"]).toBe(10);
    expect(res._headers["X-RateLimit-Remaining"]).toBe(9);
    expect(res._headers["X-RateLimit-Reset"]).toBeGreaterThan(0);
  });

  it("tracks different IPs independently", () => {
    const prefix = `test-ips-${Date.now()}`;
    const limiter = rateLimit({ windowMs: 60_000, max: 2, keyPrefix: prefix });
    const next = vi.fn();

    const ip1 = `1.1.1.${Math.floor(Math.random() * 255)}`;
    const ip2 = `2.2.2.${Math.floor(Math.random() * 255)}`;

    limiter(mockReq(ip1), mockRes(), next);
    limiter(mockReq(ip1), mockRes(), next);
    expect(next).toHaveBeenCalledTimes(2);

    // ip1 is at limit, ip2 should still be allowed
    limiter(mockReq(ip2), mockRes(), next);
    expect(next).toHaveBeenCalledTimes(3);

    // ip1 should be blocked
    const res = mockRes();
    limiter(mockReq(ip1), res, next);
    expect(res.statusCode).toBe(429);
  });

  it("uses x-forwarded-for header when available", () => {
    const prefix = `test-xff-${Date.now()}`;
    const limiter = rateLimit({ windowMs: 60_000, max: 1, keyPrefix: prefix });
    const next = vi.fn();

    const forwardedIp = `99.99.99.${Math.floor(Math.random() * 255)}`;
    const req = {
      ip: "127.0.0.1",
      headers: { "x-forwarded-for": `${forwardedIp}, 10.0.0.1` },
    } as any;

    limiter(req, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);

    const res = mockRes();
    limiter(req, res, next);
    expect(res.statusCode).toBe(429);
  });
});
