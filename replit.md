# Short Hop - Product Notes

## Current Version (V5 - App-Like UI Redesign)
Mobile-first native-app-like UI with bottom tab navigation, compact layouts, and streamlined dashboards. Drive Mode removed — anyone can register as a driver.

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
- In-app notification center in bottom tab bar (Alerts tab)
- Nearby hopper detection with simulated matching
- Browser notification API integration
- Notification settings with toggles

### Driver Features
- Anyone can register as a driver (chosen at registration, requires background check)
- NOT a subscription feature — Drive Mode removed
- Routine routes (not shifts)
- Wheels reward system (1 mile = 1 Wheel)
- Flex Hop settings (detour distance/time)
- Reward Store (coffee, gas, meals, car wash)

### Subscription System
- **Free tier**: Short Hop only (no subscription required)
- **Flex Hop ($5/mo)**: Allows small driver detours, dynamic pricing
- **Power Hop ($15/mo)**: Complete mobility freedom, unlimited rides
- First 25 founding members get Flex Hop free forever
- Server enforces subscription check on `POST /api/hops/request` (403 if not subscribed)
- Subscribe/cancel endpoints: `POST /api/subscription`, `DELETE /api/subscription`
- Subscription management in Settings page (view active plan, cancel)
- Schema fields: `subscription` (null | "flex_hop" | "power_hop"), `subscriptionStartDate` on users table

### App-Like UI
- **Bottom Tab Bar**: Home / Community / Board / Settings / Alerts (fixed at bottom, only for authenticated users)
- **NavBar**: Hidden for authenticated users (only shows for unauthenticated/landing page)
- **Compact layouts**: All dashboard pages use `max-w-lg mx-auto` with tight padding
- **App-style headers**: "Hey, {username}" greeting with small ShortHop label
- **Mobile-first spacing**: Reduced padding, smaller typography, compact cards

### Growth Features & Viral Expansion
- **Hop Streak System**: Tracks consecutive hops per user, resets after 48h inactivity
- **Achievement Badges**: Automatically awarded at milestones (3, 10, 25, 50, 100 hops), stored in `user_badges` table
- **Referral System**: Unique referral codes per user (generated at registration), referrer gets 5 Wheels, new user gets 3 Wheels
- **Leaderboard**: /leaderboard page with 3 tabs: Most Hops, Top Drivers (by Wheels), Community Hoppers (by posts)
- **Shareable Ride Cards**: Post-ride share option via Web Share API

### Early Network & Growth System
- Founding members: first 25 total (unified pool, not split by role)
- Founders get lifetime FlexHop tier + badge (auto-assigned at registration)
- Network progress card on dashboards showing driver/hopper/total counts
- Milestone progress bar with founder spots remaining
- Invite Friends button on dashboards

### Saved Routes (Walker)
- Save/delete usual destinations with quick-select chips
- Stored in `walker_routes` table
- API: GET/POST /api/walker-routes, DELETE /api/walker-routes/:id

### Safety & Privacy
- Block/report user (backend-ready)
- Ride history logs
- Community features fully optional
- Profile privacy toggle in settings

### Pages
- / - Home (landing page)
- /auth - Login/Register
- /dashboard - Walker or Driver dashboard
- /rewards - Reward Store (drivers)
- /community - Community feed
- /settings - Tier, ride vibe, notifications, privacy
- /leaderboard - Leaderboard (3 tabs)
- /privacy - Privacy policy
- /support - Support & safety info
- /artist - Artist page (HyperFM bio, photo, links)

## API Endpoints
- Auth: POST /api/login, /api/register, GET /api/me, POST /api/logout
- Routes: GET/POST /api/routes, DELETE /api/routes/:id
- Hops: GET /api/hops, POST /api/hops/request, POST /api/hops/:id/accept, /api/hops/:id/complete, POST /api/hops/:id/cancel
- Location: POST /api/location (broadcast GPS), GET /api/hops/:id/tracking (get partner distance/direction)
- Pickup Guidance: GET /api/pickup-guidance?lat=&lng=
- Rewards: GET /api/rewards, POST /api/rewards/:id/redeem
- Notifications: GET /api/notifications, POST /api/notifications/:id/read, POST /api/notifications/read-all
- Community: GET/POST /api/community
- Follows: GET /api/follows, POST /api/follow/:id, DELETE /api/follow/:id
- Ratings: POST /api/ratings
- Profile: PUT /api/profile/preferences, POST /api/profile/dismiss-welcome
- Driver: PUT /api/driver/flexibility
- Walker Routes: GET /api/walker-routes, POST /api/walker-routes, DELETE /api/walker-routes/:id
- Network: GET /api/network-stats
- Subscription: POST /api/subscription, DELETE /api/subscription

### UI Theme
- Nature-inspired greens (primary), orange (secondary), blue (accent)
- CartoDB dark map tiles; blue=rider, green=driver
- Framer Motion animations throughout
- Game-card utility class with rounded-2xl, border-2, hover lift
- XP-bar with rainbow gradient for progress indicators
- Emoji headers and floating emoji backgrounds

## Tech Stack
- Frontend: React + Vite + Tailwind + Framer Motion + TanStack Query
- Backend: Express + Passport.js (local strategy, session-based)
- Database: PostgreSQL + Drizzle ORM
- Session store: PostgreSQL-backed via `connect-pg-simple` (30-day persistent sessions)
- Validation: Zod schemas
- UI: Shadcn components

## Database Tables
- users (auth, wheels/credits, tier, rideVibe, driver flexibility, founder status)
- routine_routes (driver commutes)
- short_hops (ride requests)
- rewards / user_redemptions (reward store)
- notifications (user alerts)
- hop_buddy_ratings (post-ride ratings)
- follows (follow system with unique constraint)
- community_posts (community feed)
- walker_routes (saved walker destinations)
- user_badges (achievement badges)
- expansion_waitlist (city expansion signups)

## Important Notes
- DB uses `credits` column but UI shows "Wheels" — do NOT rename
- `tier` column: "standard" (default) or "flexhop"
- `rideVibe` column: "quiet", "friendly_chat" (default), "community"
- Power Hop uses `hopType: "full_ride"` internally
- Test accounts: walker/password (walker, has flex_hop subscription), driver/password (driver)
- Founding members: 25 total unified pool (stored in `isFounder` field)
- Founder badges: "Founding Hopper" or "Founding Driver"
- Drive Mode REMOVED — anyone registers as driver at signup
