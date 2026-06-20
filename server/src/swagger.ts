/**
 * OpenAPI 3.0 specification for the MLR Platform API.
 *
 * All paths are defined inline (no JSDoc annotations in route files).
 * Served at /api/docs via swagger-ui-express.
 */

import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "MLR Platform API",
      version: "1.0.0",
      description:
        "Managed Luxury Rental Platform — Saudi Arabia. Full lifecycle management for luxury item rentals with legal protection via Nafith Sanad and Najiz enforcement.",
      contact: {
        name: "MLR Platform",
      },
    },
    servers: [
      {
        url: "/api",
        description: "API Server",
      },
    ],

    /* ──────────────────────────── Components ──────────────────────────── */
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "integer" },
            email: { type: "string", format: "email" },
            fullName: { type: "string" },
            role: {
              type: "string",
              enum: [
                "renter",
                "owner",
                "inspector",
                "operations",
                "admin",
                "super_admin",
              ],
            },
            phoneE164: { type: "string", example: "+966512345678" },
            nationalId: { type: "string" },
            nafathVerified: { type: "boolean" },
            kycStatus: {
              type: "string",
              enum: ["unverified", "pending", "verified", "rejected"],
            },
            phoneVerified: { type: "boolean" },
            emailVerified: { type: "boolean" },
            trustScore: { type: "integer", minimum: 0, maximum: 100 },
            riskCategory: {
              type: "string",
              enum: ["low", "medium", "high", "ultra_high"],
            },
            isBlocked: { type: "boolean" },
          },
        },

        Asset: {
          type: "object",
          properties: {
            id: { type: "integer" },
            ownerId: { type: "integer" },
            category: {
              type: "string",
              enum: [
                "handbag",
                "watch",
                "dress",
                "jewelry",
                "accessory",
                "other",
              ],
            },
            brand: { type: "string" },
            model: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            ownerDeclaredValueHalalas: {
              type: "integer",
              description: "Value in halalas (1 SAR = 100 halalas)",
            },
            evaluatedValueHalalas: { type: "integer" },
            dailyRentalPriceHalalas: { type: "integer" },
            status: {
              type: "string",
              enum: [
                "pending_approval",
                "awaiting_shipment",
                "in_inspection",
                "inspection_reported",
                "ready_for_listing",
                "listed",
                "reserved",
                "rented_out",
                "returned_under_inspection",
                "completed",
                "rejected",
                "withdrawn",
                "owner_rejected_valuation",
              ],
            },
            riskCategory: {
              type: "string",
              enum: ["low", "medium", "high", "ultra_high"],
            },
            warehouseLocationCode: { type: "string" },
            submissionImagesJson: {
              type: "array",
              items: { type: "string" },
            },
            studioImagesJson: {
              type: "array",
              items: { type: "string" },
            },
            attributesJson: { type: "object" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        Rental: {
          type: "object",
          properties: {
            id: { type: "integer" },
            reference: { type: "string" },
            assetId: { type: "integer" },
            renterId: { type: "integer" },
            status: {
              type: "string",
              enum: [
                "pending_risk_review",
                "pending_legal_signing",
                "pending_payment",
                "confirmed",
                "out_for_delivery",
                "active",
                "awaiting_return",
                "under_inspection",
                "closed",
                "closed_with_penalty",
                "enforcement",
                "cancelled",
                "in_dispute",
              ],
            },
            startDate: { type: "string", format: "date" },
            endDate: { type: "string", format: "date" },
            durationDays: { type: "integer" },
            dailyPriceHalalas: { type: "integer" },
            rentalSubtotalHalalas: { type: "integer" },
            platformFeeHalalas: { type: "integer" },
            vatHalalas: { type: "integer" },
            totalPayableHalalas: { type: "integer" },
            deliveredAt: { type: "string", format: "date-time" },
            returnedAt: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        RentalQuote: {
          type: "object",
          properties: {
            assetId: { type: "integer" },
            assetTitle: { type: "string" },
            evaluatedValueHalalas: { type: "integer" },
            dailyPriceHalalas: { type: "integer" },
            durationDays: { type: "integer" },
            rentalSubtotalHalalas: { type: "integer" },
            platformFeeHalalas: { type: "integer" },
            vatHalalas: { type: "integer" },
            totalPayableHalalas: { type: "integer" },
          },
        },

        LegalCommitment: {
          type: "object",
          properties: {
            id: { type: "integer" },
            rentalId: { type: "integer" },
            status: {
              type: "string",
              enum: [
                "draft",
                "pending_signature",
                "signed",
                "active",
                "discharged",
                "voided",
              ],
            },
            commitmentHalalas: { type: "integer" },
            commitmentPct: { type: "integer", enum: [100, 150] },
            clauses: { type: "object" },
            textHash: { type: "string" },
          },
        },

        SanadRecord: {
          type: "object",
          properties: {
            id: { type: "integer" },
            rentalId: { type: "integer" },
            status: {
              type: "string",
              enum: [
                "not_required",
                "pending_issuance",
                "issued",
                "signed",
                "active",
                "matured",
                "discharged",
                "under_execution",
                "executed",
                "cancelled",
              ],
            },
            principalHalalas: { type: "integer" },
            maturityDate: { type: "string", format: "date" },
          },
        },

        Payment: {
          type: "object",
          properties: {
            id: { type: "integer" },
            rentalId: { type: "integer" },
            type: {
              type: "string",
              enum: [
                "rental_charge",
                "security_deposit",
                "penalty",
                "refund",
                "payout",
              ],
            },
            status: {
              type: "string",
              enum: [
                "pending",
                "captured",
                "failed",
                "refunded",
                "partially_refunded",
              ],
            },
            amountHalalas: { type: "integer" },
          },
        },

        Payout: {
          type: "object",
          properties: {
            id: { type: "integer" },
            ownerId: { type: "integer" },
            rentalId: { type: "integer" },
            grossHalalas: { type: "integer" },
            commissionHalalas: { type: "integer" },
            netHalalas: { type: "integer" },
            status: { type: "string", example: "processing" },
          },
        },

        Dispute: {
          type: "object",
          properties: {
            id: { type: "integer" },
            rentalId: { type: "integer" },
            category: {
              type: "string",
              enum: ["damage", "loss", "fraud", "service", "billing"],
            },
            status: {
              type: "string",
              enum: [
                "open",
                "investigating",
                "resolved_for_renter",
                "resolved_for_platform",
                "resolved_for_owner",
                "escalated_to_legal",
              ],
            },
            summary: { type: "string" },
            evidence: {
              type: "array",
              items: { type: "string" },
            },
            openedAt: { type: "string", format: "date-time" },
          },
        },

        Inspection: {
          type: "object",
          properties: {
            id: { type: "integer" },
            assetId: { type: "integer" },
            rentalId: { type: "integer", nullable: true },
            inspectorId: { type: "integer" },
            type: { type: "string", enum: ["intake", "return"] },
            authenticityVerified: { type: "boolean" },
            authenticityNotes: { type: "string" },
            conditionScore: { type: "integer", minimum: 0, maximum: 100 },
            conditionGrade: {
              type: "string",
              enum: ["A", "B", "C", "D"],
            },
            conditionNotes: { type: "string" },
            marketValueHalalas: { type: "integer" },
            recommendedDailyPriceHalalas: { type: "integer" },
            riskCategory: {
              type: "string",
              enum: ["low", "medium", "high", "ultra_high"],
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        Shipment: {
          type: "object",
          properties: {
            id: { type: "integer" },
            assetId: { type: "integer" },
            rentalId: { type: "integer", nullable: true },
            direction: {
              type: "string",
              enum: [
                "owner_to_platform",
                "platform_to_renter",
                "renter_to_platform",
                "platform_to_owner",
              ],
            },
            status: {
              type: "string",
              enum: [
                "scheduled",
                "picked_up",
                "in_transit",
                "delivered",
                "failed",
                "returned",
              ],
            },
            courier: { type: "string" },
            trackingNumber: { type: "string" },
            scheduledAt: { type: "string", format: "date-time" },
          },
        },

        OperationalAlert: {
          type: "object",
          properties: {
            id: { type: "integer" },
            severity: {
              type: "string",
              enum: ["info", "warning", "critical"],
            },
            type: { type: "string" },
            message: { type: "string" },
            status: { type: "string", enum: ["open", "resolved"] },
            resolvedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            code: { type: "string" },
            details: { type: "object" },
          },
        },

        AuthResponse: {
          type: "object",
          properties: {
            token: { type: "string" },
            user: { $ref: "#/components/schemas/User" },
          },
        },
      },
    },

    /* ──────────────────────────── Paths ───────────────────────────── */
    paths: {
      /* ═══════════════════ Health ═══════════════════ */
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Health check",
          description:
            "Returns service status and which third-party integrations are configured.",
          responses: {
            "200": {
              description: "Service healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { type: "boolean" },
                      service: { type: "string" },
                      version: { type: "string" },
                      integrations: {
                        type: "object",
                        properties: {
                          nafath: { type: "boolean" },
                          nafith: { type: "boolean" },
                          paymentGateway: { type: "boolean" },
                          zatca: { type: "boolean" },
                        },
                      },
                      timestamp: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
        },
      },

      /* ═══════════════════ Auth ═══════════════════ */
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login",
          description: "Authenticate with email and password. Returns a JWT.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Login successful",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuthResponse" },
                },
              },
            },
            "401": {
              description: "Invalid credentials or account blocked",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register",
          description: "Create a new user account.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "fullName"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: {
                      type: "string",
                      minLength: 8,
                      description: "Minimum 8 characters",
                    },
                    fullName: { type: "string", minLength: 2 },
                    phone: {
                      type: "string",
                      pattern: "^\\+9665\\d{8}$",
                      description: "Saudi mobile number in E.164 format",
                    },
                    role: {
                      type: "string",
                      enum: ["renter", "owner"],
                      default: "renter",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Registration successful",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuthResponse" },
                },
              },
            },
            "400": {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "409": {
              description: "Email already registered",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Get current user",
          description: "Returns the profile of the authenticated user.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Current user profile",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/User" },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/auth/nafath/initiate": {
        post: {
          tags: ["Auth"],
          summary: "Initiate Nafath verification",
          description:
            "Start national identity verification via the Nafath platform. Required before creating rentals or signing legal commitments.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["nationalId"],
                  properties: {
                    nationalId: {
                      type: "string",
                      pattern: "^[12]\\d{9}$",
                      description:
                        "10-digit Saudi national ID starting with 1 or 2",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Verification initiated",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      transactionId: { type: "string" },
                      status: { type: "string" },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      /* ═══════════════════ Assets ═══════════════════ */
      "/assets": {
        post: {
          tags: ["Assets"],
          summary: "Submit asset",
          description:
            "Owner submits a luxury item for the platform. Status starts as pending_approval.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: [
                    "category",
                    "brand",
                    "title",
                    "ownerDeclaredValueHalalas",
                    "submissionImages",
                  ],
                  properties: {
                    category: {
                      type: "string",
                      enum: [
                        "handbag",
                        "watch",
                        "dress",
                        "jewelry",
                        "accessory",
                        "other",
                      ],
                    },
                    brand: { type: "string" },
                    model: { type: "string" },
                    title: { type: "string", minLength: 3 },
                    description: { type: "string" },
                    ownerDeclaredValueHalalas: {
                      type: "integer",
                      minimum: 0,
                      description: "Owner's declared value in halalas",
                    },
                    submissionImages: {
                      type: "array",
                      items: { type: "string", format: "uri" },
                      minItems: 1,
                      maxItems: 20,
                      description: "1-20 image URLs",
                    },
                    attributes: {
                      type: "object",
                      description: "Arbitrary metadata key-value pairs",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Asset submitted",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Asset" },
                },
              },
            },
            "400": {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/assets/mine": {
        get: {
          tags: ["Assets"],
          summary: "Get my assets",
          description:
            "Returns all assets owned by the authenticated user, ordered by creation date descending.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "List of owner's assets",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Asset" },
                  },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/assets/{id}/withdraw": {
        post: {
          tags: ["Assets"],
          summary: "Withdraw asset",
          description:
            "Owner withdraws their asset from the platform. Not allowed if asset is rented_out, reserved, or in_inspection.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "Asset ID",
            },
          ],
          responses: {
            "200": {
              description: "Asset withdrawn",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Asset" },
                },
              },
            },
            "403": {
              description: "Not the asset owner",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "409": {
              description: "Asset is in a state that prevents withdrawal",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/assets/{id}/valuation-response": {
        post: {
          tags: ["Assets"],
          summary: "Respond to valuation",
          description:
            "Owner approves or rejects the platform's valuation after inspection.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "Asset ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["approved"],
                  properties: {
                    approved: { type: "boolean" },
                    rejectionReason: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Valuation response recorded",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Asset" },
                },
              },
            },
            "400": {
              description:
                "Asset not in inspection_reported status or not owned by caller",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/assets/pending": {
        get: {
          tags: ["Assets"],
          summary: "Get pending approvals",
          description:
            "Admin endpoint. Returns assets awaiting approval (status = pending_approval).",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "List of pending assets",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        title: { type: "string" },
                        brand: { type: "string" },
                        category: { type: "string" },
                        ownerDeclaredValueHalalas: { type: "integer" },
                        submissionImagesJson: {
                          type: "array",
                          items: { type: "string" },
                        },
                        createdAt: { type: "string", format: "date-time" },
                        ownerId: { type: "integer" },
                        ownerName: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/assets/review": {
        post: {
          tags: ["Assets"],
          summary: "Approve or reject asset",
          description:
            "Admin reviews a pending asset submission. Approved assets move to awaiting_shipment; rejected assets are marked rejected.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["assetId", "approved"],
                  properties: {
                    assetId: { type: "integer" },
                    approved: { type: "boolean" },
                    rejectionReason: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Asset reviewed",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Asset" },
                },
              },
            },
            "400": {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": {
              description: "Asset not found or not pending",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/assets/{id}/received": {
        post: {
          tags: ["Assets"],
          summary: "Mark asset received at warehouse",
          description:
            "Operations marks that the asset has arrived and is ready for inspection.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "Asset ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["warehouseLocationCode"],
                  properties: {
                    warehouseLocationCode: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Asset received, status set to in_inspection",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Asset" },
                },
              },
            },
            "400": {
              description: "Asset not in awaiting_shipment status",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/assets/listings": {
        get: {
          tags: ["Assets"],
          summary: "Browse listed assets",
          description:
            "Public endpoint. Returns paginated listed assets with optional filtering and full-text search across title, brand, and model.",
          parameters: [
            {
              name: "category",
              in: "query",
              schema: {
                type: "string",
                enum: [
                  "handbag",
                  "watch",
                  "dress",
                  "jewelry",
                  "accessory",
                  "other",
                ],
              },
              description: "Filter by asset category",
            },
            {
              name: "brand",
              in: "query",
              schema: { type: "string" },
              description: "Filter by brand name",
            },
            {
              name: "search",
              in: "query",
              schema: { type: "string" },
              description:
                "Full-text search across title, brand, and model",
            },
            {
              name: "sort",
              in: "query",
              schema: {
                type: "string",
                enum: ["price_asc", "price_desc", "newest", "oldest"],
              },
              description: "Sort order",
            },
            {
              name: "minDaily",
              in: "query",
              schema: { type: "integer" },
              description: "Minimum daily rental price in halalas",
            },
            {
              name: "maxDaily",
              in: "query",
              schema: { type: "integer" },
              description: "Maximum daily rental price in halalas",
            },
            {
              name: "from",
              in: "query",
              schema: { type: "string", format: "date" },
              description: "Availability from date (YYYY-MM-DD)",
            },
            {
              name: "to",
              in: "query",
              schema: { type: "string", format: "date" },
              description: "Availability to date (YYYY-MM-DD)",
            },
            {
              name: "condition",
              in: "query",
              schema: { type: "string" },
              description: "Filter by condition",
            },
            {
              name: "cursor",
              in: "query",
              schema: { type: "integer" },
              description: "Cursor-based pagination (asset ID)",
            },
            {
              name: "offset",
              in: "query",
              schema: { type: "integer" },
              description: "Offset-based pagination",
            },
            {
              name: "limit",
              in: "query",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 50,
                default: 20,
              },
              description: "Page size (1-50, default 20)",
            },
          ],
          responses: {
            "200": {
              description: "Paginated listing results",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      items: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "integer" },
                            title: { type: "string" },
                            brand: { type: "string" },
                            model: { type: "string" },
                            category: { type: "string" },
                            dailyRentalPriceHalalas: { type: "integer" },
                            evaluatedValueHalalas: { type: "integer" },
                            studioImagesJson: {
                              type: "array",
                              items: { type: "string" },
                            },
                            attributesJson: { type: "object" },
                            riskCategory: { type: "string" },
                          },
                        },
                      },
                      total: { type: "integer" },
                      count: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/assets/listings/{id}": {
        get: {
          tags: ["Assets"],
          summary: "Get asset listing detail",
          description:
            "Public endpoint. Returns detailed information about a specific listed asset.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "Asset ID",
            },
          ],
          responses: {
            "200": {
              description: "Asset detail",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      title: { type: "string" },
                      brand: { type: "string" },
                      model: { type: "string" },
                      category: { type: "string" },
                      description: { type: "string" },
                      dailyRentalPriceHalalas: { type: "integer" },
                      evaluatedValueHalalas: { type: "integer" },
                      studioImagesJson: {
                        type: "array",
                        items: { type: "string" },
                      },
                      attributesJson: { type: "object" },
                      riskCategory: { type: "string" },
                      status: { type: "string" },
                    },
                  },
                },
              },
            },
            "404": {
              description: "Asset not found or not listed",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/assets/{id}/publish": {
        post: {
          tags: ["Assets"],
          summary: "Publish asset",
          description:
            "Admin publishes an asset that is ready_for_listing, making it visible in the marketplace.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "Asset ID",
            },
          ],
          responses: {
            "200": {
              description: "Asset published (status = listed)",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Asset" },
                },
              },
            },
            "400": {
              description: "Asset not in ready_for_listing status",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/assets/{id}": {
        get: {
          tags: ["Assets"],
          summary: "Get asset by ID",
          description:
            "Returns full asset record. Owners can only see their own assets; admins, operations, and inspectors can see any.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "Asset ID",
            },
          ],
          responses: {
            "200": {
              description: "Asset detail",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Asset" },
                },
              },
            },
            "403": {
              description: "Not authorized to view this asset",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": {
              description: "Asset not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      /* ═══════════════════ Rentals ═══════════════════ */
      "/rentals/quote": {
        get: {
          tags: ["Rentals"],
          summary: "Get rental quote",
          description:
            "Public endpoint. Calculates rental pricing including platform fee and VAT without creating a rental.",
          parameters: [
            {
              name: "assetId",
              in: "query",
              required: true,
              schema: { type: "integer" },
              description: "ID of the asset to rent",
            },
            {
              name: "startDate",
              in: "query",
              required: true,
              schema: { type: "string", format: "date" },
              description: "Rental start date (YYYY-MM-DD)",
            },
            {
              name: "endDate",
              in: "query",
              required: true,
              schema: { type: "string", format: "date" },
              description: "Rental end date (YYYY-MM-DD)",
            },
          ],
          responses: {
            "200": {
              description: "Rental quote",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/RentalQuote" },
                },
              },
            },
            "400": {
              description: "Invalid parameters",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": {
              description: "Asset not found or not listed",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/rentals": {
        post: {
          tags: ["Rentals"],
          summary: "Create rental",
          description:
            "Renter creates a new rental. Requires Nafath verification. Runs risk engine and creates legal commitment. Asset must be listed and cannot be renter's own.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["assetId", "startDate", "endDate"],
                  properties: {
                    assetId: { type: "integer" },
                    startDate: {
                      type: "string",
                      format: "date",
                      description: "YYYY-MM-DD",
                    },
                    endDate: {
                      type: "string",
                      format: "date",
                      description: "YYYY-MM-DD",
                    },
                    deliveryAddress: {
                      type: "object",
                      properties: {
                        city: { type: "string" },
                        district: { type: "string" },
                        street: { type: "string" },
                        buildingNumber: { type: "string" },
                        postalCode: { type: "string" },
                        additionalCode: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description:
                "Rental created with risk assessment and legal commitment",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      rental: { $ref: "#/components/schemas/Rental" },
                      risk: {
                        type: "object",
                        properties: {
                          baseScore: { type: "integer" },
                          finalScore: { type: "integer" },
                          riskCategory: { type: "string" },
                          legalCommitmentPct: { type: "integer" },
                          legalCommitmentHalalas: { type: "integer" },
                        },
                      },
                      legal: {
                        $ref: "#/components/schemas/LegalCommitment",
                      },
                      quote: { $ref: "#/components/schemas/RentalQuote" },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Validation error or asset not available",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description:
                "Nafath verification required or risk rejection",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
        get: {
          tags: ["Rentals"],
          summary: "List all rentals",
          description:
            "Admin/operations endpoint. Returns up to 200 rentals ordered by creation date descending.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "List of rentals",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Rental" },
                  },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/rentals/mine": {
        get: {
          tags: ["Rentals"],
          summary: "Get my rentals",
          description:
            "Returns all rentals belonging to the authenticated renter.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "List of renter's rentals",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Rental" },
                  },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/rentals/{id}": {
        get: {
          tags: ["Rentals"],
          summary: "Get rental detail",
          description:
            "Returns rental with associated legal commitment, Sanad, and payments. Renters/owners can only view their own rentals.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "Rental ID",
            },
          ],
          responses: {
            "200": {
              description:
                "Rental detail with legal and payment information",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      rental: { $ref: "#/components/schemas/Rental" },
                      legal: {
                        $ref: "#/components/schemas/LegalCommitment",
                      },
                      sanad: {
                        $ref: "#/components/schemas/SanadRecord",
                      },
                      payments: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Payment" },
                      },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description: "Not authorized to view this rental",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": {
              description: "Rental not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/rentals/{id}/cancel": {
        post: {
          tags: ["Rentals"],
          summary: "Cancel rental",
          description:
            "Cancel a rental that is in pending_risk_review, pending_legal_signing, or pending_payment status. Only the renter or an admin can cancel.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "Rental ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["reason"],
                  properties: {
                    reason: {
                      type: "string",
                      minLength: 3,
                      description: "Cancellation reason",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Rental cancelled",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Rental" },
                },
              },
            },
            "400": {
              description:
                "Rental cannot be cancelled in its current status",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description: "Not authorized to cancel this rental",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/rentals/{id}/fulfill": {
        post: {
          tags: ["Rentals"],
          summary: "Fulfill rental (dispatch)",
          description:
            "Operations marks the rental as dispatched. Creates a shipment record. Rental must be in confirmed status.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "Rental ID",
            },
          ],
          responses: {
            "200": {
              description:
                "Rental fulfilled, status set to out_for_delivery",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Rental" },
                },
              },
            },
            "400": {
              description: "Rental not in confirmed status",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/rentals/{id}/delivered": {
        post: {
          tags: ["Rentals"],
          summary: "Mark rental delivered",
          description:
            "Operations marks the asset as delivered to the renter. Rental must be in out_for_delivery status.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "Rental ID",
            },
          ],
          responses: {
            "200": {
              description: "Rental delivered, status set to active",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Rental" },
                },
              },
            },
            "400": {
              description: "Rental not in out_for_delivery status",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/rentals/{id}/returned": {
        post: {
          tags: ["Rentals"],
          summary: "Mark rental returned",
          description:
            "Operations marks the asset as returned by the renter. Rental must be in active or return_in_transit status.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "Rental ID",
            },
          ],
          responses: {
            "200": {
              description:
                "Rental returned, status set to under_inspection",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Rental" },
                },
              },
            },
            "400": {
              description:
                "Rental not in active or return_in_transit status",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/rentals/{id}/close": {
        post: {
          tags: ["Rentals"],
          summary: "Close rental",
          description:
            "Close a rental after return inspection. Outcome determines final status and whether penalties or enforcement are triggered.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "Rental ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["outcome"],
                  properties: {
                    outcome: {
                      type: "string",
                      enum: ["clean", "penalty", "major_damage", "loss"],
                      description:
                        "clean = no issues; penalty = minor damage; major_damage/loss = triggers enforcement",
                    },
                    penaltyHalalas: {
                      type: "integer",
                      description:
                        "Penalty amount in halalas (required when outcome = penalty)",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Rental closed",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Rental" },
                },
              },
            },
            "400": {
              description: "Rental not in under_inspection status",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      /* ═══════════════════ Legal ═══════════════════ */
      "/legal/commitment/{id}": {
        get: {
          tags: ["Legal"],
          summary: "Get legal commitment",
          description:
            "Returns a legal commitment with its associated rental and asset. Renter can only view their own commitments.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "Legal commitment ID",
            },
          ],
          responses: {
            "200": {
              description: "Legal commitment detail",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      commitment: {
                        $ref: "#/components/schemas/LegalCommitment",
                      },
                      rental: { $ref: "#/components/schemas/Rental" },
                      asset: { $ref: "#/components/schemas/Asset" },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description: "Not authorized to view this commitment",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": {
              description: "Commitment not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/legal/sign": {
        post: {
          tags: ["Legal"],
          summary: "Sign legal commitment",
          description:
            "Renter signs the legal commitment. Triggers Nafath e-signature and Nafith Sanad issuance. Requires Nafath verification. Advances rental to pending_payment.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["legalCommitmentId", "acceptTerms"],
                  properties: {
                    legalCommitmentId: { type: "integer" },
                    acceptTerms: {
                      type: "boolean",
                      enum: [true],
                      description: "Must be true",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Commitment signed and Sanad issued",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      commitment: {
                        $ref: "#/components/schemas/LegalCommitment",
                      },
                      sanad: {
                        $ref: "#/components/schemas/SanadRecord",
                      },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Validation error or terms not accepted",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description: "Nafath verification required",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/legal/pending-enforcement": {
        get: {
          tags: ["Legal"],
          summary: "List pending enforcement",
          description:
            "Returns active Sanad records that may need enforcement. Admin/operations endpoint.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "List of active Sanad records",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/SanadRecord",
                    },
                  },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/legal/sanad/{id}/discharge": {
        post: {
          tags: ["Legal"],
          summary: "Discharge Sanad",
          description:
            "Mark a Sanad as discharged (obligation fulfilled).",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "Sanad ID",
            },
          ],
          responses: {
            "200": {
              description: "Sanad discharged",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/SanadRecord",
                  },
                },
              },
            },
            "404": {
              description: "Sanad not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/legal/sanad/execute": {
        post: {
          tags: ["Legal"],
          summary: "Execute Sanad",
          description:
            "Initiate Sanad execution via Najiz. Sets rental to enforcement status.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["sanadId", "reason"],
                  properties: {
                    sanadId: { type: "integer" },
                    reason: {
                      type: "string",
                      minLength: 5,
                      description: "Reason for execution",
                    },
                    attachments: {
                      type: "array",
                      items: { type: "string", format: "uri" },
                      description: "Supporting evidence URLs",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Sanad under execution",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/SanadRecord",
                  },
                },
              },
            },
            "400": {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": {
              description: "Sanad not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/legal/sanads": {
        get: {
          tags: ["Legal"],
          summary: "List Sanads",
          description:
            "Returns up to 500 Sanad records. Admin endpoint.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "List of Sanad records",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/SanadRecord",
                    },
                  },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      /* ═══════════════════ Payments ═══════════════════ */
      "/payments/charge": {
        post: {
          tags: ["Payments"],
          summary: "Charge payment",
          description:
            "Charge the renter for a rental in pending_payment status. Creates a ZATCA e-invoice. On success, advances rental to confirmed.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["rentalId"],
                  properties: {
                    rentalId: { type: "integer" },
                    paymentMethodToken: {
                      type: "string",
                      description: "Payment gateway token",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Payment charged and invoice generated",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      payment: {
                        $ref: "#/components/schemas/Payment",
                      },
                      invoice: {
                        type: "object",
                        properties: {
                          invoiceNumber: { type: "string" },
                          invoiceXmlUrl: { type: "string" },
                          invoiceQrBase64: { type: "string" },
                          invoicedAt: {
                            type: "string",
                            format: "date-time",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": {
              description:
                "Rental not in pending_payment status or not owned by caller",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/payments/refund": {
        post: {
          tags: ["Payments"],
          summary: "Refund payment",
          description:
            "Issue a full or partial refund on a captured payment.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["paymentId"],
                  properties: {
                    paymentId: { type: "integer" },
                    amountHalalas: {
                      type: "integer",
                      description:
                        "Refund amount in halalas (defaults to full amount if omitted)",
                    },
                    reason: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Payment refunded",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Payment" },
                },
              },
            },
            "400": {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": {
              description: "Payment not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/payments/mine": {
        get: {
          tags: ["Payments"],
          summary: "Get my payments",
          description:
            "Returns all payment records for the authenticated user.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "List of payments",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Payment" },
                  },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/payments/payout/{rentalId}": {
        post: {
          tags: ["Payments"],
          summary: "Release owner payout",
          description:
            "Release payout to the asset owner after a rental is closed. 20% platform commission is deducted.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "rentalId",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "Rental ID",
            },
          ],
          responses: {
            "200": {
              description: "Payout initiated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Payout" },
                },
              },
            },
            "400": {
              description:
                "Rental not in closed/closed_with_penalty status",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/payments/payouts/mine": {
        get: {
          tags: ["Payments"],
          summary: "Get my payouts",
          description:
            "Returns payout records for the authenticated owner.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "List of payouts",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Payout" },
                  },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      /* ═══════════════════ Disputes ═══════════════════ */
      "/disputes": {
        post: {
          tags: ["Disputes"],
          summary: "Open dispute",
          description:
            "Open a dispute against a rental. Sets rental status to in_dispute. Must be the renter, owner, or staff on the rental.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["rentalId", "category", "summary"],
                  properties: {
                    rentalId: { type: "integer" },
                    category: {
                      type: "string",
                      enum: [
                        "damage",
                        "loss",
                        "fraud",
                        "service",
                        "billing",
                      ],
                    },
                    summary: {
                      type: "string",
                      minLength: 10,
                      description:
                        "Description of the dispute (min 10 chars)",
                    },
                    evidence: {
                      type: "array",
                      items: { type: "string", format: "uri" },
                      description: "Supporting evidence URLs",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Dispute opened",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Dispute" },
                },
              },
            },
            "400": {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
        get: {
          tags: ["Disputes"],
          summary: "List disputes",
          description:
            "Returns up to 200 disputes ordered by openedAt descending. Admin/operations endpoint.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "List of disputes",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Dispute" },
                  },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/disputes/{id}/assign": {
        post: {
          tags: ["Disputes"],
          summary: "Assign dispute",
          description:
            "Assign a dispute to a staff member for investigation.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "Dispute ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["assigneeUserId"],
                  properties: {
                    assigneeUserId: { type: "integer" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description:
                "Dispute assigned, status set to investigating",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Dispute" },
                },
              },
            },
            "404": {
              description: "Dispute not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/disputes/resolve": {
        post: {
          tags: ["Disputes"],
          summary: "Resolve dispute",
          description:
            "Resolve a dispute with a specific outcome. Escalation to legal triggers rental enforcement.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["disputeId", "resolution", "notes"],
                  properties: {
                    disputeId: { type: "integer" },
                    resolution: {
                      type: "string",
                      enum: [
                        "resolved_for_renter",
                        "resolved_for_platform",
                        "resolved_for_owner",
                        "escalated_to_legal",
                      ],
                    },
                    notes: {
                      type: "string",
                      minLength: 3,
                      description: "Resolution notes",
                    },
                    resolutionAmountHalalas: {
                      type: "integer",
                      description:
                        "Monetary resolution amount in halalas",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Dispute resolved",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Dispute" },
                },
              },
            },
            "400": {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": {
              description: "Dispute not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      /* ═══════════════════ Inspections ═══════════════════ */
      "/inspections/queue": {
        get: {
          tags: ["Inspections"],
          summary: "Inspection queue",
          description:
            "Returns assets waiting for inspection (status in_inspection or returned_under_inspection).",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "List of assets awaiting inspection",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Asset" },
                  },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/inspections/intake": {
        post: {
          tags: ["Inspections"],
          summary: "Submit intake inspection",
          description:
            "Inspector submits an intake inspection report for an asset in in_inspection status. Sets asset to inspection_reported.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: [
                    "assetId",
                    "type",
                    "authenticityVerified",
                    "conditionScore",
                    "conditionGrade",
                    "marketValueHalalas",
                    "recommendedDailyPriceHalalas",
                    "riskCategory",
                  ],
                  properties: {
                    assetId: { type: "integer" },
                    type: {
                      type: "string",
                      enum: ["intake"],
                      description: 'Must be "intake"',
                    },
                    authenticityVerified: { type: "boolean" },
                    authenticityNotes: { type: "string" },
                    conditionScore: {
                      type: "integer",
                      minimum: 0,
                      maximum: 100,
                    },
                    conditionGrade: {
                      type: "string",
                      enum: ["A", "B", "C", "D"],
                    },
                    conditionNotes: { type: "string" },
                    marketValueHalalas: { type: "integer" },
                    recommendedDailyPriceHalalas: { type: "integer" },
                    riskCategory: {
                      type: "string",
                      enum: ["low", "medium", "high", "ultra_high"],
                    },
                    beforeImages: {
                      type: "array",
                      items: { type: "string", format: "uri" },
                    },
                    afterImages: {
                      type: "array",
                      items: { type: "string", format: "uri" },
                    },
                    checklist: { type: "object" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Inspection recorded",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Inspection",
                  },
                },
              },
            },
            "400": {
              description:
                "Asset not in in_inspection status or validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/inspections/return": {
        post: {
          tags: ["Inspections"],
          summary: "Submit return inspection",
          description:
            "Inspector submits a return inspection report for a returned rental. Requires rentalId.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: [
                    "assetId",
                    "rentalId",
                    "type",
                    "authenticityVerified",
                    "conditionScore",
                    "conditionGrade",
                    "marketValueHalalas",
                    "recommendedDailyPriceHalalas",
                    "riskCategory",
                  ],
                  properties: {
                    assetId: { type: "integer" },
                    rentalId: { type: "integer" },
                    type: {
                      type: "string",
                      enum: ["return"],
                      description: 'Must be "return"',
                    },
                    authenticityVerified: { type: "boolean" },
                    authenticityNotes: { type: "string" },
                    conditionScore: {
                      type: "integer",
                      minimum: 0,
                      maximum: 100,
                    },
                    conditionGrade: {
                      type: "string",
                      enum: ["A", "B", "C", "D"],
                    },
                    conditionNotes: { type: "string" },
                    marketValueHalalas: { type: "integer" },
                    recommendedDailyPriceHalalas: { type: "integer" },
                    riskCategory: {
                      type: "string",
                      enum: ["low", "medium", "high", "ultra_high"],
                    },
                    beforeImages: {
                      type: "array",
                      items: { type: "string", format: "uri" },
                    },
                    afterImages: {
                      type: "array",
                      items: { type: "string", format: "uri" },
                    },
                    checklist: { type: "object" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Return inspection recorded",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      inspection: {
                        $ref: "#/components/schemas/Inspection",
                      },
                      hint: {
                        type: "string",
                        example:
                          "Call POST /rentals/:id/close with outcome=clean|penalty|major_damage",
                      },
                    },
                  },
                },
              },
            },
            "400": {
              description:
                "Rental not in under_inspection status or validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/inspections/{id}": {
        get: {
          tags: ["Inspections"],
          summary: "Get inspection by ID",
          description: "Returns a single inspection record.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "Inspection ID",
            },
          ],
          responses: {
            "200": {
              description: "Inspection detail",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Inspection",
                  },
                },
              },
            },
            "404": {
              description: "Inspection not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/inspections/asset/{assetId}": {
        get: {
          tags: ["Inspections"],
          summary: "Get inspections for asset",
          description:
            "Returns all inspection records for a given asset, ordered by creation date descending.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "assetId",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "Asset ID",
            },
          ],
          responses: {
            "200": {
              description: "List of inspections",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/Inspection",
                    },
                  },
                },
              },
            },
          },
        },
      },

      /* ═══════════════════ Operations ═══════════════════ */
      "/operations/summary": {
        get: {
          tags: ["Operations"],
          summary: "Operations summary",
          description:
            "Returns operational KPIs: active rentals, late rentals, open alerts, and inventory counts by status.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Operations summary",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      activeRentals: { type: "integer" },
                      lateRentals: { type: "integer" },
                      openAlerts: { type: "integer" },
                      inventoryCounts: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            status: { type: "string" },
                            count: { type: "integer" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/operations/shipments": {
        get: {
          tags: ["Operations"],
          summary: "List shipments",
          description: "Returns up to 200 shipment records.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "List of shipments",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Shipment" },
                  },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
        post: {
          tags: ["Operations"],
          summary: "Create shipment",
          description: "Create a new shipment record.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["assetId", "direction"],
                  properties: {
                    assetId: { type: "integer" },
                    rentalId: { type: "integer" },
                    direction: {
                      type: "string",
                      enum: [
                        "owner_to_platform",
                        "platform_to_renter",
                        "renter_to_platform",
                        "platform_to_owner",
                      ],
                    },
                    courier: { type: "string" },
                    scheduledAt: {
                      type: "string",
                      format: "date-time",
                    },
                    fromAddress: { type: "object" },
                    toAddress: { type: "object" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Shipment created",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Shipment" },
                },
              },
            },
            "400": {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/operations/shipments/{id}": {
        patch: {
          tags: ["Operations"],
          summary: "Update shipment",
          description:
            "Update shipment status and/or tracking number.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "Shipment ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: {
                    status: {
                      type: "string",
                      enum: [
                        "scheduled",
                        "picked_up",
                        "in_transit",
                        "delivered",
                        "failed",
                        "returned",
                      ],
                    },
                    trackingNumber: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Shipment updated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Shipment" },
                },
              },
            },
            "404": {
              description: "Shipment not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/operations/inventory": {
        get: {
          tags: ["Operations"],
          summary: "List inventory",
          description:
            "Returns up to 500 asset inventory records with warehouse location.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Inventory list",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        title: { type: "string" },
                        brand: { type: "string" },
                        status: { type: "string" },
                        warehouseLocationCode: { type: "string" },
                        evaluatedValueHalalas: { type: "integer" },
                        updatedAt: {
                          type: "string",
                          format: "date-time",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/operations/inventory/{assetId}/movements": {
        get: {
          tags: ["Operations"],
          summary: "Get inventory movements",
          description:
            "Returns movement history for a specific asset.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "assetId",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "Asset ID",
            },
          ],
          responses: {
            "200": {
              description: "List of inventory movements",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        assetId: { type: "integer" },
                        fromLocation: { type: "string" },
                        toLocation: { type: "string" },
                        movedAt: {
                          type: "string",
                          format: "date-time",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/operations/alerts": {
        get: {
          tags: ["Operations"],
          summary: "List operational alerts",
          description: "Returns up to 200 operational alerts.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "List of alerts",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/OperationalAlert",
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/operations/alerts/{id}/resolve": {
        post: {
          tags: ["Operations"],
          summary: "Resolve alert",
          description: "Mark an operational alert as resolved.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "Alert ID",
            },
          ],
          responses: {
            "200": {
              description: "Alert resolved",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/OperationalAlert",
                  },
                },
              },
            },
            "404": {
              description: "Alert not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      /* ═══════════════════ Admin ═══════════════════ */
      "/admin/kpis": {
        get: {
          tags: ["Admin"],
          summary: "Admin KPIs",
          description:
            "Returns platform-wide KPIs including user counts, revenue, disputes, and Sanad statistics.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Platform KPIs",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      users: { type: "integer" },
                      listedAssets: { type: "integer" },
                      rentedAssets: { type: "integer" },
                      rentalsThisMonth: { type: "integer" },
                      revenue: {
                        type: "object",
                        properties: {
                          rentalSubtotalHalalas: { type: "integer" },
                          platformFeeHalalas: { type: "integer" },
                          vatHalalas: { type: "integer" },
                        },
                      },
                      openDisputes: { type: "integer" },
                      activeSanads: { type: "integer" },
                      sanadsUnderExecution: { type: "integer" },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/admin/revenue-trend": {
        get: {
          tags: ["Admin"],
          summary: "Revenue trend",
          description:
            "Returns daily revenue breakdown for the last 30 days.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Revenue trend data",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day: {
                          type: "string",
                          format: "date",
                          example: "2026-06-15",
                        },
                        total_halalas: { type: "integer" },
                        fee_halalas: { type: "integer" },
                        rentals: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/admin/risk/low-trust": {
        get: {
          tags: ["Admin"],
          summary: "Low trust users",
          description:
            "Returns up to 50 users with trust score below 60.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "List of low-trust users",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        email: { type: "string" },
                        fullName: { type: "string" },
                        trustScore: { type: "integer" },
                        riskCategory: { type: "string" },
                        isBlocked: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/admin/users": {
        get: {
          tags: ["Admin"],
          summary: "List users",
          description:
            "Returns up to 200 users, optionally filtered by role.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "role",
              in: "query",
              schema: {
                type: "string",
                enum: [
                  "renter",
                  "owner",
                  "inspector",
                  "operations",
                  "admin",
                  "super_admin",
                ],
              },
              description: "Filter by user role",
            },
          ],
          responses: {
            "200": {
              description: "List of users",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
        post: {
          tags: ["Admin"],
          summary: "Create staff user",
          description:
            "Create a new staff user (admin, operations, or inspector). Auto-verified for Nafath and KYC.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: [
                    "email",
                    "fullName",
                    "role",
                    "passwordHash",
                  ],
                  properties: {
                    email: { type: "string", format: "email" },
                    fullName: { type: "string" },
                    role: {
                      type: "string",
                      enum: ["admin", "operations", "inspector"],
                    },
                    passwordHash: {
                      type: "string",
                      description: "Pre-hashed password",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Staff user created",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/User" },
                },
              },
            },
            "400": {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/admin/users/{id}/block": {
        post: {
          tags: ["Admin"],
          summary: "Block/unblock user",
          description: "Block or unblock a user account.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "User ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["block"],
                  properties: {
                    block: {
                      type: "boolean",
                      description:
                        "true to block, false to unblock",
                    },
                    reason: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "User block status updated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/User" },
                },
              },
            },
            "404": {
              description: "User not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/admin/risk/recent": {
        get: {
          tags: ["Admin"],
          summary: "Recent risk scores",
          description:
            "Returns the 100 most recent risk score records for auditing.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "List of recent risk scores",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        rentalId: { type: "integer" },
                        userId: { type: "integer" },
                        baseScore: { type: "integer" },
                        finalScore: { type: "integer" },
                        riskCategory: { type: "string" },
                        createdAt: {
                          type: "string",
                          format: "date-time",
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
    },

    /* ──────────────────────────── Tags ────────────────────────────── */
    tags: [
      { name: "Health", description: "Service health checks" },
      {
        name: "Auth",
        description:
          "Authentication, registration, and Nafath verification",
      },
      {
        name: "Assets",
        description:
          "Luxury item management — submission, approval, listings, and lifecycle",
      },
      {
        name: "Rentals",
        description:
          "Rental lifecycle — quoting, creation, fulfillment, and closure",
      },
      {
        name: "Legal",
        description:
          "Legal commitments, Nafith Sanad issuance, signing, and enforcement",
      },
      {
        name: "Payments",
        description:
          "Payment processing, ZATCA invoicing, refunds, and owner payouts",
      },
      {
        name: "Disputes",
        description: "Dispute creation, assignment, and resolution",
      },
      {
        name: "Inspections",
        description: "Intake and return inspection reports",
      },
      {
        name: "Operations",
        description:
          "Shipments, inventory management, and operational alerts",
      },
      {
        name: "Admin",
        description:
          "Platform KPIs, revenue trends, user management, and risk monitoring",
      },
    ],
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
