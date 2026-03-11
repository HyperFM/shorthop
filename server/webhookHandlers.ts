import { getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import Stripe from 'stripe';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error('Webhook payload must be a Buffer.');
    }

    const stripe = await getUncachableStripeClient();
    let event: Stripe.Event;

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
      console.warn('[stripe webhook] No STRIPE_WEBHOOK_SECRET set — skipping signature verification (dev mode only!)');
      event = JSON.parse(payload.toString()) as Stripe.Event;
    }

    console.log(`[stripe webhook] ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const type = metadata.type;

        if (type === 'subscription') {
          const userId = Number(metadata.userId);
          const plan = metadata.plan;
          if (userId && plan) {
            await storage.updateUser(userId, {
              subscription: plan,
              subscriptionStartDate: new Date(),
            });
            await storage.createNotification({
              userId,
              type: "subscription",
              title: "Subscription Activated! 🎉",
              message: `Your ${plan === "flex_hop" ? "Flex Hop ($5/mo)" : "Power Hop ($15/mo)"} is now active.`,
              isRead: false,
            });
            console.log(`[stripe webhook] Subscription activated: user ${userId}, plan ${plan}`);
          }
        } else if (type === 'donation') {
          const userId = Number(metadata.userId);
          const amountCents = Number(metadata.amountCents);
          const message = metadata.message || null;
          if (userId && amountCents) {
            await storage.createDonation(userId, amountCents, message);
            console.log(`[stripe webhook] Donation recorded: user ${userId}, $${(amountCents / 100).toFixed(2)}`);
          }
        } else if (type === 'tip') {
          const hopId = Number(metadata.hopId);
          const driverId = Number(metadata.driverId);
          const tipCents = Number(metadata.tipCents);
          if (hopId && tipCents) {
            await storage.tipDriver(hopId, tipCents);
            if (driverId) {
              await storage.createNotification({
                userId: driverId,
                type: "tip",
                title: "You got a tip! 💰",
                message: `You received a $${(tipCents / 100).toFixed(2)} tip. Thanks for driving!`,
                isRead: false,
              });
            }
            console.log(`[stripe webhook] Tip processed: hop ${hopId}, $${(tipCents / 100).toFixed(2)}`);
          }
        } else if (metadata.hopId) {
          const hopId = Number(metadata.hopId);
          console.log(`[stripe webhook] Hop payment completed: hop ${hopId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = Number(sub.metadata?.userId);
        if (userId) {
          await storage.updateUser(userId, {
            subscription: null,
            subscriptionStartDate: null,
          });
          await storage.createNotification({
            userId,
            type: "subscription",
            title: "Subscription Cancelled",
            message: "Your subscription has been cancelled.",
            isRead: false,
          });
          console.log(`[stripe webhook] Subscription cancelled: user ${userId}`);
        }
        break;
      }

      default:
        break;
    }
  }
}
