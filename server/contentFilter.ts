import leoProfanity from "leo-profanity";

leoProfanity.loadDictionary();

const PHONE_PATTERNS = [
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/,
  /\+\d{1,3}[-.\s]?\d{3,14}/,
  /\b\d{10,}\b/,
];

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

const CONTACT_INFO_PATTERNS = [
  /\b(?:snapchat|snap|ig|insta|instagram|tiktok|twitter|telegram|whatsapp|signal|discord)\s*[:\-]?\s*[a-zA-Z0-9_.]{2,}/i,
  /\b(?:add me on|dm me on|find me on|text me at|call me at|hit me up on|hmu on)\b/i,
  /\b(?:my (?:snap|insta|ig|number|cell|phone) is)\b/i,
];

const RIDE_REQUEST_PATTERNS = [
  /\b(?:need|looking for)\s+(?:a\s+)?(?:ride|lift|driver)\b/i,
  /\b(?:can someone|can anyone|who can|who wants to)\s+(?:pick me up|drop me off|give me a ride|take me)\b/i,
  /\b(?:pick me up|drop me off)\s+(?:at|from|near|on)\b/i,
  /\b(?:i need a ride|need a lift|looking for a driver|seeking a ride)\b/i,
  /\b(?:anyone (?:near|around|close to|at|in)\s+\w+.*(?:pick me up|give.*ride|give.*lift))\b/i,
  /\b(?:offering rides?|giving rides?)\s+(?:to|from|around)\b/i,
  /\b(?:anyone going|anyone heading|anyone driving)\s+(?:to|from|toward)\s+\w+.*(?:ride|lift|pick|drop|hop)\b/i,
];

const SPAM_PATTERNS = [
  /\b(?:buy now|order now|click here|free money|make money|earn \$|work from home)\b/i,
  /\b(?:www\.|https?:\/\/|bit\.ly|tinyurl)\b/i,
  /\b(?:promo code|discount code|coupon code|limited time offer|act now|special offer)\b/i,
  /\b(?:visit my|download my|subscribe to my|check out my (?:page|channel|store|shop|site|website|link))\b/i,
  /\b(?:get\s+\d+\s+(?:followers|likes|views))\b/i,
];

export interface FilterResult {
  blocked: boolean;
  reason: string | null;
}

export function filterMessage(message: string): FilterResult {
  const text = message.trim();

  if (leoProfanity.check(text)) {
    return {
      blocked: true,
      reason: "Your message was blocked because it contained inappropriate language. Please keep the chat respectful.",
    };
  }

  for (const pattern of PHONE_PATTERNS) {
    if (pattern.test(text)) {
      return {
        blocked: true,
        reason: "Your message was blocked because it contained a phone number. For your safety, please keep conversations on the platform.",
      };
    }
  }

  if (EMAIL_PATTERN.test(text)) {
    return {
      blocked: true,
      reason: "Your message was blocked because it contained an email address. For your safety, please keep conversations on the platform.",
    };
  }

  for (const pattern of CONTACT_INFO_PATTERNS) {
    if (pattern.test(text)) {
      return {
        blocked: true,
        reason: "Your message was blocked because it contained off-platform contact information. Please keep conversations on the platform.",
      };
    }
  }

  for (const pattern of RIDE_REQUEST_PATTERNS) {
    if (pattern.test(text)) {
      return {
        blocked: true,
        reason: "Your message was blocked because it contained a ride request. Please use the app's Hop feature to request or offer rides.",
      };
    }
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      return {
        blocked: true,
        reason: "Your message was blocked because it was detected as spam or self-promotion. Please keep the chat community-focused.",
      };
    }
  }

  return { blocked: false, reason: null };
}
