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
    if (gameState === 'home') {
      fetchLeaderboard();
      fetchProducts(playerName);
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
      setPurchasedIds(data.purchased);
      
      // Auto-select first available product if none selected
      if (!selectedProductId || data.purchased.includes(selectedProductId)) {
        const firstAvailable = data.products.find((p: Product) => !data.purchased.includes(p.id));
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
            <div className="text-center mb-16">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent">
                Negotiation Master
              </h1>
              <p className="text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
                Face off against AI sellers with hidden constraints and distinct personalities. Secure the lowest price. Rank globally.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-16">
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 backdrop-blur-sm flex flex-col">
                <div className="mb-6">
                  <label className="block text-sm text-neutral-400 mb-2">Enter your alias for the leaderboard</label>
                  <input 
                    type="text" 
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Anonymous"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <Camera className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-xl font-medium">Available Items</h2>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar mb-6 max-h-[300px]">
                  {products.map((product) => {
                    const isPurchased = purchasedIds.includes(product.id);
                    const isSelected = selectedProductId === product.id;
                    return (
                      <div 
                        key={product.id}
                        onClick={() => !isPurchased && setSelectedProductId(product.id)}
                        className={`p-4 rounded-2xl border transition-all ${
                          isPurchased 
                            ? 'bg-neutral-950/50 border-neutral-900 opacity-50 cursor-not-allowed' 
                            : isSelected 
                              ? 'bg-emerald-900/20 border-emerald-500/50 cursor-pointer' 
                              : 'bg-neutral-950 border-neutral-800/50 hover:border-neutral-700 cursor-pointer'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className={`font-medium ${isPurchased ? 'line-through text-neutral-500' : ''}`}>{product.name}</p>
                            <p className="text-sm text-neutral-500 font-mono">${product.listedPrice.toLocaleString()}</p>
                          </div>
                          {isPurchased && (
                            <span className="text-xs uppercase tracking-wider bg-neutral-900 text-neutral-500 px-2 py-1 rounded-md font-semibold">
                              Purchased
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button 
                  onClick={startSession}
                  disabled={!selectedProductId || !playerName.trim()}
                  className="w-full bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-500 transition-colors rounded-xl py-4 font-semibold text-lg flex items-center justify-center gap-2 group mt-auto"
                >
                  Start Negotiating
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                {!playerName.trim() && (
                  <p className="text-xs text-red-400 mt-3 text-center">Please enter an alias to start.</p>
                )}
              </div>

              <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 backdrop-blur-sm flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  <h2 className="text-2xl font-medium">Global Leaderboard</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  {leaderboard.length === 0 ? (
                    <div className="text-center text-neutral-500 py-12">No deals closed yet. Be the first!</div>
                  ) : (
                    leaderboard.map((entry, i) => (
                      <div key={entry.id} className="flex items-center justify-between p-4 rounded-2xl bg-neutral-950 border border-neutral-800/50">
                        <div className="flex items-center gap-4">
                          <span className="text-neutral-500 font-mono w-4">{i + 1}</span>
                          <div>
                            <p className="font-medium">{entry.playerName}</p>
                            <p className="text-xs text-neutral-500">{entry.rounds} rounds</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-emerald-400">${entry.dealPrice.toLocaleString()}</p>
                          <p className="text-xs text-neutral-500">{entry.discountPct}% off</p>
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
            className="h-screen flex flex-col md:flex-row max-w-7xl mx-auto"
          >
            {/* Left Panel - Info */}
            <div className="w-full md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-neutral-800 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold tracking-tight">Negotiation</h2>
                <div className="flex gap-1">
                  {Array.from({ length: session.maxRounds }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-2 h-2 rounded-full ${i < round ? 'bg-emerald-500' : i === round ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-800'}`}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-neutral-900 rounded-2xl p-6 mb-6 border border-neutral-800">
                <p className="text-sm text-neutral-500 uppercase tracking-wider mb-1">Item</p>
                <p className="text-lg font-medium mb-4">{session.product.name}</p>
                
                <p className="text-sm text-neutral-500 uppercase tracking-wider mb-1">Listed Price</p>
                <p className="text-2xl font-mono text-neutral-300 mb-4">${session.product.listedPrice.toLocaleString()}</p>
                
                <p className="text-sm text-neutral-500 uppercase tracking-wider mb-1">Current Offer</p>
                <p className="text-3xl font-mono text-emerald-400">${currentOffer?.toLocaleString()}</p>
              </div>

              <div className="mt-auto space-y-3">
                <button 
                  onClick={() => handleAccept(currentOffer!)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-4 font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <CheckCircle className="w-5 h-5" />
                  Accept Deal
                </button>
                <button 
                  onClick={() => handleWalkaway()}
                  className="w-full bg-transparent border border-neutral-800 hover:bg-neutral-900 text-neutral-400 rounded-xl py-4 font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                  Walk Away
                </button>
              </div>
            </div>

            {/* Right Panel - Chat */}
            <div className="flex-1 flex flex-col bg-neutral-950/50">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.map((msg, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={i} 
                    className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-neutral-800' : 'bg-emerald-900/30 text-emerald-500'}`}>
                      {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-neutral-800 text-white rounded-tr-sm' : 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-tl-sm'}`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
                
                {isTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-900/30 text-emerald-500 flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                      <div className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-6 bg-neutral-950 border-t border-neutral-800">
                <form 
                  onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                  className="relative flex items-center"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Make your offer or argument..."
                    disabled={isTyping}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-6 pr-16 py-4 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
                  />
                  <button 
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    className="absolute right-2 p-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-800 text-white rounded-xl transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
                <p className="text-xs text-neutral-500 mt-3 text-center">
                  Round {round} of {session.maxRounds}. The seller evaluates your reasoning, not just the price.
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
            className="min-h-screen flex items-center justify-center p-6"
          >
            <div className="max-w-2xl w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 md:p-12 text-center">
              {debrief.type === 'deal' ? (
                <>
                  <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trophy className="w-10 h-10" />
                  </div>
                  <h2 className="text-4xl font-bold mb-2">Deal Closed!</h2>
                  <p className="text-xl text-neutral-400 mb-8">You secured a {debrief.entry.discountPct}% discount.</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-neutral-950 rounded-2xl p-6 border border-neutral-800">
                      <p className="text-sm text-neutral-500 uppercase tracking-wider mb-2">Final Price</p>
                      <p className="text-3xl font-mono text-emerald-400">${debrief.entry.dealPrice.toLocaleString()}</p>
                    </div>
                    <div className="bg-neutral-950 rounded-2xl p-6 border border-neutral-800">
                      <p className="text-sm text-neutral-500 uppercase tracking-wider mb-2">Score</p>
                      <p className="text-3xl font-mono text-white">{debrief.entry.score.toLocaleString()}</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle className="w-10 h-10" />
                  </div>
                  <h2 className="text-4xl font-bold mb-2">{debrief.forced ? 'Seller Walked Away' : 'You Walked Away'}</h2>
                  <p className="text-xl text-neutral-400 mb-8">No deal was reached this time.</p>
                </>
              )}

              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 text-left mb-8">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
                  <div>
                    <h3 className="font-medium text-lg mb-2">Post-Game Insight</h3>
                    <p className="text-neutral-400 leading-relaxed">{debrief.insight}</p>
                    <div className="mt-4 pt-4 border-t border-neutral-800 flex justify-between items-center">
                      <span className="text-sm text-neutral-500">Seller Archetype</span>
                      <span className="font-medium">{debrief.archetype}</span>
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-sm text-neutral-500">Hidden Floor Price</span>
                      <span className="font-mono text-red-400">${debrief.floorPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setGameState('home')}
                className="bg-white text-black hover:bg-neutral-200 transition-colors rounded-xl px-8 py-4 font-semibold text-lg"
              >
                Return to Home
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
