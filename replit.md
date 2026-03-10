# Short Hop - Product Notes

## Current Version (V4 - Community + FlexHop Update)
Full community layer with user tiers, ride vibe preferences, hop buddy ratings, trusted hoppers, and community feed.

## Features

### User Tiers
- **Standard ShortHop (Free)**: Core ride features, view community (read-only)
- **FlexHop (Premium)**: Post in community, follow users, message connections, save preferred drivers, trusted hoppers network

### Movement Options
- Walk ($0) - Healthy movement, transit routes
- Short Hop ($1-3) - Advance along driver's route, free membership
- Flex Hop ($2-5, $5/mo) - Small detours, dynamic pricing
- Power Hop ($15/mo) - Unlimited, anywhere to anywhere, "Reach for the Sky"

### Ride Vibe Preferences
- Quiet Ride - minimal conversation
- Friendly Chat - open to small talk (default)
- Community Mode - happy to connect

### Hop Buddy Rating System
- After ride completion: Great Hop, Good Ride, Neutral, Issue
- Optional: "Ride again" checkbox, "Follow Hop Buddy" button
- Builds trust network for better matching

### Trusted Hoppers (Follow System)
- Follow users after rides
- Mutual follows = "Trusted Hoppers"
- Displayed in driver dashboard with mutual/following distinction

### ShortHop Community Feed
- `/community` page with story feed
- Standard users: read-only
- FlexHop users: can post (500 char limit)
- Shows username, content, timestamp

### Notification System
- In-app notification center (bell icon with unread badge)
- Nearby hopper detection with simulated matching
- Browser notification API integration
- Notification settings with toggles

### Driver Features
- Routine routes (not shifts)
- Wheels reward system (1 mile = 1 Wheel)
- Flex Hop settings (detour distance/time)
- Reward Store (coffee, gas, meals, car wash)

### Early Network & Growth System
- Founding members: first 20 walkers = "Founding Hopper", first 20 drivers = "Founding Driver"
- Founders get lifetime FlexHop tier + badge (auto-assigned at registration)
- Welcome modal shown on first login with invite functionality (Web Share API)
- Network progress card on both dashboards showing driver/hopper/total counts
- Milestone progress bar with founder spots remaining
- Invite Friends button on both dashboards
- Growth notification toggle in Settings
- Schema fields: `isFounder`, `founderBadge`, `hasSeenWelcome` on users table

### Safety & Privacy
- Block/report user (backend-ready)
- Ride history logs
- Community features fully optional
- Profile privacy toggle in settings
- All social interaction opt-in

### Pages
- / - Home (landing page)
- /auth - Login/Register
- /dashboard - Walker or Driver dashboard
- /rewards - Reward Store (drivers)
- /community - Community feed
- /settings - Tier, ride vibe, notifications, privacy
- /privacy - Privacy policy
- /support - Support & safety info

## API Endpoints
- Auth: POST /api/login, /api/register, GET /api/me, POST /api/logout
- Routes: GET/POST /api/routes, DELETE /api/routes/:id
- Hops: GET /api/hops, POST /api/hops/request, POST /api/hops/:id/accept, /api/hops/:id/complete
- Rewards: GET /api/rewards, POST /api/rewards/:id/redeem
- Notifications: GET /api/notifications, POST /api/notifications/:id/read, POST /api/notifications/read-all
- Community: GET/POST /api/community
- Follows: GET /api/follows, POST /api/follow/:id, DELETE /api/follow/:id
- Ratings: POST /api/ratings
- Profile: PUT /api/profile/preferences, POST /api/profile/dismiss-welcome
- Driver: PUT /api/driver/flexibility
- Network: GET /api/network-stats

## Tech Stack
- Frontend: React + Vite + Tailwind + Framer Motion + TanStack Query
- Backend: Express + Passport.js (local strategy, session-based)
- Database: PostgreSQL + Drizzle ORM
- Validation: Zod schemas
- UI: Shadcn components

## Database Tables
- users (auth, wheels/credits, tier, rideVibe, driver flexibility)
- routine_routes (driver commutes)
- short_hops (ride requests)
- rewards / user_redemptions (reward store)
- notifications (user alerts)
- hop_buddy_ratings (post-ride ratings)
- follows (follow system with unique constraint)
- community_posts (community feed)

## Important Notes
- DB uses `credits` column but UI shows "Wheels" — do NOT rename
- `tier` column: "standard" (default) or "flexhop"
- `rideVibe` column: "quiet", "friendly_chat" (default), "community"
- Power Hop uses `hopType: "full_ride"` internally
- Test accounts: walker/password (walker), driver/password (driver)
