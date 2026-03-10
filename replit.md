# Short Hop - Product Notes

## Current Version (V3 with Notifications)
Full V3 with Wheels economy, reward store, notification system, and location awareness:
- 4 movement options: Walk, Short Hop, Flex Hop, Power Hop
- Wheels economy: drivers earn and redeem rewards
- Smart notification system with nearby hopper detection
- In-app notification center with brand voice alerts
- Notification settings with toggle controls
- Privacy policy and support/safety pages

## Features

### Movement Options
- Walk ($0) - Healthy movement, transit routes
- Short Hop ($1-3) - Advance along driver's route, free membership
- Flex Hop ($2-5, $5/mo) - Small detours, dynamic pricing
- Power Hop ($15/mo) - Unlimited, anywhere to anywhere, "Reach for the Sky"

### Notification System
- In-app notification center (bell icon in navbar with unread badge)
- Nearby hopper detection with simulated matching
- Brand voice alerts: "Hop Hop!", "A Hopper is nearby"
- Browser notification API integration
- Auto-dismiss floating alerts for drivers
- Notification settings page with toggles (ride, route, hopper, community alerts)

### Driver Features
- Routine routes (not shifts)
- Wheels reward system (1 mile = 1 Wheel)
- Flex Hop settings (detour distance/time)
- Reward Store (coffee, gas, meals, car wash)

### Pages
- / - Home (landing page with tagline)
- /auth - Login/Register
- /dashboard - Walker or Driver dashboard
- /rewards - Reward Store (drivers)
- /settings - Notification preferences
- /privacy - Privacy policy
- /support - Support & safety info

## API Endpoints
- Auth: POST /api/login, /api/register, GET /api/me, POST /api/logout
- Routes: GET/POST /api/routes, DELETE /api/routes/:id
- Hops: GET /api/hops, POST /api/hops/request, POST /api/hops/:id/accept, /api/hops/:id/complete
- Rewards: GET /api/rewards, POST /api/rewards/:id/redeem
- Notifications: GET /api/notifications, POST /api/notifications/:id/read, POST /api/notifications/read-all
- Driver: PUT /api/driver/flexibility

## Tech Stack
- Frontend: React + Vite + Tailwind + Framer Motion + TanStack Query
- Backend: Express + Passport.js (local strategy, session-based)
- Database: PostgreSQL + Drizzle ORM
- Validation: Zod schemas
- UI: Shadcn components

## Database Tables
- users (auth, wheels/credits, driver flexibility settings)
- routine_routes (driver's regular commutes)
- short_hops (hop requests with type, status, pricing)
- rewards (coffee, gas, meal, carwash categories)
- user_redemptions (redeemed reward codes)
- notifications (user alerts with type, read status)

## Test Accounts
- Walker: username `walker`, password `password`
- Driver: username `driver`, password `password`
