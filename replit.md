# Short Hop - Product Notes

## Overview
Short Hop is a mobile-first, native-app-like ride-sharing platform designed to offer flexible and community-driven transportation options. It aims to disrupt the urban mobility market by providing diverse movement options (walking, short hops, flex hops, power hops) and fostering a trusted network among users and drivers. The project prioritizes a streamlined UI, robust notification system, and an integrated driver onboarding process. Key capabilities include a tiered subscription model, a community feed, a unique "Hop Buddy" rating system, and a rewards program. The business vision is to build a highly engaged user base through gamified features like hop streaks, achievement badges, and a referral system, ultimately aiming for future native iOS/Android conversion and broader market adoption.

## User Preferences
I prefer iterative development with a focus on delivering core features first. I value clear and concise communication. Please ask before making major architectural changes or introducing new dependencies. I prefer detailed explanations for complex design decisions.

## System Architecture

### UI/UX Decisions
The application features a mobile-first, app-like UI with a bottom tab navigation bar for authenticated users, compact layouts (`max-w-lg mx-auto`), and app-style headers. Design incorporates nature-inspired greens (primary), orange (secondary), and blue (accent) themes, with CartoDB dark map tiles. Framer Motion is used for animations, and Shadcn components provide a consistent UI toolkit. A custom Flash Notification system (`showFlash(emoji, text, type)`) offers animated pop-up alerts.

### Technical Implementations
- **User Tiers & Movement Options**: Implemented with "Standard ShortHop" (free), "FlexHop" (premium subscription for detours), and "Power Hop" (unlimited rides).
- **Ride Vibe Preferences**: Users can select "Quiet Ride", "Friendly Chat" (default), or "Community Mode".
- **Hop Buddy Rating System**: Post-ride rating (Great, Good, Neutral, Issue), optional "Ride again" and "Follow" buttons, and integrated tipping ($1/$2/$3/Custom).
- **Trusted Hoppers**: A follow system where mutual follows designate "Trusted Hoppers" for improved matching.
- **Community Feed**: A `/community` page allowing FlexHop users to post (500 char limit) and all users to read. Includes a direct chat feature with the admin ("Hyper").
- **Notification System**: In-app notification center, flash notifications, and browser notification API integration with user-configurable toggles.
- **Driver Onboarding & Verification**: A multi-step wizard (`/driver-onboarding`) for vehicle info, license/identity uploads, agreement, and notification prompts. Admin approval is required for activation.
- **GO ACTIVE / GO OFFLINE Toggle**: Prominent toggle for verified drivers to control availability and location broadcasting.
- **Admin Panel**: Restricted `/admin` route for super-admin (HyperFM) with tabs for overview, inbox, reports, user management, driver applications, active drivers, logs, mass notifications, founder chat, and payments.
- **Driver Features**: Routine route support, "Wheels" reward system (1 mile driven = 1 Wheel for drivers, 0.5 Wheels/mile for riders), and a Reward Store for redemption.
- **Rider Request Flow**: Displays driver info upon match; shows "No drivers nearby" if unavailable.
- **PWA Support**: Includes `manifest.json` for "Add to Home Screen" functionality and a service worker (`sw.js`) for offline caching.
- **Subscription System**: Free tier, Flex Hop ($5/mo), and Power Hop ($15/mo) with server-side enforcement.
- **Growth Features**: Hop Streak System, Achievement Badges, Referral System (5 Wheels for referrer, 3 for new user), Leaderboard, and Shareable Ride Cards.
- **Saved Routes (Walker)**: Users can save and quickly select frequent destinations.
- **Home Screen Widget System (iOS-Ready)**: `/widget` page previews directional flow widgets in Small, Medium, and Large sizes, themed by user role (driver/hopper).
- **Founder System & Chat**: First 50 users receive lifetime FlexHop and a founder badge. A direct chat channel exists between founders and admin.
- **Contact & Report System**: Forms for "Contact ShortHop" and "Report an Issue" with admin panel integration for viewing, replying, and resolving.
- **Safety & Privacy**: Block/report user functionality, ride history logs, optional community features, profile privacy toggles, and dedicated privacy/terms pages.
- **Driver Profile Questionnaire**: Optional multi-step questionnaire for verified drivers (conversation comfort, music preference, pets OK, groceries/items OK, lifestyle tags). Shown on Driver Dashboard until completed. Data appears in the driver mini-profile card when matched with a hopper.
- **Bio & Interests System**: All users can set a bio (200 chars) and select up to 12 interests from 60+ options (anime, gaming, hip hop, coffee, hiking, etc.) in Settings. Stored as comma-separated in `interests` column. When a hopper matches with a driver, shared interests are highlighted in orange with a "X things in common!" badge. Interests are specific/conversational (not generic like "movies").
- **Match Insight Bubble**: Animated orange bubble shown to hoppers when matched with a driver heading the same direction. Auto-dismisses after 8 seconds or on tap.
- **Install App Page**: `/install` page with visual guide image, step-by-step instructions for iPhone (Safari), Android (Chrome), and Desktop. Linked from Settings with a "NEW" badge.
- **GPS/Map Visuals**: Uses Leaflet with CartoDB dark tiles, pulsing blue dot for user, green rounded-square for driver. Animated blue route lines with glow effects and directional arrows, distance overlay, and pickup spot markers.

### System Design Choices
- **Authentication**: Passport.js with a local strategy and session-based authentication.
- **Data Validation**: Zod schemas for robust data input validation.
- **Database**: PostgreSQL with Drizzle ORM.
- **Session Management**: PostgreSQL-backed sessions via `connect-pg-simple` for 30-day persistence.
- **Pricing Logic**: Server-side calculation for ride costs ($2.50/mile, minimum $2.50) to prevent client-side manipulation. Driver earns 1 Wheel/mile, platform retains $1.50/mile.
- **Super Admin Role**: A single, designated super-admin account (HyperFM) with exclusive access to critical admin functions.

## External Dependencies
- **Stripe**: Payment gateway for ALL revenue streams. Connected account: `acct_1T9cTFEPpyO5NSxU`. Env vars: `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` (optional, for production webhook verification). All 4 revenue streams use Stripe Checkout: hop payments ($2.50/mile), subscriptions (FlexHop $5/mo, PowerHop $15/mo recurring), donations (one-time), and tips (one-time). Webhook handler at `/api/stripe/webhook` processes `checkout.session.completed` and `customer.subscription.deleted` events. Stripe Connect Express for driver bank payouts (stripe_account_id, stripe_payouts_enabled columns). Trust proxy enabled for production session cookies.
- **React**: Frontend library.
- **Vite**: Build tool for frontend.
- **Tailwind CSS**: Utility-first CSS framework.
- **Framer Motion**: Animation library.
- **TanStack Query**: Data fetching library.
- **Express**: Backend web framework.
- **Passport.js**: Authentication middleware.
- **PostgreSQL**: Relational database.
- **Drizzle ORM**: TypeScript ORM for PostgreSQL.
- **`connect-pg-simple`**: PostgreSQL session store.
- **Zod**: Schema declaration and validation library.
- **Shadcn UI**: UI component library.
- **Leaflet**: Interactive map library.
- **CartoDB**: Map tile provider.