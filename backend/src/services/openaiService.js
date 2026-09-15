const env = require("../config/env");
const { OpenAI } = require("openai");

const getOpenAIClient = () => {
  if (!env.openai.apiKey) {
    return null;
  }
  return new OpenAI({ apiKey: env.openai.apiKey });
};

// Simple in-memory session cart store (ready for SQL migration later)
const sessionStore = new Map();

const getSession = (customerPhone) => {
  if (!sessionStore.has(customerPhone)) {
    sessionStore.set(customerPhone, {
      phone: customerPhone,
      cart: [],
      customerDetails: {},
      step: "GREETING", // GREETING -> CATEGORY -> SELECTION -> DELIVERY -> PAYMENT -> CONFIRMED
      orderId: null,
      history: [],
    });
  }
  return sessionStore.get(customerPhone);
};

const resetSession = (customerPhone) => {
  sessionStore.delete(customerPhone);
  return getSession(customerPhone);
};

const SYSTEM_PROMPT = `
You are the AI Assistant for Bombay Sourdough Company.
You interact with customers on WhatsApp to help them order fresh sourdough bread, pastries, cookies, and combos.

AI RULES:
1. Always be polite, warm, and helpful. Use relevant emojis (🍞, 🥐, 🍪, 🎁, ✅).
2. Never invent product prices. Only reference prices from the catalog provided in context.
3. Guide the customer through this sequence:
   Step 1: Warm Greeting & Usual Order prompt
   Step 2: Present Categories/Options (🍞 Sourdough Breads, 🥐 Croissants, 🍪 Cookies, 🎁 Combos, 🔄 Order My Previous Order)
   Step 3: Item Selection (add/remove/quantity update) & Cart Summary
   Step 4: Delivery details collection (Name, Address, Date, Time slot, Payment method)
   Step 5: Payment (send pending payment link structure)
   Step 6: Final Order Confirmation with Order ID
4. Never confirm an order without explicit customer approval and complete delivery details.
5. If the user asks something off-topic, politely bring them back to ordering.
`;

const generateAIReply = async ({ customerPhone, customerName, message, productsCatalog = [] }) => {
  const session = getSession(customerPhone || "default_user");
  const openai = getOpenAIClient();

  // If no OpenAI key is set, return a structured fallback reply following the customer journey rules
  if (!openai) {
    return handleFallbackReply(session, message, productsCatalog, customerName);
  }

  try {
    const catalogSummary = productsCatalog.map(p => `- ${p.name} (ID: ${p.id}): ₹${p.price || 'N/A'}`).join("\n");
    const currentCartSummary = session.cart.length > 0 
      ? session.cart.map(i => `${i.name} x${i.quantity} (₹${i.price * i.quantity})`).join(", ")
      : "Empty";

    const promptMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      { 
        role: "system", 
        content: `AVAILABLE PRODUCTS CATALOG:\n${catalogSummary || "Catalog loading..."}\n\nCURRENT SESSION STATE:\nStep: ${session.step}\nCart: ${currentCartSummary}\nCustomer Info: ${JSON.stringify(session.customerDetails)}` 
      },
      ...session.history.slice(-6),
      { role: "user", content: message }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: promptMessages,
      temperature: 0.7,
      max_tokens: 300,
    });

    const replyText = response.choices[0]?.message?.content || "I'm sorry, I couldn't process that right now. How can I help with your order?";

    // Update history
    session.history.push({ role: "user", content: message });
    session.history.push({ role: "assistant", content: replyText });

    return {
      reply: replyText,
      session,
    };
  } catch (error) {
    console.error("OpenAI API call error:", error.message);
    return handleFallbackReply(session, message, productsCatalog, customerName);
  }
};

function handleFallbackReply(session, message, productsCatalog, customerName) {
  if (!productsCatalog.length) {
    const reply = "I’m unable to access today’s live bakery catalog right now. Please try again shortly or ask our support team for help.";
    session.history.push({ role: "user", content: message });
    session.history.push({ role: "assistant", content: reply });
    return { reply, session };
  }
  const msgLower = (message || "").toLowerCase();
  let reply = "";

  if (msgLower.includes("hi") || msgLower.includes("hello") || session.step === "GREETING") {
    const greeting = customerName || 'there';
    reply = `Hi ${greeting} 👋 Your favourite sourdough is fresh today!\nWould you like to place your usual order?\n\nCategories:\n🍞 1. Sourdough Breads\n🥐 2. Croissants\n🍪 3. Cookies\n🎁 4. Combos\n🔄 5. Order My Previous Order`;
    session.step = "CATEGORY";
  } else if (msgLower.includes("sourdough") || msgLower.includes("1")) {
    const item = productsCatalog.find(p => p.name?.toLowerCase().includes("sourdough")) || { name: "Sourdough Loaf", price: 350, id: 101 };
    reply = `🍞 ${item.name} — ₹${item.price}\nWould you like to add this to your cart? Reply 'Add' or 'Checkout'.`;
    session.step = "SELECTION";
    session.cart = [{ id: item.id, name: item.name, price: item.price, quantity: 1 }];
  } else if (msgLower.includes("croissant") || msgLower.includes("2")) {
    const item = productsCatalog.find(p => p.name?.toLowerCase().includes("croissant")) || { name: "Butter Croissant", price: 150, id: 102 };
    reply = `🥐 ${item.name} — ₹${item.price}\nWould you like to add this to your cart? Reply 'Add' or 'Checkout'.`;
    session.step = "SELECTION";
    session.cart = [{ id: item.id, name: item.name, price: item.price, quantity: 1 }];
  } else if (msgLower.includes("add") || msgLower.includes("yes")) {
    const total = session.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    reply = `🛒 Added to cart!\nTotal: ₹${total || 350}\n\nPlease reply with your **Delivery Address** and **Preferred Time** to complete checkout.`;
    session.step = "DELIVERY";
  } else if (msgLower.includes("checkout") || session.step === "DELIVERY") {
    session.customerDetails = { name: customerName || "Customer", address: "", time: "" };
    reply = `💳 Payment Link: https://pay.bombaysourdoughcompany.com/pay_link_pending (Status: Payment Gateway Integration Pending)\n\nPlease confirm to finalize order #BS1025. Reply 'Confirm'.`;
    session.step = "PAYMENT";
  } else if (msgLower.includes("confirm") || session.step === "PAYMENT") {
    session.step = "CONFIRMED";
    session.orderId = "BS1025";
    reply = `✅ Your order #BS1025 is confirmed.\nDelivery: Tomorrow, 10–11 AM.\nThank you for ordering with Bombay Sourdough Company! 🍞`;
  } else {
    reply = `Thank you for reaching out! Here are our options:\n🍞 Sourdough Breads\n🥐 Croissants\n🍪 Cookies\n🎁 Combos\n\nReply with what you'd like to order!`;
  }

  session.history.push({ role: "user", content: message });
  session.history.push({ role: "assistant", content: reply });

  return {
    reply,
    session,
  };
}

module.exports = {
  generateAIReply,
  getSession,
  resetSession,
};
