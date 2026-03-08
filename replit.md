# Short Hop - Product Notes

## Current Version (V1.2)
Updated to implement the Short Hop V1.2 blueprint with:
- Movement options: Walk, Short Hop, Flex Hop, Full Ride
- Pricing model: $1-3 for Short Hops, $2-5 for Flex Hops
- Driver flexibility settings for detours
- GPS navigation ready (UI prepared)

## Key Features

### Walkers
- Enter destination and see 4 movement options
- Request Short Hop ($1-3 per ride)
- Request Flex Hop for detours ($2-5)
- Fall back to Uber/Lyft for full rides

### Drivers
- Set up routine routes (Home→Office, etc.)
- Accept Short Hops along their route
- Optional Flex Hop mode for detours
- Earn credits (1 credit per mile)

### Database
- Users (with driver flexibility settings)
- RoutineRoutes (driver's regular commutes)
- ShortHops (individual hop requests with type and pricing)

## API Endpoints
- `POST /api/hops/request` - Request a movement option
- `PUT /api/driver/flexibility` - Update flex hop settings
- Other standard routes for auth, routes, hops

## Tech Stack
- Frontend: React + Vite + Tailwind + Framer Motion
- Backend: Express + Passport.js
- Database: PostgreSQL + Drizzle ORM
- Validation: Zod schemas

## Next Steps (MVP-Ready)
- GPS navigation UI implementation
- Real-time matching algorithm
- Payment processing integration
- Driver verification (ID + plate)
