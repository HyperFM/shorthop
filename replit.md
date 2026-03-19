# Short Hop - Product Notes

## Overview
Short Hop is a mobile-first, native-app-like ride-sharing platform designed for flexible, community-driven urban transportation. It aims to foster a trusted network among users and drivers, offering diverse movement options, tiered subscriptions, and engaging features like a community feed, "Hop Buddy" ratings, and gamified rewards. The project seeks to achieve high user engagement and disrupt traditional urban mobility.

## User Preferences
I prefer iterative development with a focus on delivering core features first. I value clear and concise communication. Please ask before making major architectural changes or introducing new dependencies. I prefer detailed explanations for complex design decisions.

## System Architecture

### UI/UX Decisions
The application employs a mobile-first, app-like UI with bottom tab navigation, compact layouts, and app-style headers. The design features nature-inspired green, orange, and blue themes with CartoDB dark map tiles. Animations are handled by Framer Motion, and Shadcn components ensure UI consistency. A custom Flash Notification system provides animated pop-up alerts. The InstaHop panel includes a full-screen map with a swipeable bottom panel, custom map markers (`hopper-marker.png`, `driver-marker.png`), and dynamic button states. Profile colors, chosen by the user, are reflected in UI elements like photo rings and card borders. An "OrangeGlow" border provides subtle visual branding.

### Technical Implementations
- **User Tiers**: Includes "Standard ShortHop" (free), "FlexHop" (premium subscription), and "Power Hop" (unlimited rides) with server-side Stripe enforcement.
- **Ride Matching & Preferences**: Features "Ride Vibe" preferences, a "Hop Buddy" rating system, mutual "Trusted Hoppers," and direction-based hop matching using combined scores of pickup proximity and route alignment. Hopper and driver flexibility ranges are configurable. "First Hop Assist" prioritizes new users. Driver Matching Style selector with three options: "All Drivers" (walker mode), "Direct Route Only" (non-detour), "Detour Drivers Only" — stored as `allowDetourDrivers` text field (values: "both", "non_detour_only", "detour_only").
- **Scheduling**: Users can create, edit, and manage recurring trip schedules with "Smart Route Matching" for schedule overlaps.
- **Live Ride Features**: Automatic ride detection transitions through states, live ride visualization shows progress, and drop-off proximity notifications alert users near their destination.
- **Notifications**: In-app center, flash notifications, and browser API integration with user-configurable toggles. Notifications support reactions and quick replies.
- **Community & Social**: A "Network" page for community posts, a Friends System with mutual follow requests and friend request notifications, and configurable profile privacy (public, semi_private, private). Chat messages support emoji reactions and editing. Direct messaging between friends via chat bubble icons on the Friends tab. Admin (HyperFM) can message any user regardless of friend status.
- **Driver Management**: Driver onboarding and verification via a multi-step wizard, "GO ACTIVE / GO OFFLINE" toggle, routine route support, and a "Wheels" reward system with a Reward Store.
- **Admin Panel**: Restricted access for a super-admin (HyperFM) to manage users, drivers, and reports.
- **PWA Support**: `manifest.json` and service worker for "Add to Home Screen" and offline caching.
- **Growth Features**: Hop Streak System, Achievement Badges, Referral System, Leaderboard, and Shareable Ride Cards.
- **Multi-Language**: Supports 14 languages with automatic translation in DMs and a "Translate" button, powered by MyMemory API.
- **GPS/Map**: Uses Mapbox GL JS for live GPS tracking, context-aware map markers, and destination geocoding.
- **Profile Photo Storage**: Client-side resized photos stored as base64 in the database.
- **Prepaid Hop System**: All hops use Stripe PaymentIntent with manual capture (auth-hold), capturing payment on match and refunding on cancel/timeout. Rate is $1.00/mile, minimum $1.00.
- **Intelligent Commute Layer (FlexHop/PowerHop)**: Built on "MagicGPS" for features like "Flow Mode" (auto-activation based on movement), "Route Sync Matching" (vector-based direction), "Commute Circles" for group matching, "Soft Time Windows" (tracking activity patterns), "On-the-Way Ping" for nearby drivers, "Drift Catch" for walking detection nudges, "Micro-Hop" priority for short rides, a "Confidence System" for route recognition, and "One-Tap Repeat Routes."
- **Flyers Feature**: Provides downloadable marketing materials for users to promote Short Hop.
- **ID Verification**: Users can submit government ID photo + selfie for admin review. Admin Verify ID tab shows pending submissions with approve/reject buttons. Verified users get a blue checkmark badge on their profile photo (Settings) and a shield icon next to their name in Community profiles. Schema fields: `legalName`, `idVerified`, `idVerificationStatus`, `idPhoto`, `idSelfie`, `idSubmittedAt`. Photos stripped from public API responses via `sanitizeUser`.
- **Driver Approval Message**: When admin approves a driver, an enhanced notification with the full founder message is sent. If the driver is within the first 10 approved drivers, an extra "first 10" line is included and `isFirstTenDriver` is set to `true`. On next login, a modal appears with "Call Founder" / "Text Founder" buttons (dials (859) 420-2312). Admin can toggle `isFirstTenDriver` manually from the Active Drivers tab. Schema fields: `isFirstTenDriver`, `driverApprovalSeen`.
- **Seat Availability System**: Hoppers set "Seats Needed" (1-6) in Tailor tab; drivers set "Available Seats" (1-6). Matching logic filters hops where `seatsNeeded > availableSeats`. Seats display live on the driver active toggle ("X seats open") and in hop request cards. Schema fields: `seatsNeeded`, `availableSeats` on users; `seatsNeeded` on short_hops.

### System Design Choices
- **Authentication**: Passport.js with local strategy and PostgreSQL-backed session management for 30-day persistence.
- **Data Validation**: Zod schemas.
- **Database**: PostgreSQL with Drizzle ORM.
- **Pricing Logic**: Drivers earn $1.00/mile; riders pay $1.00/mile (minimum $1.00). All payments via Stripe (no cash). Prepaid auth-hold system. Tips are allowed.
- **Super Admin Role**: A single designated super-admin account.
- **Navigation**: Bottom navigation with "Connect," "Schedule," "Hop" (center), "Tailor," and "Profile" tabs.

## External Dependencies
- **Stripe**: Payment processing and subscription management.
- **MyMemory API**: Multi-language auto-translation.
- **Mapbox GL JS**: Interactive maps, GPS tracking, and geocoding.
- **PostgreSQL**: Primary database.
- **Framer Motion**: UI animations.
- **Shadcn**: UI component library.