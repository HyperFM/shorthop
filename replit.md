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

### Subscription System
- **Free tier**: Short Hop only (no subscription required)
- **Flex Hop ($5/mo)**: Requires active subscription — allows small driver detours, dynamic pricing
- **Power Hop ($15/mo)**: Requires active subscription — complete mobility freedom, unlimited rides
- Server enforces subscription check on `POST /api/hops/request` (403 if not subscribed)
- Subscribe/cancel endpoints: `POST /api/subscription`, `DELETE /api/subscription`
- Subscription management in Settings page (view active plan, cancel)
- Schema fields: `subscription` (null | "flex_hop" | "power_hop"), `subscriptionStartDate` on users table

### Growth Features & Viral Expansion
- **Hop Streak System**: Tracks consecutive hops per user, resets after 48h inactivity
- **Achievement Badges**: Automatically awarded at milestones (3, 10, 25, 50, 100 hops), stored in `user_badges` table
- **Referral System**: Unique referral codes per user (generated at registration), referrer gets 5 Wheels, new user gets 3 Wheels
- **Leaderboard**: /leaderboard page with 3 tabs: Most Hops, Top Drivers (by Wheels), Community Hoppers (by posts)
- **Busy Route Notifications**: Simulated notifications when hoppers are active along driver routes (max 5/day)
- **Shareable Ride Cards**: Post-ride share option via Web Share API
- **Notification Limits**: Max 5 notifications per day per user enforced server-side
- Schema fields added: `hopStreak`, `totalHops`, `lastHopDate`, `referralCode`, `referredBy` on users table

### City Availability & Expansion System
- City field on registration form ("What city are you in?")
- Lexington users proceed to normal onboarding
- Non-Lexington users see expansion modal explaining city-by-city rollout
- "Notify Me" button collects phone number for expansion waitlist
- Expansion waitlist stored in `expansion_waitlist` table (username, city, phone)
- API endpoints: GET /api/expansion/check-city, POST /api/expansion/waitlist

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
- /dashboard - Walker or Driver dashboard (video animation while searching, timer on match, vibration + first-time tooltip)
- /rewards - Reward Store (drivers)
- /community - Community feed
- /settings - Tier, ride vibe, notifications, privacy
- /privacy - Privacy policy
- /support - Support & safety info
- /artist - Artist page (HyperFM bio, photo, links)

## API Endpoints
- Auth: POST /api/login, /api/register, GET /api/me, POST /api/logout
- Routes: GET/POST /api/routes, DELETE /api/routes/:id
- Hops: GET /api/hops, POST /api/hops/request, POST /api/hops/:id/accept, /api/hops/:id/complete
- Location: POST /api/location (broadcast GPS), GET /api/hops/:id/tracking (get partner distance/direction)
- Pickup Guidance: GET /api/pickup-guidance?lat=&lng= (nearest 3 main road pickup spots in Lexington)
- Rewards: GET /api/rewards, POST /api/rewards/:id/redeem
- Notifications: GET /api/notifications, POST /api/notifications/:id/read, POST /api/notifications/read-all
- Community: GET/POST /api/community
- Follows: GET /api/follows, POST /api/follow/:id, DELETE /api/follow/:id
- Ratings: POST /api/ratings
- Profile: PUT /api/profile/preferences, POST /api/profile/dismiss-welcome
- Driver: PUT /api/driver/flexibility
- Network: GET /api/network-stats

### Fun/Game-Like UI Theme
- All pages use Framer Motion animations (bounce-in, float, wiggle, slide-up, shimmer)
- Stat cards use gradient icon circles with emojis (🔥 Hop Streak, ⭐ Total Hops, 🛞 Wheels)
- Game-card utility class with rounded-2xl, border-2, hover lift
- XP-bar with rainbow gradient for progress indicators
- Emoji headers throughout (🗺️ Where to?, 🚗 Driver Dashboard, 🏆 Leaderboard, etc.)
- Floating emoji background on Home page
- Motion hover/tap effects on buttons (scale bounce)
- Leaderboard uses medal emojis (🥇🥈🥉) and animated trophy
- Empty states use bouncing emoji animations
- Gradient CTA buttons (primary-to-accent)

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
