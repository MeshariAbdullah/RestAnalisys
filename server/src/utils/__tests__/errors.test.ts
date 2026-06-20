import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RiskRejectionError,
  LegalStateError,
} from "../errors.js";

describe("AppError", () => {
  it("has default statusCode 500, code INTERNAL", () => {
    const err = new AppError("something broke");
    expect(err.message).toBe("something broke");
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("INTERNAL");
  });

  it("accepts custom statusCode, code, and details", () => {
    const err = new AppError("custom", 418, "TEAPOT", { x: 1 });
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe("TEAPOT");
    expect(err.details).toEqual({ x: 1 });
  });

  it("is an instance of Error", () => {
    expect(new AppError("x")).toBeInstanceOf(Error);
  });
});

describe("ValidationError", () => {
  it("has statusCode 400 and code VALIDATION", () => {
    const err = new ValidationError("bad input");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION");
    expect(err.message).toBe("bad input");
  });

  it("is an instance of AppError", () => {
    expect(new ValidationError("x")).toBeInstanceOf(AppError);
  });
});

describe("UnauthorizedError", () => {
  it("has statusCode 401 and code UNAUTHORIZED", () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
    expect(err.message).toBe("Unauthorized");
  });

  it("accepts a custom message", () => {
    const err = new UnauthorizedError("token expired");
    expect(err.message).toBe("token expired");
  });
});

describe("ForbiddenError", () => {
  it("has statusCode 403 and code FORBIDDEN", () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
    expect(err.message).toBe("Forbidden");
  });
});

describe("NotFoundError", () => {
  it("has statusCode 404 and code NOT_FOUND", () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Resource not found");
  });

  it("includes custom entity in the message", () => {
    const err = new NotFoundError("Listing");
    expect(err.message).toBe("Listing not found");
  });
});

describe("ConflictError", () => {
  it("has statusCode 409 and code CONFLICT", () => {
    const err = new ConflictError("duplicate");
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("CONFLICT");
    expect(err.message).toBe("duplicate");
  });
});

describe("RiskRejectionError", () => {
  it("has statusCode 422 and code RISK_REJECTED", () => {
    const err = new RiskRejectionError("too risky");
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe("RISK_REJECTED");
    expect(err.message).toBe("too risky");
  });
});

describe("LegalStateError", () => {
  it("has statusCode 422 and code LEGAL_STATE", () => {
    const err = new LegalStateError("contract invalid");
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe("LEGAL_STATE");
    expect(err.message).toBe("contract invalid");
  });
});
