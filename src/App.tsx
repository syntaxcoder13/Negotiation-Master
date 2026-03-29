import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Trophy, XCircle, CheckCircle, Send, ArrowRight, Camera, User, Bot, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

type GameState = 'home' | 'negotiating' | 'debrief';

interface Product {
  id: string;
  name: string;
  listedPrice: number;
  currency: string;
  image: string;
}

interface Session {
  sessionId: string;
  product: Product;
  maxRounds: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('home');
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentOffer, setCurrentOffer] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [debrief, setDebrief] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || '');
  const [products, setProducts] = useState<Product[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameState === 'home' && playerName) {
      fetchProducts(playerName);
      fetchLeaderboard();
    }
  }, [gameState, playerName]);

  useEffect(() => {
    localStorage.setItem('playerName', playerName);
  }, [playerName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const fetchProducts = async (name: string) => {
    try {
      const res = await fetch(`/api/products?playerName=${encodeURIComponent(name)}`);
      const data = await res.json();
      setProducts(data.products);
      const pIds = data.purchasedIds || [];
      setPurchasedIds(pIds);
      
      // Auto-select first available product if none selected
      if (!selectedProductId || pIds.includes(selectedProductId)) {
        const firstAvailable = data.products.find((p: Product) => !pIds.includes(p.id));
        if (firstAvailable) {
          setSelectedProductId(firstAvailable.id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch products', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      setLeaderboard(data);
    } catch (error) {
      console.error('Failed to fetch leaderboard', error);
    }
  };

  const startSession = async () => {
    if (!selectedProductId) return;
    try {
      const res = await fetch('/api/negotiate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProductId, playerName })
      });
      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      setSession(data);
      setCurrentOffer(data.product.listedPrice);
      setMessages([{ role: 'assistant', content: `Hello. I have a ${data.product.name} listed at $${data.product.listedPrice.toLocaleString()}. What's your offer?` }]);
      setRound(0);
      setGameState('negotiating');
    } catch (error) {
      console.error('Failed to start session', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !session) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const res = await fetch('/api/negotiate/round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, message: userMsg })
      });
      const data = await res.json();

      setIsTyping(false);

      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.error || "I'm sorry, something went wrong. Let's try that again." }]);
        return;
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.responseMessage }]);
      if (data.currentOffer) setCurrentOffer(data.currentOffer);
      setRound(data.round);

      if (data.status === 'walkaway') {
        handleWalkaway(true);
      } else if (data.status === 'deal') {
        handleAccept(data.currentOffer);
      }
    } catch (error) {
      console.error('Failed to send message', error);
      setIsTyping(false);
    }
  };

  const handleAccept = async (finalPrice?: number) => {
    if (!session) return;
    try {
      const res = await fetch('/api/negotiate/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, playerName: playerName || 'Anonymous' })
      });
      const data = await res.json();
      setDebrief({ ...data.summary, entry: data.entry, type: 'deal' });
      setGameState('debrief');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (error) {
      console.error('Failed to accept deal', error);
    }
  };

  const handleWalkaway = async (forced = false) => {
    if (!session) return;
    try {
      const res = await fetch('/api/negotiate/walkaway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId })
      });
      const data = await res.json();
      setDebrief({ ...data.summary, type: 'walkaway', forced });
      setGameState('debrief');
    } catch (error) {
      console.error('Failed to walk away', error);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans selection:bg-emerald-500/30">
      <AnimatePresence mode="wait">
        {gameState === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto p-6 pt-12 md:pt-24"
          >
            <div className="text-center mb-10 md:mb-16">
              <h1 className="text-4xl md:text-7xl font-bold tracking-tighter mb-4 md:6 bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent px-4">
                Negotiation Master
              </h1>
              <p className="text-base md:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed px-4">
                Face off against AI sellers with hidden constraints and distinct personalities. Secure the lowest price. Rank globally.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-16 px-2 md:px-0">
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 md:p-8 backdrop-blur-sm flex flex-col min-h-[500px] md:min-h-0">
                <div className="mb-6">
                  <label className="block text-xs md:text-sm text-neutral-400 mb-2">Enter your alias for the leaderboard</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Anonymous"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors text-sm md:text-base text-neutral-200"
                  />
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <Camera className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                  <h2 className="text-lg md:text-xl font-medium">Available Items</h2>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar mb-6 max-h-[250px] md:max-h-[350px]">
                  {products.map((product) => {
                    const isPurchased = (purchasedIds || []).includes(product.id);
                    const isSelected = selectedProductId === product.id;
                    return (
                      <div 
                        key={product.id}
                        onClick={() => !isPurchased && setSelectedProductId(product.id)}
                        className={`p-3 md:p-4 rounded-2xl border transition-all ${
                          isPurchased 
                            ? 'bg-neutral-900/30 border-neutral-900 opacity-50 cursor-not-allowed' 
                            : isSelected 
                              ? 'bg-emerald-900/10 border-emerald-500/50 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
                              : 'bg-neutral-950 border-neutral-800/50 hover:border-neutral-700 cursor-pointer'
                        }`}
                        style={isPurchased ? { textDecoration: 'line-through' } : {}}
                      >
                        <div className="flex gap-3 md:gap-4 items-center">
                          <div className={`relative w-16 h-12 md:w-20 md:h-16 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0 ${isPurchased ? 'grayscale' : ''}`}>
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                            {isPurchased && (
                              <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[1px] flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate text-sm md:text-base ${isPurchased ? 'line-through text-neutral-500 italic' : 'text-neutral-50'}`}>
                              {product.name}
                            </p>
                            <div className="flex items-center justify-between mt-0.5 md:mt-1">
                              <p className={`font-mono text-xs md:text-sm ${isPurchased ? 'text-neutral-600' : 'text-emerald-400'}`}>
                                ${product.listedPrice.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={startSession}
                  disabled={!selectedProductId || !playerName.trim()}
                  className="w-full bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-500 transition-all rounded-xl py-3 md:py-4 font-semibold text-base md:text-lg flex items-center justify-center gap-2 group active:scale-95 shadow-lg shadow-white/5"
                >
                  Start Negotiating
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 md:p-8 backdrop-blur-sm flex flex-col min-h-[300px] md:min-h-0">
                <div className="flex items-center gap-3 mb-6">
                  <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />
                  <h2 className="text-xl md:text-2xl font-medium">World Ranking</h2>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                  {leaderboard.length === 0 ? (
                    <div className="text-center text-neutral-500 py-12 text-sm">No deals closed yet. Be the first!</div>
                  ) : (
                    leaderboard.map((entry, i) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 md:p-4 rounded-2xl bg-neutral-950 border border-neutral-800/50">
                        <div className="flex items-center gap-3 md:gap-4">
                          <span className="text-neutral-600 font-mono text-xs md:text-sm w-4">{i + 1}</span>
                          <div>
                            <p className="font-medium text-sm md:text-base">{entry.playerName}</p>
                            <p className="text-[10px] md:text-xs text-neutral-500">{entry.rounds} rounds</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-emerald-400 text-sm md:text-base font-bold">${entry.dealPrice.toLocaleString()}</p>
                          <p className="text-[10px] md:text-xs text-emerald-500/80">{entry.discountPct}% off</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'negotiating' && session && (
          <motion.div
            key="negotiating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-[100dvh] md:h-screen flex flex-col md:flex-row max-w-7xl mx-auto relative overflow-hidden"
          >
            {/* Left Panel - Info */}
            <div className="w-full md:w-1/3 p-4 md:p-6 border-b md:border-b-0 md:border-r border-neutral-800 flex flex-col bg-neutral-900/40 backdrop-blur-md z-10 shrink-0">
              <div className="flex items-center justify-between mb-4 md:mb-8">
                <h2 className="text-lg md:text-xl font-bold tracking-tight">Active Deal</h2>
                <div className="flex gap-1">
                  {Array.from({ length: session.maxRounds }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${i < round ? 'bg-emerald-500' : i === round ? 'bg-emerald-500 animate-pulse outline outline-emerald-500/30' : 'bg-neutral-800'}`}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-1 gap-3 md:gap-0 bg-neutral-900/50 rounded-2xl p-4 md:p-6 mb-4 md:mb-6 border border-neutral-800">
                <div className="col-span-2 md:col-span-1 border-b border-neutral-800/50 md:pb-4 mb-2 md:mb-4 pb-2">
                   <p className="text-[10px] md:text-sm text-neutral-500 uppercase tracking-wider mb-1">Item Info</p>
                   <p className="text-sm md:text-lg font-medium line-clamp-1">{session.product.name}</p>
                </div>

                <div className="md:mb-4">
                  <p className="text-[10px] md:text-sm text-neutral-500 uppercase tracking-wider mb-0.5">Listed</p>
                  <p className="text-base md:text-2xl font-mono text-neutral-300">${session.product.listedPrice.toLocaleString()}</p>
                </div>

                <div>
                  <p className="text-[10px] md:text-sm text-neutral-500 uppercase tracking-wider mb-0.5">Offer</p>
                  <p className="text-xl md:text-3xl font-mono text-emerald-400 font-bold">${currentOffer?.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-1 gap-2 mt-auto">
                <button
                  onClick={() => handleAccept(currentOffer!)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl py-3 md:py-4 font-medium flex items-center justify-center gap-2 transition-all text-sm md:text-base"
                >
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
                  Accept
                </button>
                <button
                  onClick={() => handleWalkaway()}
                  className="w-full bg-transparent border border-neutral-800 hover:bg-neutral-900 active:scale-95 text-neutral-400 rounded-xl py-3 md:py-4 font-medium flex items-center justify-center gap-2 transition-all text-sm md:text-base"
                >
                  <XCircle className="w-4 h-4 md:w-5 md:h-5" />
                  Exit
                </button>
              </div>
            </div>

            {/* Right Panel - Chat */}
            <div className="flex-1 flex flex-col min-h-0 bg-neutral-950/50">
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 custom-scrollbar">
                {messages.map((msg, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={i}
                    className={`flex gap-3 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-neutral-800' : 'bg-emerald-900/30 text-emerald-500'}`}>
                      {msg.role === 'user' ? <User className="w-4 h-4 md:w-5 md:h-5" /> : <Bot className="w-4 h-4 md:w-5 md:h-5" />}
                    </div>
                    <div className={`max-w-[85%] md:max-w-[80%] rounded-2xl p-3 md:p-4 text-sm md:text-base ${msg.role === 'user' ? 'bg-neutral-800 text-white rounded-tr-sm shadow-xl shadow-black/20' : 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-tl-sm'}`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}

                {isTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 md:gap-4">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-emerald-900/30 text-emerald-500 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl rounded-tl-sm p-3 md:p-4 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-neutral-500 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 md:p-6 bg-neutral-950 border-t border-neutral-800">
                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                  className="relative flex items-center"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Make your offer..."
                    disabled={isTyping}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-5 md:pl-6 pr-14 md:pr-16 py-3 md:py-4 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50 text-sm md:text-base"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    className="absolute right-2 p-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:bg-neutral-800 text-white rounded-xl transition-all"
                  >
                    <Send className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </form>
                <p className="text-[10px] md:text-xs text-neutral-500 mt-3 text-center">
                  Round {round} / {session.maxRounds}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'debrief' && debrief && (
          <motion.div
            key="debrief"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-[100dvh] flex items-center justify-center p-4 md:p-6"
          >
            <div className="max-w-xl w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-12 text-center">
              {debrief.type === 'deal' ? (
                <>
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                    <Trophy className="w-8 h-8 md:w-10 md:h-10" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-1 md:mb-2">Deal Successful!</h2>
                  <p className="text-lg md:text-xl text-neutral-400 mb-6 md:mb-8">{debrief.entry.discountPct}% Discount secured.</p>

                  <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
                    <div className="bg-neutral-950 rounded-2xl p-4 md:p-6 border border-neutral-800">
                      <p className="text-[10px] md:text-sm text-neutral-500 uppercase tracking-wider mb-2">Final Price</p>
                      <p className="text-xl md:text-3xl font-mono text-emerald-400 font-bold">${debrief.entry.dealPrice.toLocaleString()}</p>
                    </div>
                    <div className="bg-neutral-950 rounded-2xl p-4 md:p-6 border border-neutral-800">
                      <p className="text-[10px] md:text-sm text-neutral-500 uppercase tracking-wider mb-2">Total Score</p>
                      <p className="text-xl md:text-3xl font-mono text-white font-bold">{debrief.entry.score.toLocaleString()}</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                    <XCircle className="w-8 h-8 md:w-10 md:h-10" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-2">{debrief.forced ? 'Seller Aborted' : 'You Left'}</h2>
                  <p className="text-lg md:text-xl text-neutral-400 mb-8">No transaction completed.</p>
                </>
              )}

              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 md:p-6 text-left mb-8">
                <div className="flex items-start gap-3 md:gap-4">
                  <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-blue-400 shrink-0 mt-1" />
                  <div>
                    <h3 className="font-medium text-base md:text-lg mb-1 md:mb-2">Expert Analysis</h3>
                    <p className="text-xs md:text-sm text-neutral-400 leading-relaxed italic line-clamp-4">{debrief.insight}</p>
                    <div className="mt-4 pt-4 border-t border-neutral-800 space-y-2">
                       <div className="flex justify-between items-center text-xs md:text-sm">
                        <span className="text-neutral-500">Seller Personality</span>
                        <span className="font-medium">{debrief.archetype}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs md:text-sm">
                        <span className="text-neutral-500">Hidden Floor</span>
                        <span className="font-mono text-red-400">${debrief.floorPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setGameState('home')}
                className="w-full md:w-auto bg-white text-black hover:bg-neutral-200 transition-all active:scale-95 rounded-xl px-8 py-3 md:py-4 font-semibold text-base md:text-lg"
              >
                Return Home
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
