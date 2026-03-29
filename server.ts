import dotenv from "dotenv";
dotenv.config({ override: true });
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Groq from "groq-sdk";
import crypto from "crypto";

const app = express();
const PORT = 3005;

app.use(express.json());

// In-memory store
const sessions = new Map<string, any>();
const leaderboard: any[] = [];
const userPurchases = new Map<string, any[]>();

const ARCHETYPES = [
  { id: "anchor", name: "The Anchor", description: "Opens high, concedes slowly. Very stubborn." },
  { id: "eager", name: "The Eager Closer", description: "Wants a deal fast, drops early. Impatient." },
  { id: "craftsman", name: "The Proud Craftsman", description: "Responds to quality arguments, not price alone. Values appreciation." },
  { id: "skeptic", name: "The Skeptic", description: "Requires proof, resistant to flattery. Needs logical reasons." },
  { id: "gambler", name: "The Gambler", description: "Unpredictable, mood-driven concessions. Might offer sudden discounts or refuse." }
];

const PRODUCTS = [
  { id: "premium-watch", name: "Luxury Chronograph Watch", listedPrice: 1200, currency: "$", image: "/images/products/watch.jpg" },
  { id: "vintage-camera", name: "1970s Film Camera", listedPrice: 450, currency: "$", image: "/images/products/camera.jpg" },
  { id: "gaming-laptop", name: "Next-Gen Gaming Laptop", listedPrice: 2100, currency: "$", image: "/images/products/laptop.jpg" },
  { id: "electric-guitar", name: "Limited Edition Electric Guitar", listedPrice: 1500, currency: "$", image: "/images/products/guitar.jpg" },
  { id: "sneakers", name: "Exclusive Designer Sneakers", listedPrice: 850, currency: "$", image: "/images/products/sneakers.jpg" },
  { id: "rare-coin", name: "1909-S VDB Lincoln Cent", listedPrice: 2500, currency: "$", image: "/images/products/coin.jpg" },
  { id: "arcade-cabinet", name: "Original Pac-Man Arcade Cabinet", listedPrice: 3200, currency: "$", image: "/images/products/arcade.jpg" }
];

// API Routes
app.get("/api/products", (req, res) => {
  const playerName = req.query.playerName as string;
  const inventory = playerName && userPurchases.has(playerName) 
    ? userPurchases.get(playerName)! 
    : [];
  const purchasedIds = inventory.map(item => item.productId);
  res.json({ products: PRODUCTS, purchasedIds, inventory });
});

app.post("/api/negotiate/start", (req, res) => {
  const { productId, playerName } = req.body || {};
  const product = PRODUCTS.find(p => p.id === productId) || PRODUCTS[0];

  if (playerName && userPurchases.get(playerName)?.some(p => p.productId === product.id)) {
    return res.status(400).json({ error: "You have already purchased this item." });
  }

  const sessionId = crypto.randomUUID();
  const archetype = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
  const listed = product.listedPrice;
  const floorPrice = Math.floor(listed * (0.6 + Math.random() * 0.2)); 
  const targetPrice = Math.floor(listed * (0.8 + Math.random() * 0.15));

  sessions.set(sessionId, {
    id: sessionId,
    product: product,
    archetype,
    floorPrice,
    targetPrice,
    willingnessScore: 50,
    round: 0,
    maxRounds: 8,
    history: [],
    status: "active",
    currentOffer: product.listedPrice
  });

  res.json({ sessionId, product: product, maxRounds: 8 });
});

