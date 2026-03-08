import { z } from 'zod';
import { insertUserSchema, insertRoutineRouteSchema, insertShortHopSchema, users, routineRoutes, shortHops, rewards } from './schema';

export { insertUserSchema, insertRoutineRouteSchema, insertShortHopSchema };

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/login' as const,
      input: insertUserSchema,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    register: {
      method: 'POST' as const,
      path: '/api/register' as const,
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout' as const,
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
  },
  routes: {
    list: {
      method: 'GET' as const,
      path: '/api/routes' as const,
      responses: {
        200: z.array(z.custom<typeof routineRoutes.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/routes' as const,
      input: insertRoutineRouteSchema.omit({ driverId: true }),
      responses: {
        201: z.custom<typeof routineRoutes.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/routes/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  hops: {
    list: {
      method: 'GET' as const,
      path: '/api/hops' as const,
      responses: {
        200: z.array(z.custom<typeof shortHops.$inferSelect>()),
      },
    },
    requestMovement: {
      method: 'POST' as const,
      path: '/api/hops/request' as const,
      input: z.object({
        startLocation: z.string(),
        endLocation: z.string(),
        hopType: z.enum(["walk", "short_hop", "flex_hop", "full_ride"]),
        distanceMiles: z.string().optional(),
      }),
      responses: {
        201: z.custom<typeof shortHops.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    accept: {
      method: 'POST' as const,
      path: '/api/hops/:id/accept' as const,
      responses: {
        200: z.custom<typeof shortHops.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    complete: {
      method: 'POST' as const,
      path: '/api/hops/:id/complete' as const,
      input: z.object({
        distanceMiles: z.string(),
      }),
      responses: {
        200: z.custom<typeof shortHops.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  rewards: {
    list: {
      method: 'GET' as const,
      path: '/api/rewards' as const,
      responses: {
        200: z.array(z.custom<typeof rewards.$inferSelect>()),
      },
    },
    redeem: {
      method: 'POST' as const,
      path: '/api/rewards/:id/redeem' as const,
      responses: {
        201: z.object({
          code: z.string(),
          reward: z.custom<typeof rewards.$inferSelect>(),
        }),
        400: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
  },
  driver: {
    updateFlexibility: {
      method: 'PUT' as const,
      path: '/api/driver/flexibility' as const,
      input: z.object({
        isFlexibleDriver: z.boolean(),
        maxDetourDistance: z.string().optional(),
        maxDetourTime: z.number().optional(),
        detourAvailable: z.boolean().optional(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
