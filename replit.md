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
- **GPS/Map Visuals**: Uses Leaflet with CartoDB dark tiles, displaying user/driver locations, animated route lines, and pickup markers.

### System Design Choices
- **Authentication**: Passport.js with a local strategy and session-based authentication.
- **Data Validation**: Zod schemas.
- **Database**: PostgreSQL with Drizzle ORM.
- **Session Management**: PostgreSQL-backed sessions (`connect-pg-simple`) for 30-day persistence.
- **Pricing Logic**: Server-side calculation for ride costs ($3.00/mile, minimum $1.50).
- **Super Admin Role**: A single designated super-admin account (HyperFM).

### Bottom Navigation Tabs (Order)
1. **Connect** (`/community`) — City Chat, Founders Lounge, VIP Hyper Line, community posts
2. **Schedule** (`/schedule`) — Recurring trip scheduler
3. **Center Tab** (`/instahop`) — Label always says "Hop"; icon changes: blue walking figure (hopper) or orange car (driver)
4. **Tailor** (`/dashboard`) — Hopper/Driver switcher at top, Ride Vibe, Privacy Controls, Alert Preferences
5. **Profile** (`/settings`) — Photo (color ring), public/private toggle, username, legal name, bio, interests, fun prompts, membership, notifications (slim single-row card), referral, install, contact/report

### OrangeGlow Border
- Left/right sides only, thin 2px line + 18px animated glow that pulses gently (glowPulse/glowPulseRight CSS keyframes)
- No flash notification when changing profile tab color

### InstaHop Panel
- Full-screen map with FIXED panel pinned at 40% height (no swipe/expand/handle)
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
- Public/Private visibility toggle on profile card header
- Stored in `sh-profile-tab-color` and `sh-profile-public` localStorage

## External Dependencies
- **Stripe**: For subscription management and payment processing.
- **MyMemory API**: For multi-language auto-translation functionality.
- **Leaflet**: Open-source JavaScript library for interactive maps.
- **CartoDB**: Provides dark map tiles for Leaflet.
- **PostgreSQL**: Primary database.
- **Framer Motion**: For UI animations.
- **Shadcn**: UI component library.