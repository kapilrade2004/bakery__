const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../data");
const CONVERSATIONS_FILE = path.join(DATA_DIR, "conversations.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");

// ---------------------------------------------------------------------------
// Low-level atomic JSON read / write
// ---------------------------------------------------------------------------

const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

const readJSON = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf-8").trim();
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.error(`storageService: Failed to read ${filePath}:`, error.message);
    return [];
  }
};

const writeJSON = (filePath, data) => {
  ensureDataDir();
  const tempPath = filePath + ".tmp";
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tempPath, filePath);
};

// ---------------------------------------------------------------------------
// Normalize phone numbers — strip spaces, dashes, leading + for consistency
// ---------------------------------------------------------------------------

const normalizePhone = (phone) => {
  if (!phone) return "";
  let cleaned = String(phone).replace(/[\s\-\+\(\)]/g, "");
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    cleaned = `91${cleaned}`;
  }
  return cleaned;
};

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

const upsertConversation = (phone, name, lastMessage) => {
  const normalized = normalizePhone(phone);
  const conversations = readJSON(CONVERSATIONS_FILE);
  const now = new Date().toISOString();

  const existing = conversations.find(
    (c) => normalizePhone(c.phone) === normalized,
  );

  if (existing) {
    existing.name = name || existing.name;
    existing.lastMessage = lastMessage || existing.lastMessage;
    existing.lastUpdated = now;
    existing.unreadCount = (existing.unreadCount || 0) + 1;
    existing.totalMessages = (existing.totalMessages || 0) + 1;
  } else {
    conversations.push({
      phone: normalized,
      name: name || normalized,
      lastMessage: lastMessage || "",
      lastUpdated: now,
      unreadCount: 1,
      customerSince: now,
      totalMessages: 1,
    });
  }

  writeJSON(CONVERSATIONS_FILE, conversations);
  return existing || conversations[conversations.length - 1];
};

const markConversationRead = (phone) => {
  const normalized = normalizePhone(phone);
  const conversations = readJSON(CONVERSATIONS_FILE);
  const conversation = conversations.find(
    (c) => normalizePhone(c.phone) === normalized,
  );
  if (conversation) {
    conversation.unreadCount = 0;
    writeJSON(CONVERSATIONS_FILE, conversations);
  }
};

const getConversations = () => {
  const conversations = readJSON(CONVERSATIONS_FILE);
  return conversations.sort(
    (a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated),
  );
};

const getCustomerName = (phone) => {
  const normalized = normalizePhone(phone);
  const conversations = readJSON(CONVERSATIONS_FILE);
  const found = conversations.find((c) => normalizePhone(c.phone) === normalized);
  return found?.name || "";
};

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

const generateMessageId = (phone) => {
  return `msg_${Date.now()}_${normalizePhone(phone)}_${Math.random().toString(36).slice(2, 8)}`;
};

const saveIncomingMessage = (phone, name, text) => {
  const normalized = normalizePhone(phone);
  const now = new Date().toISOString();
  const customerName = name || getCustomerName(normalized) || normalized;

  const message = {
    id: generateMessageId(normalized),
    phone: normalized,
    customerName,
    sender: "customer",
    isAI: false,
    text: text || "",
    timestamp: now,
    status: "received",
  };

  const messages = readJSON(MESSAGES_FILE);
  messages.push(message);
  writeJSON(MESSAGES_FILE, messages);

  // Upsert the conversation entry
  upsertConversation(normalized, customerName, text);

  console.log(`[WHATSAPP LOG - INCOMING] Name: "${customerName}" | Mobile: "${normalized}" | Message: "${text}"`);

  return message;
};

