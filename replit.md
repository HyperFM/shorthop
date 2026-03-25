# Short Hop - Product Notes

## Overview
Short Hop is a mobile-first, native-app-like ride-sharing platform focused on community-driven urban transportation. It aims to build a trusted network for users and drivers, offering flexible movement options, tiered subscriptions, and engaging social features. The platform integrates features like a community feed, "Hop Buddy" ratings, and gamified rewards to enhance user engagement and provide a competitive alternative in urban mobility.

## User Preferences
I prefer iterative development with a focus on delivering core features first. I value clear and concise communication. Please ask before making major architectural changes or introducing new dependencies. I prefer detailed explanations for complex design decisions.

## System Architecture

### UI/UX Decisions
The application features a mobile-first, app-like interface with bottom tab navigation, compact layouts, and app-style headers. It uses nature-inspired green, orange, and blue themes with CartoDB dark map tiles. Animations are handled by Framer Motion, and UI consistency is maintained with Shadcn components. A custom Flash Notification system provides animated pop-up alerts. The InstaHop panel includes a full-screen map with custom markers and dynamic button states. User-selected profile colors are reflected in UI elements, and an "OrangeGlow" border provides branding.

### Technical Implementations
- **User Tiers**: Includes "Standard ShortHop" (free), "FlexHop" (premium subscription), and "Power Hop" (unlimited rides) with server-side Stripe enforcement.
- **Ride Matching & Preferences**: A closed system where matching runs every 5 seconds, evaluating all drivers and hoppers. It prioritizes route validity (pickup/dropoff along driver's route, forward progression) and seat availability. Match quality scoring ranks hoppers by total deviation. Drivers can choose "One Rider Only" or "Maximize Seats." An "Additional Hopper During Active Trip" feature allows drivers to accept new hoppers mid-ride via a non-intrusive prompt.
- **Navigation Experience**: Drivers going active enter a full-screen GPS mode using a navigation-night-v1 map style. The map displays the driver's route with dynamic waypoints. A slim bottom bar shows real-time ETA, distance, seat availability, and status. Match events update the nav bar inline without popups. The system includes pickup ETA for hoppers, route auto-updates, and robust cancellation handling.
- **In-Ride Chat**: Real-time messaging between driver and hopper during matched/in_ride hops, with messages stored in a `ride_messages` table.
- **Scheduling**: Users can create, edit, and manage recurring trip schedules. Driver schedules are free, while hopper schedules require a PowerHop membership with Stripe pre-payment.
- **Pickup Verification System**: A two-step process requiring driver and hopper confirmation. GPS co-movement detection can auto-confirm. False pickup detection triggers auto-cancellation and tracks violations, leading to a 5-strike ban.
- **Live Ride Features**: Automatic state transitions, live ride visualization, and drop-off proximity notifications. Includes a 3-minute pickup timer for hoppers when the driver is nearby.
- **Spontaneous Stop (SS)**: Hoppers can request quick, short stops along the route. These stops are driver-approved, time-limited, and incur an additional fee.
- **Notifications**: In-app center, flash notifications, and browser API integration with user-configurable toggles.
- **Community & Social**: A "Network" page for posts, a Friends System with mutual follow requests, and configurable profile privacy. Supports emoji reactions and direct messaging.
- **Driver Management**: Includes onboarding, verification, a "GO ACTIVE / GO OFFLINE" toggle, routine route support, and a "Wheels" reward system.
- **Admin Panel**: Restricted access for managing users, drivers, and reports.
- **PWA Support**: `manifest.json` and service worker for "Add to Home Screen" and offline caching.
- **Growth Features**: Hop Streak System, Achievement Badges, Referral System, Leaderboard, and Shareable Ride Cards.
- **Multi-Language**: Supports 14 languages with automatic translation and a "Translate" button.
- **GPS/Map**: Utilizes Mapbox GL JS for live GPS tracking, context-aware markers, and geocoding. Address Autocomplete uses the Mapbox Geocoding API with proximity biasing.
- **Prepaid Hop System**: All hops use Stripe PaymentIntent with saved cards, capturing payment on match and refunding on cancel/timeout. Pricing is $1.50/mile (min $1.50), with an option to pay with Wheels (1 Wheel = $1).
- **Intelligent Commute Layer (FlexHop/PowerHop)**: Features like "Flow Mode," "Route Sync Matching," "Star Hoppers" for prioritized matching, "Soft Time Windows," "On-the-Way Ping," "Drift Catch," and "Micro-Hop" priority.
- **Star Hoppers System**: Allows users to mark others as favorites, providing soft-priority matching without increasing wait times.
- **Auto-Verification**: Background job for hourly automatic approval of pending ID verifications older than 3 days.
- **ID Verification**: Users submit government ID and selfie for admin review, granting a blue checkmark badge upon verification.
- **Driver Approval Message**: Enhanced notification for newly approved drivers, including a special message for the first 10 drivers, prompting them to connect with the founder.
- **Seat Availability System**: Hoppers specify seats needed, and drivers specify available seats, which is integrated into the matching logic.
- **Quick Locations**: One-tap buttons for pre-set Home, Work, and Custom locations for quick route population on both hopper and driver panels.

### System Design Choices
- **Authentication**: Passport.js with local strategy and PostgreSQL-backed session management.
- **Data Validation**: Zod schemas.
- **Database**: PostgreSQL with Drizzle ORM.
- **Pricing Logic**: Drivers earn $1.00/mile, riders pay $1.50/mile (minimum $1.50). All payments via Stripe or Wheels.
- **Super Admin Role**: A single designated super-admin account.
- **Navigation**: Bottom navigation with "Connect," "Schedule," "Hop," "Tailor," and "Profile" tabs.

## External Dependencies
- **Stripe**: Payment processing and subscription management.
- **MyMemory API**: Multi-language auto-translation.
- **Mapbox GL JS**: Interactive maps, GPS tracking, and geocoding.
- **PostgreSQL**: Primary database.
- **Framer Motion**: UI animations.
- **Shadcn**: UI component library.