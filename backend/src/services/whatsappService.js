const axios = require("axios");
const env = require("../config/env");

const configurationError = (message) => {
  const error = new Error(message);
  error.code = "INTEGRATION_NOT_CONFIGURED";
  error.statusCode = 503;
  return error;
};

// ---------------------------------------------------------------------------
// Phone number normalization helper
// ---------------------------------------------------------------------------

const normalizePhone = (phone) => {
  if (!phone) return "";
  let cleaned = String(phone).replace(/[\s\-\+]/g, "");
  // If 10-digit Indian number, add 91 country code
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    cleaned = `91${cleaned}`;
  }
  return cleaned;
};

// ---------------------------------------------------------------------------
// AOC WhatsApp API sender (primary — uses credentials from .env)
// ---------------------------------------------------------------------------

const sendViaAOC = async (to, text) => {
  const { apiUrl, apiKey, from } = env.aoc;
  if (!apiUrl || !apiKey) {
    throw configurationError(
      "AOC WhatsApp API is not configured. Set WHATSAPP_API_URL and WHATSAPP_API_KEY in backend/.env.",
    );
  }

  const response = await axios.post(
    apiUrl,
    {
      from: normalizePhone(from),
      to: normalizePhone(to),
      type: "text",
      text: { body: text },
    },
    {
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );
  return { provider: "aoc", data: response.data };
};

// ---------------------------------------------------------------------------
// AOC template message sender (for proactive outreach outside 24-hr window)
// ---------------------------------------------------------------------------

const sendTemplateViaAOC = async (to, templateName, components = []) => {
  const { apiUrl, apiKey, from } = env.aoc;
  if (!apiUrl || !apiKey) {
    throw configurationError(
      "AOC WhatsApp API is not configured for template messages.",
    );
  }

  const payload = {
    from: normalizePhone(from),
    to: normalizePhone(to),
    type: "template",
    templateName,
  };
  if (Array.isArray(components) && components.length > 0) {
    payload.components = components;
  }

  const response = await axios.post(
    apiUrl,
    payload,
    {
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );
  return { provider: "aoc-template", data: response.data };
};

// ---------------------------------------------------------------------------
// CRM provider sender (fallback)
// ---------------------------------------------------------------------------

const sendViaCrm = async (to, text) => {
  const { apiKey, baseUrl, sendPath } = env.crm;
  if (!apiKey || !baseUrl || !sendPath) {
    throw configurationError(
      "CRM sending is not configured. Set CRM_API_KEY, CRM_API_BASE_URL, and CRM_SEND_MESSAGE_PATH in backend/.env using the provider's documented values.",
    );
  }

  const response = await axios.post(
    new URL(sendPath, baseUrl).toString(),
    { to, phone: to, recipient: to, message: text, text },
    {
      headers: {
        Authorization: "Bearer " + apiKey,
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );
  return { provider: "crm", data: response.data };
};

// ---------------------------------------------------------------------------
// Meta Cloud API sender (fallback)
// ---------------------------------------------------------------------------

const sendViaMeta = async (to, text) => {
  const { accessToken, phoneNumberId } = env.whatsapp;
  if (!accessToken || !phoneNumberId) {
    throw configurationError(
      "WhatsApp sending is not configured. Provide AOC credentials, CRM endpoint settings, or WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in backend/.env.",
    );
  }
  const response = await axios.post(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text },
    },
    {
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );
  return { provider: "meta-cloud", data: response.data };
};

// ---------------------------------------------------------------------------
// Unified send — routes through the first configured provider
// Priority: AOC → CRM → Meta Cloud API
// ---------------------------------------------------------------------------

const sendTextMessage = async (to, text) => {
  // 1. AOC (primary — credentials in .env)
  if (env.aoc.apiUrl && env.aoc.apiKey) {
    return sendViaAOC(to, text);
  }

  // 2. CRM fallback
  if (env.crm.apiKey || env.crm.baseUrl || env.crm.sendPath) {
    return sendViaCrm(to, text);
  }

  // 3. Meta Cloud API fallback
  if (env.whatsapp.accessToken && env.whatsapp.phoneNumberId) {
    return sendViaMeta(to, text);
  }

  throw configurationError(
    "No WhatsApp provider is configured. Set AOC credentials (WHATSAPP_API_URL, WHATSAPP_API_KEY), CRM credentials, or Meta Cloud API credentials in backend/.env.",
  );
};

// ---------------------------------------------------------------------------
// Interactive messages (Meta Cloud API only)
// ---------------------------------------------------------------------------

const sendQuickReplies = async (to, bodyText, buttons) => {
  const { accessToken, phoneNumberId } = env.whatsapp;
  if (env.crm.apiKey || env.crm.baseUrl || env.crm.sendPath) {
    throw configurationError(
      "Interactive CRM messages require the provider's documented template/button payload. Set that adapter in whatsappService.js after confirming the CRM API documentation.",
    );
  }
  if (!accessToken || !phoneNumberId) {
    throw configurationError("WhatsApp quick replies require WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.");
  }
  const response = await axios.post(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: bodyText },
        action: { buttons: buttons.slice(0, 3).map((button, index) => ({ type: "reply", reply: { id: button.id || `option_${index + 1}`, title: button.title } })) },
      },
    },
    { headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" }, timeout: 15000 },
  );
  return { provider: "meta-cloud", data: response.data };
};

// ---------------------------------------------------------------------------
// Webhook verification (supports both Meta and AOC verify token)
// ---------------------------------------------------------------------------

const verifyWebhook = (mode, token, challenge) => {
  const expectedToken = env.whatsapp.verifyToken || env.crm.webhookSecret;
  return mode === "subscribe" && expectedToken && token === expectedToken ? challenge : null;
};

// ---------------------------------------------------------------------------
// Connection status check — returns which provider is configured
// ---------------------------------------------------------------------------

const getConnectionStatus = () => {
  if (env.aoc.apiUrl && env.aoc.apiKey) {
    return { connected: true, provider: "aoc", from: env.aoc.from };
  }
  if (env.crm.apiKey && env.crm.baseUrl) {
    return { connected: true, provider: "crm" };
  }
  if (env.whatsapp.accessToken && env.whatsapp.phoneNumberId) {
    return { connected: true, provider: "meta-cloud" };
  }
  return { connected: false, provider: null };
};

module.exports = {
  sendTextMessage,
  sendTemplateViaAOC,
  sendQuickReplies,
  verifyWebhook,
  getConnectionStatus,
};
