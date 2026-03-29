import dotenv from "dotenv";
dotenv.config({ override: true });
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Groq from "groq-sdk";
import crypto from "crypto";

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory store
const sessions = new Map<string, any>();
const leaderboard: any[] = [];

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

const userPurchases = new Map<string, any[]>();

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

  // Randomize floor and target based on listed price
  const listed = product.listedPrice;
  const floorPrice = Math.floor(listed * (0.6 + Math.random() * 0.2)); // 60% - 80% of listed price
  const targetPrice = Math.floor(listed * (0.8 + Math.random() * 0.15)); // 80% - 95% of listed price

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
    status: "active", // active, deal, walkaway
    currentOffer: product.listedPrice
  });

  res.json({
    sessionId,
    product: product,
    maxRounds: 8
  });
});

app.post("/api/negotiate/round", async (req, res) => {
  const { sessionId, message } = req.body;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  if (session.status !== "active") {
    return res.status(400).json({ error: "Session is not active" });
  }

  if (session.round >= session.maxRounds) {
    session.status = "walkaway";
    return res.json({ status: "walkaway", message: "The seller walked away. You took too many rounds." });
  }

  const apiKeys = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3
  ].filter(Boolean);

  if (apiKeys.length === 0) {
    return res.status(500).json({ error: "Groq API keys are not configured. Please add GROQ_API_KEY_1 to your .env file." });
  }

  session.round += 1;
  session.history.push({ role: "user", content: message });

  const systemInstruction = `You are a seller negotiating the price of a ${session.product.name}.
Listed Price: $${session.product.listedPrice}
Your Absolute Minimum Floor Price: $${session.floorPrice} (NEVER go below this, NEVER reveal this exact number)
Your Target Price: $${session.targetPrice}
Your Personality: ${session.archetype.name} - ${session.archetype.description}

Current Round: ${session.round} of ${session.maxRounds}
Current Willingness Score: ${session.willingnessScore}/100

Rules:
1. Respond in character. Keep it concise (1-3 sentences).
2. Evaluate the buyer's argument. If it's good, you might lower your price. If it's bad or insulting, hold firm or walk away.
3. You must provide a specific counter-offer price in your response if you are still negotiating.
4. If the buyer's offer is acceptable (above your floor and reasonable based on willingness), you can accept it.
5. If the buyer is too aggressive, insulting, or offers way below your floor repeatedly, you can walk away.
6. DO NOT reveal your floor price or target price.

You must return a JSON object with the following structure:
{
  "responseMessage": "Your in-character response to the buyer",
  "newCounterOffer": number | null (Your new price offer, or null if you accept/walk away),
  "willingnessDelta": number (-20 to 20, how much their message changed your willingness to sell),
  "action": "counter" | "accept" | "walkaway"
}`;

  const chatHistory = session.history.map((msg: any) =>
    `${msg.role === 'user' ? 'Buyer' : 'Seller'}: ${msg.content}`
  ).join('\n');

  const prompt = `Conversation History:\n${chatHistory}\n\nBuyer's latest message: "${message}"\n\nAnalyze the buyer's message and provide your response in JSON format.`;

  let lastError = null;

  for (const apiKey of apiKeys) {
    try {
      const groq = new Groq({ apiKey });
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");

      session.willingnessScore = Math.max(0, Math.min(100, session.willingnessScore + result.willingnessDelta));
      session.history.push({ role: "assistant", content: result.responseMessage });

      if (result.action === "counter" && result.newCounterOffer) {
        session.currentOffer = result.newCounterOffer;
      } else if (result.action === "accept") {
        session.status = "deal";
        if (result.newCounterOffer) session.currentOffer = result.newCounterOffer;
      } else if (result.action === "walkaway") {
        session.status = "walkaway";
      }

      return res.json({
        responseMessage: result.responseMessage,
        currentOffer: session.currentOffer,
        action: result.action,
        round: session.round,
        status: session.status
      });

    } catch (error: any) {
      console.error(`Error with API Key ${apiKey?.slice(0, 10)}...:`, error.message);
      lastError = error;

      // If it's a 401 or 429, try the next key
      if (error.status === 401 || error.status === 429) {
        continue;
      } else {
        // For other errors, break the loop
        break;
      }
    }
  }

  // If we reach here, all keys failed or no keys were valid
  if (lastError) {
    if (lastError.status === 401 || (lastError.message && (lastError.message.includes("API key") || lastError.message.includes("api_key")))) {
      return res.status(500).json({ error: "Your Groq API keys are invalid. Please check your .env file." });
    }
    return res.status(500).json({ error: lastError.message || "Failed to generate response after trying all API keys." });
  }

  return res.status(500).json({ error: "Failed to generate response. Please try again." });
});

