/**
 * Siddhanath Kriya Yoga - Feedback SMS Worker
 * Receives feedback and sends SMS via Twilio
 *
 * Deploy: wrangler deploy
 * Set secrets:
 *   wrangler secret put TWILIO_ACCOUNT_SID
 *   wrangler secret put TWILIO_AUTH_TOKEN
 *   wrangler secret put TWILIO_PHONE_FROM
 *   wrangler secret put NOTIFY_PHONE
 *   wrangler secret put ALLOWED_ORIGIN   (e.g. https://siddhanath-yoga.web.app)
 */

// Simple in-memory rate limiter: max 5 requests per IP per minute
const rateLimitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 5;

  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }

  entry.count++;
  rateLimitMap.set(ip, entry);

  return entry.count > maxRequests;
}

export default {
  async fetch(request, env) {
    // Only allow configured origin (or '*' if not set, for local dev)
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Validate origin in production
    if (allowedOrigin !== '*') {
      const origin = request.headers.get('Origin') || '';
      if (origin !== allowedOrigin) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting by IP
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (isRateLimited(clientIp)) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please wait a minute.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const data = await request.json();
      const { name, email, type, message } = data;

      if (!message) {
        return new Response(JSON.stringify({ error: 'Message is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Truncate and sanitize inputs to prevent SMS injection
      const safeName = String(name || 'Anonymous').replace(/[\r\n]/g, ' ').slice(0, 50);
      const safeEmail = String(email || '').replace(/[\r\n]/g, ' ').slice(0, 100);
      const safeType = String(type || 'feedback').replace(/[\r\n]/g, ' ').slice(0, 30);
      const safeMessage = String(message).replace(/[\r\n\t]/g, ' ').slice(0, 300);

      // Format SMS
      const smsBody = `Siddhanath App Feedback
Type: ${safeType}
From: ${safeName}${safeEmail ? ` (${safeEmail})` : ''}
---
${safeMessage}${message.length > 300 ? '...' : ''}`;

      // Send via Twilio
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;

      const twilioResponse = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: env.NOTIFY_PHONE,
          From: env.TWILIO_PHONE_FROM,
          Body: smsBody,
        }),
      });

      if (!twilioResponse.ok) {
        const error = await twilioResponse.text();
        console.error('Twilio error:', error);
        return new Response(JSON.stringify({ error: 'Failed to send SMS' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, message: 'Feedback sent!' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
