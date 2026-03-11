# Short Hop - Product Notes

## Current Version (V6 - Pre-Launch Build)
Mobile-first native-app-like UI with bottom tab navigation, compact layouts, and streamlined dashboards. Full driver onboarding with verification, GO ACTIVE/OFFLINE toggle, admin panel, PWA support, and reliable notification system. Structured for future native iOS/Android conversion.

## Features

### User Tiers
- **Standard ShortHop (Free)**: Core ride features, view community (read-only)
- **FlexHop (Premium)**: Post in community, follow users, message connections, save preferred drivers, trusted hoppers network

### Movement Options
- Walk ($0) - Animated "Start Walking" card with driver count bubbles, green gradient, walking emoji animation
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
- Tipping system: $1/$2/$3/Custom tip options (min $0.50, 100% to driver)
- Auto-opens on completed hop for walkers (WalkerDashboard integration)
- Driver gets notification when tipped
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
- Floating green "Chat with Hyper" button (all users) opens DirectChat panel
- DirectChat uses `/api/founder-chat` endpoint, messages go to admin Founders tab
- **Donation section**: $0.50/$1/$5 + custom amounts, optional message, orange/amber gradient card
  - POST /api/donate endpoint, min $0.50, stored in `donations` table

### Notification System
- In-app notification center in bottom tab bar (Alerts tab)
- Flash notifications (FlashNotification.tsx): centered animated spring popups, auto-dismiss 1.2s
- Browser notification API integration
- Notification settings with toggles

### Driver Onboarding & Verification
- Multi-step wizard at `/driver-onboarding`:
  1. Vehicle info (make, model, color, plate)
  2. License photo upload
  3. Identity selfie
  4. Accept driver agreement/terms
  5. Enable notifications prompt
  6. Confirmation - application submitted
- Driver applications tracked in `driver_applications` table
- Admin reviews and approves/rejects applications
- Only verified drivers can go active

### GO ACTIVE / GO OFFLINE Toggle
- Prominent toggle on DriverDashboard (green/red)
- Only available to verified drivers
- When active: starts location broadcasting, visible to hoppers
- When offline: stops broadcasting, hidden from matching
- Shows status badges: Active (green pulse), Offline, Unverified/Pending

### Admin Panel (Super Admin: HyperFM only)
- `/admin` route (restricted to isAdmin users)
- 9 Tabs: Overview, Inbox (unread badge), Reports (open badge), Users, Apps, Active Drivers, Logs, Notify, Founders
- Overview: stats cards + alert banners for unread inbox/open reports/pending apps
- Inbox: view/reply to user contact messages, sends notification on reply
- Reports: view/resolve user reports (safety, bugs, harassment)
- Users: list with disable/enable toggle + block (with reason) + permanent delete (with FK-safe cascade)
- Applications: approve/reject driver applications
- Active Drivers: live list of currently active drivers
- Logs: recent ride request/acceptance logs
- Notify: "Notify All Users" (title + message to all) and "Broadcast to Drivers" (active drivers)
- Founders: direct chat with founding members (messages notify admin)
- Dashboard button for quick role switching back to driver view

### Driver Features
- Anyone can register as a driver (chosen at registration)
- Multi-step verification required before going active
- Routine routes (not shifts)
- Wheels reward system (1 mile driven = 1 Wheel for drivers, 0.5 Wheels/mile for riders, min 1)
- Riders can pay for rides with Wheels (toggle on Short Hop card)
- Rewards: Starbucks gift cards, Shell gas cards, Cash gift cards (5-25 Wheels)
- Wheels can be redeemed for rewards or used to pay for rides
- Flex Hop settings (detour distance/time)
- Reward Store (coffee, gas, meals, car wash)

### Rider Request Flow
- After requesting: "Searching for active drivers..." with active driver count
- When matched: shows driver info (name, vehicle make/model/color, license plate)
- No active drivers: "No drivers nearby right now" message
- Vehicle info fetched from `/api/hops/:id/driver-info`

### PWA Support
- manifest.json: start_url `/dashboard`, display standalone, theme colors
- Service worker (sw.js): offline shell caching
- Registered in index.html with apple-mobile-web-app-capable meta tags
- "Add to Home Screen" support on mobile browsers

