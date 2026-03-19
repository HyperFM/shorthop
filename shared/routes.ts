import { z } from 'zod';
import { insertUserSchema, insertRoutineRouteSchema, insertShortHopSchema, insertExpansionWaitlistSchema, users, routineRoutes, shortHops, rewards, notifications, communityPosts, hopBuddyRatings, follows, expansionWaitlist } from './schema';

export { insertUserSchema, insertRoutineRouteSchema, insertShortHopSchema };

export type User = typeof users.$inferSelect;

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
        startLat: z.string().optional(),
        startLng: z.string().optional(),
        endLat: z.string().optional(),
        endLng: z.string().optional(),
        paymentIntentId: z.string().optional(),
        paymentStatus: z.string().optional(),
        paymentAmountCents: z.number().optional(),
        departureTime: z.string().optional(),
        arrivalDeadline: z.string().optional(),
        timeWindowExpiry: z.string().optional(),
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
  notifications: {
    list: {
      method: 'GET' as const,
      path: '/api/notifications' as const,
      responses: {
        200: z.array(z.custom<typeof notifications.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    markRead: {
      method: 'POST' as const,
      path: '/api/notifications/:id/read' as const,
      responses: {
        200: z.custom<typeof notifications.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    markAllRead: {
      method: 'POST' as const,
      path: '/api/notifications/read-all' as const,
      responses: {
        200: z.object({ message: z.string() }),
        401: errorSchemas.unauthorized,
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
  community: {
    list: {
      method: 'GET' as const,
      path: '/api/community' as const,
      responses: {
        200: z.array(z.object({
          id: z.number(),
          userId: z.number(),
          content: z.string(),
          createdAt: z.string().nullable(),
          username: z.string(),
        })),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/community' as const,
      input: z.object({
        content: z.string().min(1).max(500),
      }),
      responses: {
        201: z.custom<typeof communityPosts.$inferSelect>(),
        401: errorSchemas.unauthorized,
        403: z.object({ message: z.string() }),
      },
    },
  },
  follows: {
    list: {
      method: 'GET' as const,
      path: '/api/follows' as const,
      responses: {
        200: z.array(z.object({
          id: z.number(),
          userId: z.number(),
          username: z.string(),
          isMutual: z.boolean(),
        })),
      },
    },
    follow: {
      method: 'POST' as const,
      path: '/api/follow/:id' as const,
      responses: {
        201: z.custom<typeof follows.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
    unfollow: {
      method: 'DELETE' as const,
      path: '/api/follow/:id' as const,
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
  },
  ratings: {
    create: {
      method: 'POST' as const,
      path: '/api/ratings' as const,
      input: z.object({
        tripId: z.number(),
        ratedUserId: z.number(),
        rating: z.enum(["great_hop", "good_ride", "neutral", "issue"]),
        wantRideAgain: z.boolean().optional(),
      }),
      responses: {
        201: z.custom<typeof hopBuddyRatings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  profile: {
    updatePreferences: {
      method: 'PUT' as const,
      path: '/api/profile/preferences' as const,
      input: z.object({
        rideVibe: z.enum(["quiet", "friendly_chat", "community"]).optional(),
        tier: z.enum(["standard", "flexhop"]).optional(),
        hopperFlexRange: z.enum(["0", "0.25", "0.5", "1"]).optional(),
        driverFlexRange: z.enum(["0", "0.25", "0.5", "1"]).optional(),
        isFlexibleDriver: z.boolean().optional(),
        hopperDropoffFlex: z.enum(["exact", "close_enough"]).optional(),
        sharedCommute: z.boolean().optional(),
        modeLock: z.enum(["none", "hopper_only", "driver_only"]).optional(),
        allowDetourDrivers: z.boolean().optional(),
        magicGpsEnabled: z.boolean().optional(),
        flowModeEnabled: z.boolean().optional(),
        seatsNeeded: z.number().int().min(1).max(6).optional(),
        availableSeats: z.number().int().min(1).max(6).optional(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    dismissWelcome: {
      method: 'POST' as const,
      path: '/api/profile/dismiss-welcome' as const,
      responses: {
        200: z.object({ message: z.string() }),
        401: errorSchemas.unauthorized,
      },
    },
  },
  network: {
    stats: {
      method: 'GET' as const,
      path: '/api/network-stats' as const,
      responses: {
        200: z.object({
          totalUsers: z.number(),
          totalDrivers: z.number(),
          totalHoppers: z.number(),
          nextMilestone: z.number(),
          foundingHoppersRemaining: z.number(),
          foundingDriversRemaining: z.number(),
        }),
      },
    },
  },
  leaderboard: {
    get: {
      method: 'GET' as const,
      path: '/api/leaderboard' as const,
      responses: {
        200: z.object({
          mostHops: z.array(z.object({ username: z.string(), totalHops: z.number(), isDriver: z.boolean().nullable() })),
          topDrivers: z.array(z.object({ username: z.string(), credits: z.number() })),
          communityHoppers: z.array(z.object({ username: z.string(), postCount: z.number() })),
        }),
      },
    },
  },
  badges: {
    get: {
      method: 'GET' as const,
      path: '/api/profile/badges' as const,
      responses: {
        200: z.array(z.object({ id: z.number(), badge: z.string(), earnedAt: z.string().nullable() })),
        401: errorSchemas.unauthorized,
      },
    },
  },
  referral: {
    apply: {
      method: 'POST' as const,
      path: '/api/referral/apply' as const,
      input: z.object({ referralCode: z.string() }),
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
      },
    },
  },
  subscription: {
    subscribe: {
      method: 'POST' as const,
      path: '/api/subscription' as const,
      input: z.object({
        plan: z.enum(["flex_hop", "power_hop"]),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    cancel: {
      method: 'DELETE' as const,
      path: '/api/subscription' as const,
      responses: {
        200: z.object({ message: z.string() }),
        401: errorSchemas.unauthorized,
      },
    },
  },
  expansion: {
    checkCity: {
      method: 'GET' as const,
      path: '/api/expansion/check-city' as const,
      responses: {
        200: z.object({ available: z.boolean(), city: z.string() }),
      },
    },
    joinWaitlist: {
      method: 'POST' as const,
      path: '/api/expansion/waitlist' as const,
      input: z.object({ username: z.string(), city: z.string(), phone: z.string() }),
      responses: {
        201: z.object({ message: z.string() }),
        400: errorSchemas.validation,
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
