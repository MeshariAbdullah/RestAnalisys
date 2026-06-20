import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MLR Platform API',
      version: '1.0.0',
      description:
        'Managed Luxury Rental Platform API — Saudi Arabia. Full lifecycle management for luxury item rentals with legal protection via Nafith Sanad and Najiz enforcement.',
    },
    servers: [{ url: '/api', description: 'API Server' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            fullName: { type: 'string' },
            role: { type: 'string', enum: ['renter', 'owner', 'inspector', 'operations', 'admin', 'super_admin'] },
            nafathVerified: { type: 'boolean' },
            kycStatus: { type: 'string', enum: ['unverified', 'pending', 'verified', 'rejected'] },
            trustScore: { type: 'integer', minimum: 0, maximum: 100 },
            riskCategory: { type: 'string', enum: ['low', 'medium', 'high', 'ultra_high'] },
          },
        },
        Asset: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            ownerId: { type: 'integer' },
            category: { type: 'string', enum: ['handbag', 'watch', 'dress', 'jewelry', 'accessory', 'other'] },
            brand: { type: 'string' },
            model: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            ownerDeclaredValueHalalas: { type: 'integer', description: 'Value in halalas (1 SAR = 100 halalas)' },
            evaluatedValueHalalas: { type: 'integer' },
            dailyRentalPriceHalalas: { type: 'integer' },
            status: {
              type: 'string',
              enum: [
                'pending_approval', 'awaiting_shipment', 'in_inspection', 'inspection_reported',
                'ready_for_listing', 'listed', 'reserved', 'rented_out',
                'returned_under_inspection', 'completed', 'rejected', 'withdrawn', 'owner_rejected_valuation',
              ],
            },
            riskCategory: { type: 'string', enum: ['low', 'medium', 'high', 'ultra_high'] },
          },
        },
        Rental: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            reference: { type: 'string' },
            assetId: { type: 'integer' },
            renterId: { type: 'integer' },
            status: {
              type: 'string',
              enum: [
                'pending_risk_review', 'pending_legal_signing', 'pending_payment', 'confirmed',
                'out_for_delivery', 'active', 'awaiting_return', 'under_inspection',
                'closed', 'closed_with_penalty', 'enforcement', 'cancelled', 'in_dispute',
              ],
            },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            durationDays: { type: 'integer' },
            totalPayableHalalas: { type: 'integer' },
          },
        },
        RentalQuote: {
          type: 'object',
          properties: {
            dailyPriceHalalas: { type: 'integer' },
            durationDays: { type: 'integer' },
            rentalSubtotalHalalas: { type: 'integer' },
            platformFeeHalalas: { type: 'integer' },
            vatHalalas: { type: 'integer' },
            totalPayableHalalas: { type: 'integer' },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            rentalId: { type: 'integer' },
            type: { type: 'string', enum: ['rental_charge', 'security_deposit', 'penalty', 'refund', 'payout'] },
            status: { type: 'string', enum: ['pending', 'captured', 'failed', 'refunded', 'partially_refunded'] },
            amountHalalas: { type: 'integer' },
          },
        },
        Dispute: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            rentalId: { type: 'integer' },
            category: { type: 'string', enum: ['damage', 'loss', 'fraud', 'service', 'billing'] },
            status: { type: 'string', enum: ['open', 'investigating', 'resolved_for_renter', 'resolved_for_platform', 'resolved_for_owner', 'escalated_to_legal'] },
            summary: { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Health check',
          responses: {
            '200': {
              description: 'Service status',
              content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, service: { type: 'string' }, version: { type: 'string' } } } } },
            },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login with email and password',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } } } },
          },
          responses: {
            '200': { description: 'JWT token and user profile', content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } },
            '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new account',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['email', 'password', 'fullName'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 }, fullName: { type: 'string' }, role: { type: 'string', enum: ['renter', 'owner'], default: 'renter' } } } } },
          },
          responses: {
            '201': { description: 'Account created', content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } },
            '400': { description: 'Validation error' },
            '409': { description: 'Email already exists' },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user profile',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'User profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/assets/listings': {
        get: {
          tags: ['Assets'],
          summary: 'Browse listed assets (public)',
          description: 'Returns paginated list of published luxury items available for rent.',
          parameters: [
            { name: 'category', in: 'query', schema: { type: 'string', enum: ['handbag', 'watch', 'dress', 'jewelry', 'accessory', 'other'] } },
            { name: 'brand', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', description: 'Text search across title, brand, model', schema: { type: 'string' } },
            { name: 'sort', in: 'query', schema: { type: 'string', enum: ['price_asc', 'price_desc', 'newest', 'oldest'] } },
            { name: 'minDaily', in: 'query', description: 'Min daily price in halalas', schema: { type: 'integer' } },
            { name: 'maxDaily', in: 'query', description: 'Max daily price in halalas', schema: { type: 'integer' } },
            { name: 'condition', in: 'query', description: 'Risk category filter', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 50 } },
            { name: 'offset', in: 'query', schema: { type: 'integer' } },
          ],
          responses: {
            '200': {
              description: 'Paginated asset listings',
              content: { 'application/json': { schema: { type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/Asset' } }, total: { type: 'integer' }, count: { type: 'integer' } } } } },
            },
          },
        },
      },
      '/assets/listings/{id}': {
        get: {
          tags: ['Assets'],
          summary: 'Get asset listing detail',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            '200': { description: 'Asset detail', content: { 'application/json': { schema: { $ref: '#/components/schemas/Asset' } } } },
            '404': { description: 'Asset not found' },
          },
        },
      },
      '/assets': {
        post: {
          tags: ['Assets'],
          summary: 'Submit a new asset (owner)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['category', 'brand', 'title', 'ownerDeclaredValueHalalas', 'submissionImages'], properties: { category: { type: 'string' }, brand: { type: 'string' }, model: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, ownerDeclaredValueHalalas: { type: 'integer' }, submissionImages: { type: 'array', items: { type: 'string', format: 'uri' } }, attributes: { type: 'object' } } } } },
          },
          responses: {
            '201': { description: 'Asset submitted', content: { 'application/json': { schema: { $ref: '#/components/schemas/Asset' } } } },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/assets/mine': {
        get: {
          tags: ['Assets'],
          summary: 'List my assets (owner)',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Owner assets', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Asset' } } } } },
          },
        },
      },
      '/assets/pending': {
        get: {
          tags: ['Assets'],
          summary: 'Pending approval queue (admin)',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Assets awaiting admin review', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Asset' } } } } },
          },
        },
      },
      '/assets/review': {
        post: {
          tags: ['Assets'],
          summary: 'Approve or reject an asset (admin)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['assetId', 'approved'], properties: { assetId: { type: 'integer' }, approved: { type: 'boolean' }, rejectionReason: { type: 'string' } } } } },
          },
          responses: {
            '200': { description: 'Updated asset', content: { 'application/json': { schema: { $ref: '#/components/schemas/Asset' } } } },
          },
        },
      },
      '/rentals/quote': {
        get: {
          tags: ['Rentals'],
          summary: 'Get rental price quote',
          description: 'Returns a price breakdown without creating a rental. No side effects.',
          parameters: [
            { name: 'assetId', in: 'query', required: true, schema: { type: 'integer' } },
            { name: 'startDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
            { name: 'endDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          ],
          responses: {
            '200': { description: 'Price quote', content: { 'application/json': { schema: { $ref: '#/components/schemas/RentalQuote' } } } },
            '404': { description: 'Asset not found' },
          },
        },
      },
      '/rentals': {
        post: {
          tags: ['Rentals'],
          summary: 'Create a rental (runs risk engine + creates legal commitment)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['assetId', 'startDate', 'endDate'], properties: { assetId: { type: 'integer' }, startDate: { type: 'string', format: 'date' }, endDate: { type: 'string', format: 'date' }, deliveryAddress: { type: 'object' } } } } },
          },
          responses: {
            '201': { description: 'Rental created with risk decision and legal commitment' },
            '422': { description: 'Risk rejected or legal state error' },
          },
        },
      },
      '/rentals/mine': {
        get: {
          tags: ['Rentals'],
          summary: 'List my rentals (renter)',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Renter rentals', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Rental' } } } } },
          },
        },
      },
      '/rentals/{id}': {
        get: {
          tags: ['Rentals'],
          summary: 'Get rental detail with legal, sanad, and payments',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            '200': { description: 'Full rental record' },
            '404': { description: 'Rental not found' },
          },
        },
      },
      '/rentals/{id}/cancel': {
        post: {
          tags: ['Rentals'],
          summary: 'Cancel a rental',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string' } } } } },
          },
          responses: {
            '200': { description: 'Rental cancelled' },
          },
        },
      },
      '/legal/sign': {
        post: {
          tags: ['Legal'],
          summary: 'Sign a legal commitment (renter)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['legalCommitmentId', 'acceptTerms'], properties: { legalCommitmentId: { type: 'integer' }, acceptTerms: { type: 'boolean', enum: [true] } } } } },
          },
          responses: {
            '200': { description: 'Commitment signed, Sanad issued' },
          },
        },
      },
      '/legal/sanads': {
        get: {
          tags: ['Legal'],
          summary: 'List all Sanad records (admin)',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'List of Sanad records' },
          },
        },
      },
      '/payments/charge': {
        post: {
          tags: ['Payments'],
          summary: 'Charge rental payment',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['rentalId'], properties: { rentalId: { type: 'integer' }, paymentMethodToken: { type: 'string' } } } } },
          },
          responses: {
            '200': { description: 'Payment captured with ZATCA invoice' },
          },
        },
      },
      '/payments/mine': {
        get: {
          tags: ['Payments'],
          summary: 'List my payments',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Payment history', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Payment' } } } } },
          },
        },
      },
      '/disputes': {
        post: {
          tags: ['Disputes'],
          summary: 'Open a dispute',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['rentalId', 'category', 'summary'], properties: { rentalId: { type: 'integer' }, category: { type: 'string', enum: ['damage', 'loss', 'fraud', 'service', 'billing'] }, summary: { type: 'string' }, evidence: { type: 'array', items: { type: 'string', format: 'uri' } } } } } },
          },
          responses: {
            '201': { description: 'Dispute opened', content: { 'application/json': { schema: { $ref: '#/components/schemas/Dispute' } } } },
          },
        },
        get: {
          tags: ['Disputes'],
          summary: 'List disputes (admin)',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Dispute list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Dispute' } } } } },
          },
        },
      },
      '/operations/summary': {
        get: {
          tags: ['Operations'],
          summary: 'Operations dashboard summary',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Operational metrics (active rentals, late returns, alerts)' },
          },
        },
      },
      '/admin/kpis': {
        get: {
          tags: ['Admin'],
          summary: 'Admin KPI dashboard',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Platform-wide KPIs (users, assets, revenue, disputes)' },
          },
        },
      },
      '/admin/revenue-trend': {
        get: {
          tags: ['Admin'],
          summary: '30-day revenue trend',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Daily revenue breakdown' },
          },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