async function generateNegotiationInsight(session: any) {
  const apiKeys = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3
  ].filter(Boolean);

  if (apiKeys.length === 0) return "No API keys available for insight generation.";

  const chatHistory = session.history.map((msg: any) =>
    `${msg.role === 'user' ? 'Buyer' : 'Seller'}: ${msg.content}`
  ).join('\n');

  const systemInstruction = `You are a negotiation expert. Analyze the conversation history between a Buyer and a Seller for a ${session.product.name}.
Categorize the Buyer's style as one of these: "Aggressive", "Logical", "Humble", "Impatient", or "Persuasive".
Provide a brief 2-3 sentence feedback in the second person (using "You").
Example: "You were quite logical, focusing on the camera's age to justify a lower price. This balanced approach kept the seller's interest without insulting them."

Return a JSON object:
{
  "style": "Style Name",
  "feedback": "Your feedback text"
}`;

  for (const apiKey of apiKeys) {
    try {
      const groq = new Groq({ apiKey });
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: `Analyze this history:\n${chatHistory}\nFinal Outcome: ${session.status === 'deal' ? 'Deal reached at $' + session.currentOffer : 'No deal reached.'}` }
        ],
        model: "llama-3.1-8b-instant", // Using a smaller model for speed
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
      return `[Style: ${result.style}] ${result.feedback}`;
    } catch (e) {
      console.error("Insight Error:", e);
      continue;
    }
  }
  return "Could not generate insight.";
}

app.post("/api/negotiate/accept", async (req, res) => {
  const { sessionId, playerName } = req.body;
  const session = sessions.get(sessionId);

  if (!session || session.status === "walkaway") {
    return res.status(400).json({ error: "Invalid session" });
  }

  session.status = "deal";

  // Calculate score
  const listed = session.product.listedPrice;
  const deal = session.currentOffer;
  const discountPct = ((listed - deal) / listed);

  const roundsRemaining = session.maxRounds - session.round;
  const efficiencyBonus = 1.0 + (0.05 * roundsRemaining);

  const score = Math.round(discountPct * 1000 * efficiencyBonus);

  const entry = {
    id: crypto.randomUUID(),
    playerName: playerName || "Anonymous",
    dealPrice: deal,
    discountPct: (discountPct * 100).toFixed(1),
    rounds: session.round,
    score,
    timestamp: new Date().toISOString(),
    archetype: session.archetype.name,
    floorPrice: session.floorPrice
  };

  const pName = playerName || "Anonymous";
  if (!userPurchases.has(pName)) {
    userPurchases.set(pName, []);
  }
  userPurchases.get(pName)!.push({
    productId: session.product.id,
    productName: session.product.name,
    dealPrice: deal,
    date: new Date().toISOString()
  });

  leaderboard.push(entry);
  leaderboard.sort((a, b) => b.score - a.score);

  const aiInsight = await generateNegotiationInsight(session);

  res.json({
    success: true,
    entry,
    summary: {
      floorPrice: session.floorPrice,
      archetype: session.archetype.name,
      insight: aiInsight
    }
  });
});

app.post("/api/negotiate/walkaway", async (req, res) => {
  const { sessionId } = req.body;
  const session = sessions.get(sessionId);

  if (session) {
    session.status = "walkaway";
  }

  const aiInsight = await generateNegotiationInsight(session);

  res.json({
    success: true,
    summary: {
      floorPrice: session?.floorPrice,
      archetype: session?.archetype?.name,
      insight: aiInsight
    }
  });
});

app.get("/api/leaderboard", (req, res) => {
  res.json(leaderboard.slice(0, 50));
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
