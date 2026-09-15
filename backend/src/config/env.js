require("dotenv").config();

module.exports = {
  port: process.env.PORT || 5000,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  woocommerce: {
    url: process.env.WOOCOMMERCE_URL || "https://bombaysourdoughcompany.com",
    consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY || "",
    consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET || "",
  },
  aoc: {
    apiUrl: process.env.WHATSAPP_API_URL || "",
    apiKey: process.env.WHATSAPP_API_KEY || "",
    from: process.env.WHATSAPP_FROM || "",
    campaignName: process.env.WHATSAPP_CAMPAIGN_NAME || "",
  },
  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
  },
  crm: {
    apiKey: process.env.CRM_API_KEY || "",
    baseUrl: process.env.CRM_API_BASE_URL || "",
    sendPath: process.env.CRM_SEND_MESSAGE_PATH || "",
    webhookSecret: process.env.CRM_WEBHOOK_SECRET || "",
  },
  payments: {
    provider: process.env.PAYMENT_PROVIDER || "",
    baseUrl: process.env.PAYMENT_API_BASE_URL || "",
    apiKey: process.env.PAYMENT_API_KEY || "",
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
  },
};