app.post("/api/negotiate/round", async (req, res) => {
  const { sessionId, message } = req.body;
  const session = sessions.get(sessionId);

  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.status !== "active") return res.status(400).json({ error: "Session is not active" });

  if (session.round >= session.maxRounds) {
    session.status = "walkaway";
    return res.json({ status: "walkaway", responseMessage: "The seller walked away. You've reached the maximum number of rounds." });
  }

  const apiKeys = [process.env.GROQ_API_KEY_1, process.env.GROQ_API_KEY_2, process.env.GROQ_API_KEY_3].filter(Boolean);
  if (apiKeys.length === 0) return res.status(500).json({ error: "Groq API keys are not configured." });

  session.round += 1;
  session.history.push({ role: "user", content: message });

  const systemInstruction = `You are a seller negotiating the price of a ${session.product.name}.
Listed Price: $${session.product.listedPrice}
Your Absolute Minimum Floor Price: $${session.floorPrice}
Your Target Price: $${session.targetPrice}
Your Personality: ${session.archetype.name} - ${session.archetype.description}
Current Round: ${session.round} of ${session.maxRounds}

Rules:
1. Respond in character. Keep it concise.
2. Provide a specific counter-offer if still negotiating.
3. Accept if offer is above floor and reasonable.
4. Walkaway if buyer is rude or too low for too long.
5. Return JSON: { "responseMessage": string, "newCounterOffer": number | null, "willingnessDelta": number, "action": "counter"|"accept"|"walkaway" }`;

  const chatHistory = session.history.map((msg: any) => `${msg.role === 'user' ? 'Buyer' : 'Seller'}: ${msg.content}`).join('\n');
  const prompt = `Conversation History:\n${chatHistory}\n\nBuyer's latest message: "${message}"`;

  let lastError = null;
  for (const apiKey of apiKeys) {
    try {
      const groq = new Groq({ apiKey });
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "system", content: systemInstruction }, { role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");
      session.willingnessScore = Math.max(0, Math.min(100, session.willingnessScore + result.willingnessDelta));
      session.history.push({ role: "assistant", content: result.responseMessage });

      if (result.action === "counter" && result.newCounterOffer) session.currentOffer = result.newCounterOffer;
      else if (result.action === "accept") session.status = "deal";
      else if (result.action === "walkaway") session.status = "walkaway";

      return res.json({
        responseMessage: result.responseMessage,
        currentOffer: session.currentOffer,
        action: result.action,
        round: session.round,
        status: session.status
      });
    } catch (error: any) {
      lastError = error;
      if (error.status === 401 || error.status === 429) continue;
      break;
    }
  }
  return res.status(500).json({ error: lastError?.message || "Failed to generate response." });
});

async function generateNegotiationInsight(session: any) {
  const apiKeys = [process.env.GROQ_API_KEY_1, process.env.GROQ_API_KEY_2, process.env.GROQ_API_KEY_3].filter(Boolean);
  if (apiKeys.length === 0) return "No API keys available.";

  const chatHistory = session.history.map((msg: any) => `${msg.role === 'user' ? 'Buyer' : 'Seller'}: ${msg.content}`).join('\n');
  const systemInstruction = `Analyze the negotiation style... Return JSON: { "style": string, "feedback": string }`;

  for (const apiKey of apiKeys) {
    try {
      const groq = new Groq({ apiKey });
      const completion = await groq.chat.completions.create({
        messages: [{ role: "system", content: systemInstruction }, { role: "user", content: chatHistory }],
        model: "llama-3.1-8b-instant",
        response_format: { type: "json_object" }
      });
      const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
      return `[Style: ${result.style}] ${result.feedback}`;
    } catch (e) { continue; }
  }
  return "Could not generate insight.";
}

app.post("/api/negotiate/accept", async (req, res) => {
  const { sessionId, playerName } = req.body;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });

  session.status = "deal";
  const listed = session.product.listedPrice;
  const deal = session.currentOffer;
  const discountPct = ((listed - deal) / listed);
  const score = Math.round(discountPct * 1000 * (1.0 + 0.05 * (session.maxRounds - session.round)));

  const entry = {
    id: crypto.randomUUID(),
    playerName: playerName || "Anonymous",
    dealPrice: deal,
    discountPct: (discountPct * 100).toFixed(1),
    rounds: session.round,
    score,
    timestamp: new Date().toISOString()
  };

  const pName = playerName || "Anonymous";
  if (!userPurchases.has(pName)) userPurchases.set(pName, []);
  userPurchases.get(pName)!.push({ productId: session.product.id, productName: session.product.name, dealPrice: deal, date: new Date().toISOString() });

  leaderboard.push(entry);
  leaderboard.sort((a, b) => b.score - a.score);

  const insight = await generateNegotiationInsight(session);
  res.json({ success: true, entry, summary: { floorPrice: session.floorPrice, archetype: session.archetype.name, insight } });
});

app.post("/api/negotiate/walkaway", async (req, res) => {
  const { sessionId } = req.body;
  const session = sessions.get(sessionId);
  if (session) session.status = "walkaway";
  const insight = await generateNegotiationInsight(session);
  res.json({ success: true, summary: { floorPrice: session?.floorPrice, archetype: session?.archetype?.name, insight } });
});

app.get("/api/leaderboard", (req, res) => res.json(leaderboard.slice(0, 50)));

async function startServer() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    // Serve static files from the build directory
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      // Don't intercept API routes
      if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  }
  
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer();
