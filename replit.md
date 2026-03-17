# Short Hop - Product Notes

## Overview
Short Hop is a mobile-first, native-app-like ride-sharing platform designed to offer flexible and community-driven transportation. It aims to disrupt urban mobility by providing diverse movement options and fostering a trusted network among users and drivers. Key features include a tiered subscription model, a community feed, a "Hop Buddy" rating system, and gamified rewards. The project envisions high user engagement through features like hop streaks, achievement badges, and a referral system, with future plans for native iOS/Android conversion and broader market adoption.

## User Preferences
I prefer iterative development with a focus on delivering core features first. I value clear and concise communication. Please ask before making major architectural changes or introducing new dependencies. I prefer detailed explanations for complex design decisions.

## System Architecture

### UI/UX Decisions
The application features a mobile-first, app-like UI with a bottom tab navigation bar, compact layouts, and app-style headers. The design uses nature-inspired greens, orange, and blue themes with CartoDB dark map tiles. Framer Motion handles animations, and Shadcn components provide a consistent UI. A custom Flash Notification system offers animated pop-up alerts.

### Technical Implementations
- **User Tiers & Movement Options**: Includes "Standard ShortHop" (free), "FlexHop" (premium subscription), and "Power Hop" (unlimited rides).
- **Ride Vibe Preferences**: Users select "Quiet Ride", "Friendly Chat", or "Community Mode".
- **Hop Buddy Rating System**: Post-ride rating with optional "Ride again", "Follow", and tipping.
- **Trusted Hoppers**: A mutual follow system for improved ride matching.
- **Community Feed**: A "Network" page for FlexHop users to post and all users to read, including direct chat with admin and a live activity feed.
- **Schedule System**: Users create, edit, and manage recurring trip schedules.
- **Smart Route Matching**: Identifies and suggests schedule overlaps between users based on corridors.
- **First Hop Assist**: Prioritizes new users for matching to encourage first rides.
- **Automatic Ride Detection**: Rides automatically transition through states (requested → matched → in_ride → completed) based on user proximity.
- **Live Ride Visualization**: During a ride, an overlay shows progress, elapsed time, and driver info.
- **Notification System**: In-app center, flash notifications, and browser API integration with user-configurable toggles.
- **Driver Onboarding & Verification**: Multi-step wizard for driver activation, requiring admin approval.
- **GO ACTIVE / GO OFFLINE Toggle**: Drivers control their availability.
- **Admin Panel**: Restricted access for super-admin (HyperFM) to manage users, drivers, reports, and communications.
- **Driver Features**: Routine route support, "Wheels" reward system, and a Reward Store.
- **PWA Support**: `manifest.json` and service worker for "Add to Home Screen" and offline caching.
- **Subscription System**: Free, FlexHop ($10/mo), and PowerHop ($25/mo) tiers with server-side Stripe enforcement.
- **Growth Features**: Hop Streak System, Achievement Badges, Referral System, Leaderboard, and Shareable Ride Cards.
- **Multi-Language & Auto-Translation**: Supports 14 languages with automatic translation in DMs and a "Translate" button on chat messages, powered by MyMemory API.
- **GPS/Map Visuals**: Uses Mapbox GL JS (streets-v12 style) with live GPS tracking, three context-aware map markers (hopper alone, driver alone, driver+hopper together), and drop-shadow rendering.
- **Profile Photo Storage**: Profile photos are resized client-side (max 400px, JPEG 0.8 quality), stored as base64 in the `profilePhoto` column of the users table, and persisted via PATCH /api/user/profile.
- **Direction-Based Hop Matching**: Available hops are sorted for drivers by a combined score of pickup proximity and route/direction alignment (matching corridor names, start/end locations against driver's routine routes).
- **Destination Geocoding**: Hop destinations are geocoded via Mapbox Geocoding API before submission, storing lat/lng coordinates for proximity-based matching and drop-off notifications.
- **Drop-Off Proximity Notification**: Same notification sound plays when driver+hopper approach the hopper's destination (within 0.15 miles), on both driver and hopper sides.
- **Friends System**: Mutual friendship via request/accept flow (no followers/following). `friendships` table with status (pending/accepted/declined). Storage methods: sendFriendRequest, respondFriendRequest, getFriends, getFriendRequests, getFriendCount, getFriendshipStatus, getPublicProfiles. API routes: POST /api/friends/request, POST /api/friends/respond/:id, GET /api/friends, GET /api/friends/requests, GET /api/friends/count, GET /api/friends/status/:userId, GET /api/community/profiles.
- **Community Discovery**: Connect page has 3 tabs (Feed, Community, Friends). Community tab shows public/semi-private profiles with status-aware friend actions. Friends tab shows pending requests with accept/decline and a friends list.
- **Profile Privacy**: 3-level profile visibility stored in DB (`profileVisibility` column): public (full profile in Community), semi_private (username+photo only), private (hidden). Selector in Settings profile card header.
- **Flex Range System**: Both hoppers and drivers have configurable range settings stored in DB. Hopper: `hopperFlexRange` (0, 0.25, 0.5, 1 mile) — how far they'll walk to a pickup. Driver: `isFlexibleDriver` toggle + `driverFlexRange` (0, 0.25, 0.5, 1 mile) — how far they'll detour off route. UI in Tailor section with sliders and Smart Tips. Saved via PUT /api/profile/preferences. Matching logic priorities: 1) zero detour matches, 2) lowest combined deviation.
- **Hopper Ride Preferences**: Tailor section includes Flexible Drop-off (exact vs close_enough), Allow Detour Drivers toggle, Shared Commute toggle, and Mode Lock (none/hopper_only/driver_only for subscribers). All persisted to DB via PUT /api/profile/preferences.
- **Chat Reactions & Editing**: All chat types (Founder Chat, VIP Hyper Line, City Chat) support 5-emoji reactions (👍 ❤️ 😢 😮 😡) and message editing (own messages only, with edited timestamp). Reactions stored as JSON `{emoji: count}` in `reactions` column. Edit updates `editedAt` timestamp.
- **Notification Reactions & Replies**: Users can react to notifications with 5 emojis and send a quick reply (500 char max). Reactions via POST /api/notifications/:id/react, replies via POST /api/notifications/:id/reply. Admin can view reactions/replies.
- **Schedule Anytime & Payment**: Ride planner supports "Request Anytime" toggle. All payments are Stripe-only (no cash). Stored in `anytime` and `paymentPreference` (default "stripe") columns.
- **Prepaid Hop System**: All hops use Stripe PaymentIntent with `capture_method='manual'` (auth-hold). Flow: authorize → match → capture on accept → refund on cancel/timeout. Schema fields: `paymentIntentId`, `paymentStatus` (none/authorized/captured/refunded), `paymentAmountCents`, `departureTime`, `arrivalDeadline`, `timeWindowExpiry`. Auto-cancel interval (60s) cancels expired pending hops and releases payment holds. Rate: $1.00/mile, minimum $1.00.
- **Driver Availability API**: GET /api/driver-availability returns count, status (none/low/good), and smart message. Shown on InstaHop before requesting.
- **Time Window System**: Each hop has a 30-minute match window (`timeWindowExpiry`). Drivers see only active-window hops. Countdown timer shown to hopper. Expired hops auto-cancel with payment release and notification.
- **ID Verification Placeholder**: Coming Soon card in Settings below Legal Name field, announcing photo ID verification for trust badges.
- **Flyers Feature**: Lexington ShortHop Network card includes a "Flyers" button (next to Connect) that opens a modal with downloadable marketing materials: Driver Flyer (JPG image), Hopper Flyer (editable DOCX template), and a "Download All" button for bulk downloads. Includes message: "Help grow ShortHop in your area. Print these for free at your local library and spread the word."

