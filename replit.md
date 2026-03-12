# Short Hop - Product Notes

## Overview
Short Hop is a mobile-first, native-app-like ride-sharing platform designed to offer flexible and community-driven transportation options. It aims to disrupt the urban mobility market by providing diverse movement options (walking, short hops, flex hops, power hops) and fostering a trusted network among users and drivers. The project prioritizes a streamlined UI, robust notification system, and an integrated driver onboarding process. Key capabilities include a tiered subscription model, a community feed, a unique "Hop Buddy" rating system, and a rewards program. The business vision is to build a highly engaged user base through gamified features like hop streaks, achievement badges, and a referral system, ultimately aiming for future native iOS/Android conversion and broader market adoption.

## User Preferences
I prefer iterative development with a focus on delivering core features first. I value clear and concise communication. Please ask before making major architectural changes or introducing new dependencies. I prefer detailed explanations for complex design decisions.

## System Architecture

### UI/UX Decisions
The application features a mobile-first, app-like UI with a bottom tab navigation bar for authenticated users, compact layouts (`max-w-lg mx-auto`), and app-style headers. Design incorporates nature-inspired greens (primary), orange (secondary), and blue (accent) themes, with CartoDB dark map tiles. Framer Motion is used for animations, and Shadcn components provide a consistent UI toolkit. A custom Flash Notification system (`showFlash(emoji, text, type)`) offers animated pop-up alerts.

### Bottom Navigation (Updated)
- **Home** (`/dashboard`) — Stats bar (Streak/Hops/Wheels at top), smart matches, active ride status, schedule banner, founder chat
- **Schedule** (`/schedule`) — Recurring trip scheduler (days, locations, time windows, return trips)
- **InstaHop** (`/instahop`) — (green elevated ⚡ button) Minimal instant ride page: destination, location, InstaHop button, Hopper/Driver mode switcher
- **Network** (`/community`) — Platform growth stats, live activity feed, community posts
- **Profile** (`/settings`) — User settings, membership, notifications inbox, preferences