### Subscription System
- **Free tier**: Short Hop only (no subscription required)
- **Flex Hop ($5/mo)**: Allows small driver detours, dynamic pricing
- **Power Hop ($15/mo)**: Complete mobility freedom, unlimited rides
- First 50 founding members get Flex Hop free forever
- Server enforces subscription check on `POST /api/hops/request` (403 if not subscribed)

### App-Like UI
- **Bottom Tab Bar**: Home / Community / Board / Settings / Alerts + Admin "A" button (red glow, admin-only) (fixed at bottom, only for authenticated users)
- **NavBar**: Hidden for authenticated users (only shows for unauthenticated/landing page)
- **Compact layouts**: All dashboard pages use `max-w-lg mx-auto` with tight padding
- **App-style headers**: "Hey, {username}" greeting with small ShortHop label
- **Mobile-first spacing**: Reduced padding, smaller typography, compact cards

### Growth Features & Viral Expansion
- **Hop Streak System**: Tracks consecutive hops per user, resets after 48h inactivity
- **Achievement Badges**: Automatically awarded at milestones (3, 10, 25, 50, 100 hops)
- **Referral System**: Unique referral codes per user, referrer gets 5 Wheels, new user gets 3 Wheels
- **Leaderboard**: /leaderboard page with 3 tabs: Most Hops, Top Drivers, Community Hoppers
- **Shareable Ride Cards**: Post-ride share option via Web Share API

### Early Network & Growth System
- Founding members: first 50 total (unified pool, not split by role)
- Founders get lifetime FlexHop tier + badge
- Network progress card on dashboards
- Invite Friends button on dashboards

### Saved Routes (Walker)
- Save/delete usual destinations with quick-select chips
- Stored in `walker_routes` table

### Home Screen Widget System (iOS-Ready)
- `/widget` page — preview of Directional Flow widget in 3 sizes (Small, Medium, Large)
- Driver accounts = green theme, Hopper accounts = blue theme, important numbers = orange
- **Small (170x170)**: direction + demand count
- **Medium (364x170)**: direction demand + nearby activity + drivers in area
- **Large (364x376)**: all stats + quick action button ("Go Available" for drivers / "Request Hop" for hoppers)
- Data served from `GET /api/widget/data` (updates every 30s)
- Shows directional demand based on user's saved routes
- Accessible from both Walker and Driver dashboards via "Widget Preview" card

### Founder System & Chat
- Founder cap: **50** total (first 50 users get lifetime FlexHop tier + founder badge)
- Founder Chat: direct message channel between founders and admin (HyperFM)
- Messages from founders automatically notify admin via notification system
- Admin replies visible in chat with purple "admin" styling
- `founder_messages` table stores all chat history
- Accessible from dashboards (founder-only) and Admin panel (Founders tab)

### Contact & Report System
- "Contact ShortHop" form in Settings (category, subject, message) → POST /api/contact
- "Report an Issue" form in Settings (category, description) → POST /api/report
- Messages/reports appear in admin inbox/reports tabs
- Admin can reply (sends notification back to user) and resolve reports

### Safety & Privacy
- Block/report user (backend-ready + report form)
- Ride history logs
- Community features fully optional
- Profile privacy toggle in settings
- Comprehensive Privacy Policy & Terms of Service at /privacy

### Pages
- / - Home (landing page)
- /auth - Login/Register
- /dashboard - Walker or Driver dashboard
- /driver-onboarding - Multi-step driver verification wizard
- /admin - Admin panel (restricted)
- /rewards - Reward Store (drivers)
- /community - Community feed
- /settings - Tier, ride vibe, notifications, privacy
- /leaderboard - Leaderboard (3 tabs)
- /widget - Widget preview (iOS home screen widget sizes)
- /privacy - Privacy policy & Terms of Service
- /support - Support & safety info
- /artist - Artist page