### System Design Choices
- **Authentication**: Passport.js with a local strategy and session-based authentication.
- **Data Validation**: Zod schemas.
- **Database**: PostgreSQL with Drizzle ORM.
- **Session Management**: PostgreSQL-backed sessions (`connect-pg-simple`) for 30-day persistence.
- **Pricing Logic**: Drivers earn fixed $0.50/0.5mi ($1.00/mi). Rider rate: $1.00/mile, minimum $1.00 per hop. All payments via Stripe (no cash). Prepaid auth-hold captured on match. Tips allowed via Stripe. $1 card verification hold on first use. Instant hops blocked for 10+ mile trips - directs to Plan a Ride instead.
- **Super Admin Role**: A single designated super-admin account (HyperFM).

### Bottom Navigation Tabs (Order)
1. **Connect** (`/community`) — Live Activity, Lexington ShortHop Network (with Flyers modal), City Chat, Founders Lounge, VIP Hyper Line, community posts
2. **Schedule** (`/schedule`) — Recurring trip scheduler
3. **Center Tab** (`/instahop`) — Label always says "Hop"; icon changes: blue walking figure (hopper) or orange car (driver)
4. **Tailor** (`/dashboard`) — Hopper/Driver switcher at top, Plan a Ride card (pickup, destination, date, time, submit for scheduled rides), Ride Vibe, Privacy Controls, Alert Preferences
5. **Profile** (`/settings`) — Photo (color ring), 3-level visibility selector (Public/Semi/Private), friends count + hops count, username, legal name, bio, interests, fun prompts, membership, notifications (slim single-row card), referral, install, contact/report

### OrangeGlow Border
- Left/right sides only, thin 2px line + 18px animated glow that pulses gently (glowPulse/glowPulseRight CSS keyframes)
- No flash notification when changing profile tab color

### InstaHop Panel
- Full-screen map with panel anchored at 40% height from bottom
- Panel can be swiped DOWN to dismiss (keeps ~60px peek visible), pull up to restore; cannot slide upward past resting position
- Small drag handle bar at top of panel for grip affordance
- Top row layout: 2 corridors stacked vertically (left), greeting (center), carousel at 75% scale (right)
- Hopper: green InstaHop button + orange X cancel button appears during matching
- Driver: orange Drive Now button, no corridors, carousel stays
- Matching state: stays on InstaHop, orange "matching you..." button + orange X cancel button; cancel calls backend cancelHop
- "Connecting drivers..." text hidden when driver count is 0
- Custom map markers: `hopper-marker.png` and `driver-marker.png`

### Profile Color System
- Profile tab color changes: ring around photo circle (4px), profile card border (2px), username on Tailor page colored
- SeasonalGreeting component uses profile tab color for username display
- WalkerDashboard username also colored by profile tab choice
- DriverDashboard founder badge shows "Founder" text only (no wheel emoji)
- 3-level visibility selector (Public/Semi-Private/Private) on profile card header, persisted to DB `profileVisibility` column
- Friends count and total hops displayed below profile photo
- Stored in `sh-profile-tab-color` localStorage (color only; visibility is DB-backed)

## External Dependencies
- **Stripe**: For subscription management and payment processing.
- **MyMemory API**: For multi-language auto-translation functionality.
- **Mapbox GL JS**: Interactive maps with streets-v12 style and geocoding API.
- **PostgreSQL**: Primary database.
- **Framer Motion**: For UI animations.
- **Shadcn**: UI component library.