const saveOutgoingMessage = (phone, text, isAI = false, name = "") => {
  const normalized = normalizePhone(phone);
  const now = new Date().toISOString();
  const customerName = name || getCustomerName(normalized) || normalized;

  const message = {
    id: generateMessageId(normalized),
    phone: normalized,
    customerName,
    sender: "agent",
    isAI,
    text: text || "",
    timestamp: now,
    status: "sent",
  };

  const messages = readJSON(MESSAGES_FILE);
  messages.push(message);
  writeJSON(MESSAGES_FILE, messages);

  // Update conversation last message (or create conversation if not exists)
  const conversations = readJSON(CONVERSATIONS_FILE);
  const existing = conversations.find(
    (c) => normalizePhone(c.phone) === normalized,
  );
  if (existing) {
    existing.lastMessage = text;
    existing.lastUpdated = now;
    existing.totalMessages = (existing.totalMessages || 0) + 1;
    if (customerName && customerName !== normalized) {
      existing.name = customerName;
    }
  } else {
    conversations.push({
      phone: normalized,
      name: customerName || normalized,
      lastMessage: text || "",
      lastUpdated: now,
      unreadCount: 0,
      customerSince: now,
      totalMessages: 1,
    });
  }
  writeJSON(CONVERSATIONS_FILE, conversations);

  console.log(`[WHATSAPP LOG - OUTGOING ${isAI ? 'AI' : 'MANUAL'}] To: "${customerName}" (${normalized}) | Message: "${text}"`);

  return message;
};

const getMessagesByPhone = (phone) => {
  const normalized = normalizePhone(phone);
  const messages = readJSON(MESSAGES_FILE);
  const conversations = readJSON(CONVERSATIONS_FILE);
  const conversation = conversations.find((c) => normalizePhone(c.phone) === normalized);
  const fallbackName = conversation?.name || normalized;

  return messages
    .filter((m) => normalizePhone(m.phone) === normalized)
    .map((m) => ({
      ...m,
      phone: normalized,
      customerName: m.customerName || fallbackName,
    }))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

const getAllMessageLogs = () => {
  const messages = readJSON(MESSAGES_FILE);
  const conversations = readJSON(CONVERSATIONS_FILE);
  const nameMap = new Map();
  conversations.forEach((c) => {
    nameMap.set(normalizePhone(c.phone), c.name);
  });

  return messages
    .map((m) => {
      const normalized = normalizePhone(m.phone);
      const name = m.customerName || nameMap.get(normalized) || normalized;
      return {
        id: m.id,
        name,
        phone: normalized,
        sender: m.sender,
        isAI: !!m.isAI,
        text: m.text,
        timestamp: m.timestamp,
        status: m.status,
      };
    })
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

// ---------------------------------------------------------------------------
// Customer stats (for /api/customers endpoint)
// ---------------------------------------------------------------------------

const getCustomerStats = () => {
  const conversations = readJSON(CONVERSATIONS_FILE);
  return conversations
    .map((c) => ({
      name: c.name,
      phone: c.phone,
      totalMessages: c.totalMessages || 0,
      lastActive: c.lastUpdated,
      customerSince: c.customerSince,
    }))
    .sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
};

// ---------------------------------------------------------------------------
// Dashboard aggregate stats
// ---------------------------------------------------------------------------

const getStats = () => {
  const conversations = readJSON(CONVERSATIONS_FILE);
  const messages = readJSON(MESSAGES_FILE);

  const totalCustomers = conversations.length;
  const totalMessages = messages.length;
  const aiMessages = messages.filter((m) => m.isAI).length;
  const customerMessages = messages.filter(
    (m) => m.sender === "customer",
  ).length;
  const unreadTotal = conversations.reduce(
    (sum, c) => sum + (c.unreadCount || 0),
    0,
  );

  return {
    totalCustomers,
    totalMessages,
    aiMessages,
    customerMessages,
    unreadTotal,
    aiHandledPercent:
      customerMessages > 0
        ? Math.round((aiMessages / customerMessages) * 100)
        : 0,
  };
};

module.exports = {
  saveIncomingMessage,
  saveOutgoingMessage,
  getConversations,
  getMessagesByPhone,
  getAllMessageLogs,
  getCustomerName,
  getCustomerStats,
  getStats,
  markConversationRead,
  normalizePhone,
};
