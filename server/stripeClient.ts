import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

let stripeSyncInstance: StripeSync | null = null;

export async function getUncachableStripeClient(): Promise<Stripe> {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY not set. Please connect Stripe integration.");
  }
  return new Stripe(apiKey, { apiVersion: "2025-04-30.basil" as any });
}

export async function getStripeSync(): Promise<StripeSync> {
  if (stripeSyncInstance) return stripeSyncInstance;

  const stripe = await getUncachableStripeClient();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL required for Stripe sync");

  stripeSyncInstance = new StripeSync({ stripe, databaseUrl });
  return stripeSyncInstance;
}