### Technical Implementations
- **User Tiers & Movement Options**: Implemented with "Standard ShortHop" (free), "FlexHop" (premium subscription for detours), and "Power Hop" (unlimited rides).
- **Ride Vibe Preferences**: Users can select "Quiet Ride", "Friendly Chat" (default), or "Community Mode".
- **Hop Buddy Rating System**: Post-ride rating (Great, Good, Neutral, Issue), optional "Ride again" and "Follow" buttons, and integrated tipping ($1/$2/$3/Custom).
- **Trusted Hoppers**: A follow system where mutual follows designate "Trusted Hoppers" for improved matching.
- **Community Feed**: A `/community` page (renamed "Network") allowing FlexHop users to post (500 char limit) and all users to read. Includes a direct chat feature with the admin ("Hyper"). Live activity feed shows drivers, riders, and new members in real time.
- **Schedule System**: Users create recurring trip schedules with day selection (Mon-Sun), start/destination locations, time windows, and optional return trips. Schedules are editable, toggleable (active/paused), and deletable. Home screen shows orange dismissible banner encouraging schedule creation if none exist. Schedules connect to corridors for smart matching.
- **Smart Route Matching**: `/api/smart-matches` endpoint finds schedule overlaps between users traveling same corridors at similar times. Shows "Smart Matches" cards on home screen with user name, direction, time window, and corridor info. Corridor detection maps location names to Lexington road corridors algorithmically.
- **First Hop Assist**: New users with 0 completed hops get priority matching. SmartMatchCard shows "First Hop Assist" banner encouraging first ride. Priority badge shown on smart match cards for new users.
- **Automatic Ride Detection**: Rides auto-transition through states: requested → matched → in_ride → completed. When matched users are within 150ft proximity for 5 seconds, ride automatically starts. When users separate by >0.5mi for 10 seconds during in_ride, ride auto-completes. Server endpoints: `/api/hops/:id/start-ride` and `/api/hops/:id/auto-complete`.
- **Live Ride Visualization**: During in_ride state, LiveRideOverlay shows connected rider/driver icons, progress bar toward destination, elapsed time, and driver name. Replaces the matched driver card UI.
- **First Ride Celebration**: When user completes first hop, celebratory modal appears with confetti emoji, "Hooray! You completed your first Hop" message, and Hop Streak introduction. Session-scoped to show once.
- **Pickup Corridor Navigation**: Road-based corridors (not landmarks). System finds the nearest point on busy roads (Nicholasville Rd, New Circle Rd, Man o' War, etc.) to user's position. Full-screen map overlay with 3 states: walking (blue), driver approaching (green), ride active (combined). Shows traffic flow directions so users stand on correct side of road. Handles in_ride status for active ride visualization.
- **Notification System**: In-app notification center (moved from bottom nav to Profile/Settings page), flash notifications, and browser notification API integration with user-configurable toggles.
- **Driver Onboarding & Verification**: A multi-step wizard (`/driver-onboarding`) for vehicle info, license/identity uploads, agreement, and notification prompts. Admin approval is required for activation.
- **GO ACTIVE / GO OFFLINE Toggle**: Prominent toggle for verified drivers to control availability and location broadcasting.
- **Admin Panel**: Restricted `/admin` route for super-admin (HyperFM) with tabs for overview, inbox, reports, user management, driver applications, active drivers, logs, mass notifications, founder chat, and payments. Actions dropdown menu for user management.
- **Driver Features**: Routine route support, "Wheels" reward system (1 mile driven = 1 Wheel for drivers, 0.5 Wheels/mile for riders), and a Reward Store for redemption.
- **Rider Request Flow**: Displays driver info upon match; shows "No drivers nearby" if unavailable.
- **PWA Support**: Includes `manifest.json` for "Add to Home Screen" functionality and a service worker (`sw.js`) for offline caching.
- **Subscription System**: Free tier, FlexHop ($10/mo with Auto-Hop scheduling), and PowerHop ($25/mo with premium connection features) with server-side Stripe enforcement.
- **Growth Features**: Hop Streak System, Achievement Badges, Referral System (5 Wheels for referrer, 3 for new user), Leaderboard, and Shareable Ride Cards.
- **Saved Routes (Walker)**: Users can save and quickly select frequent destinations.
- **Home Screen Widget System (iOS-Ready)**: `/widget` page previews directional flow widgets in Small, Medium, and Large sizes, themed by user role (driver/hopper).
- **Founder System & Chat**: First 50 users receive lifetime FlexHop and a founder badge. A direct chat channel exists between founders and admin.
- **Contact & Report System**: Forms for "Contact ShortHop" and "Report an Issue" with admin panel integration for viewing, replying, and resolving.
- **Safety & Privacy**: Block/report user functionality, ride history logs, optional community features, profile privacy toggles, and dedicated privacy/terms pages.
- **Driver Profile Questionnaire**: Optional multi-step questionnaire for verified drivers (conversation comfort, music preference, pets OK, groceries/items OK, lifestyle tags). Shown on Driver Dashboard until completed. Data appears in the driver mini-profile card when matched with a hopper.
- **Bio & Interests System**: All users can set a bio (200 chars) and select up to 12 interests from 60+ options (anime, gaming, hip hop, coffee, hiking, etc.) in Settings. Stored as comma-separated in `interests` column. When a hopper matches with a driver, shared interests are highlighted in orange with a "X things in common!" badge. Interests are specific/conversational (not generic like "movies").
- **Route Pioneer & Early Adopter System**: Sequential signup_number assigned on registration. First 5 users get "Route Pioneer" status with golden crown icon, "👑 Route Pioneer – Early Rider #X" badge, and a special welcome notification from Hyper. All users see their member number in Settings. Admin Users tab shows signup numbers and pioneer badges. Fields: `signupNumber`, `isRoutePioneer`.
- **Enhanced Profile**: Preferred Routes, Travel Time (Morning/Afternoon/Evening/Anytime), and Favorite Places fields added to Settings profile card. Stored in `preferredRoutes`, `travelTime`, `favoritePlaces` columns.
- **Match Insight Bubble**: Animated orange bubble shown to hoppers when matched with a driver. Message: "Your driver is on the way! Doors always wide open..." Auto-dismisses after 8 seconds or on tap.
- **Driver Approaching Sound**: Plays alert sound (`.m4a`) when hop transitions to 'matched'. Toggle in Settings notification preferences (sound on/off, notification always stays on). Uses `client/src/lib/sounds.ts`.
- **Welcome Intro + Quick Splash**: First launch shows glow-in video intro (~5s, skippable). Subsequent launches show 2s quick splash. Videos in `client/public/`. Uses `shorthop_welcome_seen` localStorage flag.
- **Language Chooser**: Globe dropdown on Home page with 14 languages. Inline translations for English/Spanish/French/Chinese on landing page. Persisted in `shorthop_lang` localStorage key. Separate from in-app profile language setting.
- **Hopping Soon App Stores**: Section on Home page showing "Hopping Soon" with app store logos image (Apple, Google Play, Amazon, Microsoft, Huawei, Galaxy Store). Future: native in-app purchases when submitted to stores.
- **Multi-Language & Auto-Translation**: 14 supported languages (English, Spanish, French, Chinese, Arabic, Hindi, Portuguese, Japanese, Korean, German, Swahili, Tagalog, Vietnamese, Russian). Language preference set in Settings profile card. Animated rotating multilingual welcome on Auth page. Auto-translation on all DMs: VIP chat, founder chat, admin inbox replies auto-translate to recipient's language. Inline "Translate" button on every chat message across Community and Admin pages. Uses MyMemory translation API. Server validates language codes.
- **Install App Page**: `/install` page with visual guide image, step-by-step instructions for iPhone (Safari), Android (Chrome), and Desktop. Linked from Settings with a "NEW" badge.
- **GPS/Map Visuals**: Uses Leaflet with CartoDB dark tiles, pulsing blue dot for user, green rounded-square for driver. Animated blue route lines with glow effects and directional arrows, distance overlay, and pickup spot markers.

### System Design Choices
- **Authentication**: Passport.js with a local strategy and session-based authentication.
- **Data Validation**: Zod schemas for robust data input validation.
- **Database**: PostgreSQL with Drizzle ORM.
- **Session Management**: PostgreSQL-backed sessions via `connect-pg-simple` for 30-day persistence.
- **Pricing Logic**: Server-side calculation for ride costs ($3.00/mile, minimum $1.50) to prevent client-side manipulation. Driver earns 1 Wheel/mile, platform retains $1.50/mile.
- **Super Admin Role**: A single, designated super-admin account (HyperFM) with exclusive access to critical admin functions. Admin can freely switch between Standard/FlexHop/PowerHop tiers via Settings (PATCH `/api/admin/my-tier`).

### Database Tables
- `users` — User accounts with roles, preferences, vehicle info, badges
- `driver_applications` — Driver verification applications
- `user_badges` — Achievement badges
- `expansion_waitlist` — City expansion signups
- `routine_routes` — Driver routine routes
- `short_hops` — Ride requests and matches
- `donations` — User donations
- `rewards` / `user_redemptions` — Reward store system
- `notifications` — In-app notifications
- `hop_buddy_ratings` — Post-ride ratings
- `follows` — Social follow system
- `community_posts` — Community/Network feed posts
- `walker_routes` — Saved hopper routes
- `contact_messages` — Support messages
- `reports` — User reports
- `founder_messages` — Founder group chat
- `vip_messages` — VIP direct messages
- `cashout_requests` — Wheel cashout requests
- `schedules` — Recurring trip schedules (days, locations, times, return trips)

### Key Files
- `client/src/pages/WalkerDashboard.tsx` — Hopper home screen
- `client/src/pages/DriverDashboard.tsx` — Driver home screen
- `client/src/pages/Schedule.tsx` — Schedule management page
- `client/src/pages/Community.tsx` — Network page (renamed from Community)
- `client/src/pages/Settings.tsx` — Profile/settings with notifications inbox
- `client/src/pages/Admin.tsx` — Admin dashboard
- `client/src/components/BottomTabBar.tsx` — 5-tab navigation (Home, Schedule, Hop, Network, Profile)
- `client/src/components/CorridorNavigation.tsx` — Full-screen corridor map navigation
- `client/src/components/NotificationCenter.tsx` — Notification inbox component
- `client/src/components/SmartMatchCard.tsx` — Smart route match suggestions with First Hop Assist
- `client/src/components/FirstHopCelebration.tsx` — First ride celebration modal
- `client/src/components/LiveRideOverlay.tsx` — In-ride progress visualization
- `server/routes.ts` — API routes including schedule CRUD, corridor guidance
- `server/storage.ts` — Database operations
- `shared/schema.ts` — Drizzle schema definitions
