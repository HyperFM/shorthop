# Short Hop - Product Notes

## Current Version (V3 with App Updates)
Full V3 implementation with Wheels economy, reward store, and updated movement options:
- 4 movement options: Walk ($0), Short Hop ($1-3), Flex Hop ($2-5), Power Hop ($15/month)
- Power Hop is the premium unlimited option with glowing orange/green design
- Wheels economy replaces credits - drivers earn and redeem rewards
- Momentum Suggestions feature shows suggested trips
- All rides stay within Short Hop (no external app redirects)

## Key Features

### Walkers
- Choose movement option based on urgency and budget
- Walk ($0) - Encourages healthy movement, shows transit routes
- Short Hop ($1-3) - Advance along driver's routine route
- Flex Hop ($2-5, $5/month) - Request small detours with dynamic pricing
- Power Hop ($15/month) - Unlimited rides, priority matching, bonus wheels for drivers
- Momentum Suggestions showing common routes (Home→Work, etc.)

### Drivers
- Register routine routes (not shifts) - set your own schedule
- Wheels reward system: 1 mile = 1 Wheel
- Flex Hop toggle: enable/disable small detours with distance/time limits
- Reward Store: redeem Wheels for coffee, gas, meals, car wash

### Database
- Users (with driver flexibility settings, wheels/credits)
- RoutineRoutes (driver's regular commutes)
- ShortHops (hop requests with type, status, pricing)
- Rewards (categories: coffee, gas, meal, carwash)
- UserRedemptions (tracks redeemed codes)

## API Endpoints
- Auth: POST /api/login, /api/register, GET /api/me, POST /api/logout
- Routes: GET/POST /api/routes, DELETE /api/routes/:id
- Hops: GET /api/hops, POST /api/hops/request, POST /api/hops/:id/accept, /api/hops/:id/complete
- Rewards: GET /api/rewards, POST /api/rewards/:id/redeem
- Driver: PUT /api/driver/flexibility

## Tech Stack
- Frontend: React + Vite + Tailwind + Framer Motion + TanStack Query
- Backend: Express + Passport.js (local strategy)
- Database: PostgreSQL + Drizzle ORM
- Validation: Zod schemas

## Visual Design
- Nature-inspired colors: green (primary), orange (secondary), blue (accent)
- Power Hop glows with orange-green gradient
- Momentum Suggestions card above search with "Suggested Trips"
- Rounded cards, smooth animations, clean typography

## Future Features (Blueprint)
- Routine Detection: Auto-learn common routes based on user patterns
- Live Route Awareness: Notify walkers when drivers appear on their route
- Visual Motion Indicator: Animated hop icons showing driver movement
- Driver Verification: ID + license plate checks
- Real-time GPS navigation with voice guidance
- Brand Partnership Portal for businesses to offer rewards
- Sponsored rewards with promotions

## Test Accounts
- Walker: username `walker`, password `password`
- Driver: username `driver`, password `password`

## Notable Implementation Decisions
- Using `credits` column in DB but displaying as "Wheels" in UI
- Power Hop uses same `full_ride` hop type internally
- Momentum Suggestions currently shows static example (backend would provide real suggestions)
- Mobile-responsive design with grid layout adjustments
