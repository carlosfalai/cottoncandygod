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
 */

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
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

      // Format SMS
      const smsBody = `📱 Siddhanath App Feedback
Type: ${type || 'feedback'}
From: ${name || 'Anonymous'}${email ? ` (${email})` : ''}
---
${message.slice(0, 300)}${message.length > 300 ? '...' : ''}`;

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
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