## API Endpoints
- Auth: POST /api/login, /api/register, GET /api/me, POST /api/logout
- Routes: GET/POST /api/routes, DELETE /api/routes/:id
- Hops: GET /api/hops, POST /api/hops/request, POST /api/hops/:id/accept, /api/hops/:id/complete, POST /api/hops/:id/cancel
- Location: POST /api/location, GET /api/hops/:id/tracking
- Pickup Guidance: GET /api/pickup-guidance?lat=&lng=
- Rewards: GET /api/rewards, POST /api/rewards/:id/redeem
- Notifications: GET /api/notifications, POST /api/notifications/:id/read, POST /api/notifications/read-all
- Community: GET/POST /api/community
- Follows: GET /api/follows, POST /api/follow/:id, DELETE /api/follow/:id
- Ratings: POST /api/ratings
- Profile: PUT /api/profile/preferences, POST /api/profile/dismiss-welcome
- Driver Onboarding: POST /api/driver/profile, POST /api/driver/apply, GET /api/driver/status, POST /api/driver/active
- Driver Info: GET /api/hops/:id/driver-info, POST /api/hops/:id/decline
- Admin: GET /api/admin/stats, GET /api/admin/users, GET /api/admin/drivers, GET /api/admin/applications, POST /api/admin/applications/:id/review, POST /api/admin/users/:id/disable, POST /api/admin/users/:id/delete, GET /api/admin/logs, POST /api/admin/notify-drivers, GET /api/admin/inbox, POST /api/admin/inbox/:id/reply, GET /api/admin/reports, POST /api/admin/reports/:id/resolve
- Contact/Report: POST /api/contact, GET /api/contact, POST /api/report
- Tipping: POST /api/hops/:id/tip (tipCents in body, min $0.50)
- Donations: POST /api/donate (amountCents, message)
- Widget: GET /api/widget/data
- Founder Chat: GET /api/founder-chat, POST /api/founder-chat
- Walker Routes: GET /api/walker-routes, POST /api/walker-routes, DELETE /api/walker-routes/:id
- Network: GET /api/network-stats
- Subscription: POST /api/subscription, DELETE /api/subscription

### GPS/Map Visuals
- Leaflet with CartoDB dark tiles
- Pulsing blue dot for user location, green rounded-square for driver with car emoji
- Animated blue route lines with glow effect + directional arrows (3 arrows along path)
- Dashed animated overlay line (CSS keyframe dash animation)
- Distance overlay badge (green pill, top-right corner)
- Pickup spot markers with green pin icons + shadow
- Map has gradient fade overlays at top/bottom edges

### UI Theme
- Nature-inspired greens (primary), orange (secondary), blue (accent)
- CartoDB dark map tiles; blue=rider, green=driver
- Framer Motion animations throughout
- Game-card utility class with rounded-2xl, border-2, hover lift
- Flash notification system: showFlash(emoji, text, type) — types: success/error/info/welcome

## Tech Stack
- Frontend: React + Vite + Tailwind + Framer Motion + TanStack Query
- Backend: Express + Passport.js (local strategy, session-based)
- Database: PostgreSQL + Drizzle ORM
- Session store: PostgreSQL-backed via `connect-pg-simple` (30-day persistent sessions)
- Validation: Zod schemas
- UI: Shadcn components
- PWA: manifest.json + service worker (sw.js)

## Database Tables
- users (auth, wheels/credits, tier, rideVibe, driver flexibility, founder status, driver verification fields, admin/disabled flags)
- driver_applications (driver onboarding tracking: userId, status, submittedAt, reviewedAt, reviewedBy, notes)
- routine_routes (driver commutes)
- short_hops (ride requests, tipCents column for driver tips)
- donations (userId, amountCents, message, createdAt)
- rewards / user_redemptions (reward store)
- notifications (user alerts)
- hop_buddy_ratings (post-ride ratings)
- follows (follow system with unique constraint)
- community_posts (community feed)
- walker_routes (saved walker destinations)
- user_badges (achievement badges)
- expansion_waitlist (city expansion signups)
- contact_messages (user contact form submissions, admin replies)
- reports (user-submitted reports: safety, bugs, harassment)
- founder_messages (founder-to-admin direct chat)

## Important Notes
- DB uses `credits` column but UI shows "Wheels" — do NOT rename
- `tier` column: "standard" (default) or "flexhop"
- `rideVibe` column: "quiet", "friendly_chat" (default), "community"
- Power Hop uses `hopType: "full_ride"` internally
- Test accounts: walker/password (walker, has flex_hop subscription), driver/password (driver, NOT admin), HyperFM (super admin + driver)
- Super Admin: HyperFM is the ONLY admin account; `driver` account has isAdmin=false
- Founding members: 50 total unified pool (stored in `isFounder` field)
- Founder badges: "Founding Hopper" or "Founding Driver"
- Drive Mode REMOVED — anyone registers as driver at signup
- Flash system: `showFlash(emoji, text, type)` — import from `@/components/FlashNotification`
- Driver verification fields added via SQL (not db:push): driverVerified, isActive, agreedToTerms, isAdmin, isDisabled
