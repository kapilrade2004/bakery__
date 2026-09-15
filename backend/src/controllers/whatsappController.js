const whatsappService = require("../services/whatsappService");
const openaiService = require("../services/openaiService");
const woocommerceService = require("../services/woocommerceService");
const storageService = require("../db/storageService");

// ---------------------------------------------------------------------------
// Bounded deduplication cache (max 1000 message IDs, FIFO eviction)
// ---------------------------------------------------------------------------

const MAX_DEDUP_SIZE = 1000;
const processedIds = [];
const processedSet = new Set();

const isDuplicate = (messageId) => {
  if (!messageId) return false;
  if (processedSet.has(messageId)) return true;

  processedSet.add(messageId);
  processedIds.push(messageId);

  // Evict oldest when exceeding max size
  while (processedIds.length > MAX_DEDUP_SIZE) {
    const oldest = processedIds.shift();
    processedSet.delete(oldest);
  }

  return false;
};

// ---------------------------------------------------------------------------
// Process incoming WhatsApp message → AI reply → send back
// ---------------------------------------------------------------------------

const processIncomingMessage = async (from, text, profileName) => {
  // 1. Save incoming customer message
  storageService.saveIncomingMessage(from, profileName, text);

  // 2. Generate AI reply with product catalog context
  let catalog = [];
  try {
    catalog = await woocommerceService.getProducts();
  } catch (error) {
    console.error("Could not fetch product catalog for AI context:", error.message);
  }

  const aiResult = await openaiService.generateAIReply({
    customerPhone: from,
    customerName: profileName,
    message: text,
    productsCatalog: catalog,
  });

  // 3. Save AI reply to storage
  storageService.saveOutgoingMessage(from, aiResult.reply, true);

  // 4. Send AI reply to customer via WhatsApp
  try {
    await whatsappService.sendTextMessage(from, aiResult.reply);
  } catch (sendError) {
    console.error(
      `Failed to send WhatsApp reply to ${from}:`,
      sendError.message,
    );
    // Message is still saved in storage — admin can see it in the inbox
  }
};

// ---------------------------------------------------------------------------
// POST /api/whatsapp/send — Admin sends a message from the inbox UI
// ---------------------------------------------------------------------------

const sendMessage = async (req, res) => {
  try {
    const { to, text, name } = req.body;
    if (!to || !text) {
      return res.status(400).json({
        success: false,
        message: "Missing 'to' (phone number) or 'text' field",
      });
    }

    // Save outgoing message (admin manual, not AI) with customer name
    storageService.saveOutgoingMessage(to, text, false, name);

    // Try to send via WhatsApp provider
    let sendResult = null;
    try {
      sendResult = await whatsappService.sendTextMessage(to, text);
    } catch (sendError) {
      console.error("WhatsApp send failed:", sendError.message);
      // Message is saved locally — return success with a warning
      return res.json({
        success: true,
        message: "Message saved. WhatsApp delivery pending — provider may not be configured.",
        warning: sendError.message,
      });
    }

    res.json({
      success: true,
      message: "Message sent",
      data: sendResult,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "WHATSAPP_SEND_FAILED",
      message: error.message || "Failed to send WhatsApp message",
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/whatsapp/webhook — Meta/AOC webhook verification
// ---------------------------------------------------------------------------

const verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const challengeResult = whatsappService.verifyWebhook(mode, token, challenge);
  if (challengeResult) {
    console.log("WhatsApp Webhook verified successfully.");
    return res.status(200).send(challengeResult);
  }
  return res.sendStatus(403);
};

// ---------------------------------------------------------------------------
// POST /api/whatsapp/webhook — Incoming message from customer
// Supports both Meta Cloud API structure and flat AOC/BSP formats
// ---------------------------------------------------------------------------

const handleWebhookPayload = (req, res) => {
  try {
    const body = req.body;
    let from = null;
    let text = null;
    let profileName = "";
    let messageId = null;

    if (body?.object) {
      // 1. Standard Meta Cloud API format
      const value = body.entry?.[0]?.changes?.[0]?.value;
      const messageObj = value?.messages?.[0];
      const contactObj = value?.contacts?.[0];

      if (messageObj) {
        messageId = messageObj.id;
        from = messageObj.from;
        text =
          messageObj.text?.body ||
          messageObj.button?.text ||
          messageObj.interactive?.button_reply?.title;
        profileName = contactObj?.profile?.name || "";
      }
    } else if (body?.from || body?.mobile || body?.sender || body?.phone) {
      // 2. Flat AOC / BSP webhook format
      from = body.from || body.mobile || body.sender || body.phone;
      text =
        typeof body.message === "object"
          ? body.message?.text
          : (body.text || body.message || body.body || "");
      profileName = body.name || body.profileName || body.userName || "";
      messageId = body.id || body.messageId || null;
    }

    if (from && text) {
      // Bounded deduplication
      if (messageId && isDuplicate(messageId)) {
        return res.status(200).send("EVENT_RECEIVED");
      }

      console.log(
        `Incoming WhatsApp message from ${from} (${profileName || "unknown"}): ${text}`,
      );

      processIncomingMessage(from, text, profileName).catch((error) => {
        console.error(
          "Incoming WhatsApp processing failed:",
          error.message,
        );
      });

      return res.status(200).send("EVENT_RECEIVED");
    }

    // Acknowledge webhook delivery even for status receipts
    return res.status(200).send("EVENT_RECEIVED");
  } catch (error) {
    console.error("Webhook processing error:", error.message);
    return res.status(500).send("Internal Server Error");
  }
};

// ---------------------------------------------------------------------------
// GET /api/whatsapp/conversations — List all conversations
// ---------------------------------------------------------------------------

const getConversations = (req, res) => {
  try {
    const conversations = storageService.getConversations();
    res.json({
      success: true,
      data: conversations,
      count: conversations.length,
    });
  } catch (error) {
    console.error("Failed to fetch conversations:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversations",
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/whatsapp/conversations/:phone/messages — Get message thread
// ---------------------------------------------------------------------------

const getConversationMessages = (req, res) => {
  try {
    const phone = req.params.phone;
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const messages = storageService.getMessagesByPhone(phone);

    // Mark conversation as read when admin views it
    storageService.markConversationRead(phone);

    res.json({
      success: true,
      data: messages,
      count: messages.length,
    });
  } catch (error) {
    console.error("Failed to fetch messages:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/whatsapp/status — WhatsApp connection status
// ---------------------------------------------------------------------------

const getStatus = (req, res) => {
  const status = whatsappService.getConnectionStatus();
  res.json({ success: true, data: status });
};

// ---------------------------------------------------------------------------
// GET /api/whatsapp/logs — Get all message logs (Name, Phone, Text, Timestamp)
// ---------------------------------------------------------------------------

const getMessageLogs = (req, res) => {
  try {
    const logs = storageService.getAllMessageLogs();
    res.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error) {
    console.error("Failed to fetch message logs:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch message logs",
    });
  }
};

module.exports = {
  sendMessage,
  verifyWebhook,
  handleWebhookPayload,
  getConversations,
  getConversationMessages,
  getMessageLogs,
  getStatus,
};
