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
} from "../utils/errors.js";

describe("AppError", () => {
  it("creates with defaults", () => {
    const err = new AppError("something broke");
    expect(err.message).toBe("something broke");
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("INTERNAL");
    expect(err.details).toBeUndefined();
    expect(err).toBeInstanceOf(Error);
  });

  it("creates with custom values", () => {
    const err = new AppError("bad request", 400, "CUSTOM", { field: "x" });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("CUSTOM");
    expect(err.details).toEqual({ field: "x" });
  });
});

describe("ValidationError", () => {
  it("has status 400 and VALIDATION code", () => {
    const err = new ValidationError("invalid input");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION");
    expect(err).toBeInstanceOf(AppError);
  });
});

describe("UnauthorizedError", () => {
  it("has status 401", () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("Unauthorized");
    expect(err.code).toBe("UNAUTHORIZED");
  });
});

describe("ForbiddenError", () => {
  it("has status 403", () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
  });
});

describe("NotFoundError", () => {
  it("has status 404 with entity name", () => {
    const err = new NotFoundError("Asset");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Asset not found");
    expect(err.code).toBe("NOT_FOUND");
  });

  it("defaults to Resource", () => {
    const err = new NotFoundError();
    expect(err.message).toBe("Resource not found");
  });
});

describe("ConflictError", () => {
  it("has status 409", () => {
    const err = new ConflictError("already exists");
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("CONFLICT");
  });
});

describe("RiskRejectionError", () => {
  it("has status 422 and RISK_REJECTED code", () => {
    const err = new RiskRejectionError("score too low", { score: 15 });
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe("RISK_REJECTED");
    expect(err.details).toEqual({ score: 15 });
  });
});

describe("LegalStateError", () => {
  it("has status 422 and LEGAL_STATE code", () => {
    const err = new LegalStateError("already signed");
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe("LEGAL_STATE");
  });
});
