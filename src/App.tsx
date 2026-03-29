import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Trophy, XCircle, CheckCircle, Send, ArrowRight, Camera, User, Bot, AlertCircle, ShoppingBag, Terminal, Cpu } from 'lucide-react';
import LandingPage from './components/LandingPage';
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

interface InventoryItem {
  productId: string;
  productName: string;
  dealPrice: number;
  date: string;
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
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
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
      setInventory(data.inventory || []);

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
        handleAcceptDeal();
      }
    } catch (error) {
      console.error('Failed to send message', error);
      setIsTyping(false);
    }
  };

  const handleAcceptDeal = async () => {
    if (!session) return;
    try {
      const res = await fetch('/api/negotiate/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, playerName: playerName || 'Anonymous' })
      });
      const data = await res.json();
      if (data.success) {
        // Save locally for serverless persistence
        const localRanking = JSON.parse(localStorage.getItem('negotiation_ranking') || '[]');
        localStorage.setItem('negotiation_ranking', JSON.stringify([data.entry, ...localRanking]));

        setDebrief({ ...data.summary, entry: data.entry, type: 'deal' });
        setGameState('debrief');
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#34d399', '#ffffff'] });
        fetchProducts(playerName);
        fetchLeaderboard();
      }
    } catch (error) {
      console.error('Error accepting deal:', error);
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
    <div className="min-h-screen bg-brand-dark text-neutral-50 font-sans selection:bg-brand-emerald/30">
      <AnimatePresence mode="wait">
        {gameState === 'home' && (
          <LandingPage
            playerName={playerName}
            setPlayerName={setPlayerName}
            products={products}
            selectedProductId={selectedProductId}
            setSelectedProductId={setSelectedProductId}
            startSession={startSession}
            leaderboard={leaderboard}
            purchasedIds={purchasedIds}
            inventory={inventory}
          />
        )}

        {gameState === 'negotiating' && session && (
          <motion.div
            key="negotiating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-[100dvh] md:h-screen flex flex-col md:flex-row max-w-7xl mx-auto relative overflow-hidden font-sans"
          >
            {/* Left Panel - Mission HUD */}
            <div className="w-full md:w-80 p-4 md:p-6 border-b md:border-b-0 md:border-r border-white/5 flex flex-col bg-brand-surface/80 backdrop-blur-3xl z-10 shrink-0 max-h-[40%] md:max-h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-4 md:mb-8">
                <div className="flex flex-col">
                  <h2 className="text-[8px] md:text-[10px] font-black tracking-[0.4em] text-neutral-500 uppercase mb-1">Mission_Status</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-brand-emerald animate-pulse"></div>
                    <span className="text-xs md:text-sm font-black uppercase italic tracking-tighter">Active_Protocol</span>
                  </div>
                </div>
                <div className="flex gap-1.5 bg-black/40 p-2 border border-white/5">
                  {Array.from({ length: session.maxRounds }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-3 ${i < round ? 'bg-brand-emerald' : i === round ? 'bg-brand-emerald/40 animate-[pulse_1s_infinite] border border-brand-emerald' : 'bg-white/5'}`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4 md:space-y-6 mb-4 md:mb-12">
                <div className="p-3 md:p-4 border border-white/5 bg-black/20">
                  <p className="text-[8px] md:text-[9px] font-black text-neutral-600 uppercase tracking-[0.3em] mb-1 md:mb-2">Subject_Target</p>
                  <p className="text-sm md:text-xl font-black uppercase italic leading-none truncate">{session.product.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="p-3 md:p-4 border border-white/5 bg-black/20">
                    <p className="text-[8px] md:text-[9px] font-black text-neutral-600 uppercase tracking-[0.3em] mb-1 md:mb-2">Floor_Value</p>
                    <p className="text-sm md:text-lg font-mono text-neutral-400">${session.product.listedPrice.toLocaleString()}</p>
                  </div>
                  <div className="p-3 md:p-4 border border-brand-emerald/20 bg-brand-emerald/5">
                    <p className="text-[8px] md:text-[9px] font-black text-brand-emerald/50 uppercase tracking-[0.3em] mb-1 md:mb-2">Current_Offer</p>
                    <p className="text-base md:text-xl font-mono text-brand-emerald font-black italic">${currentOffer?.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="flex md:flex-col gap-2 md:gap-3 mt-auto">
                <button
                  onClick={() => handleAcceptDeal()}
                  className="flex-1 w-full bg-brand-emerald text-black py-3 md:py-4 font-black uppercase italic tracking-tighter hover:bg-white active:scale-95 transition-all text-[11px] md:text-sm flex items-center justify-center gap-2"
                >
                  Confirm_Acquisition
                </button>
                <button
                  onClick={() => handleWalkaway()}
                  className="flex-1 w-full bg-transparent border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 text-neutral-500 hover:text-red-500 py-3 md:py-4 font-black uppercase italic tracking-tighter active:scale-95 transition-all text-[10px] md:text-[11px] flex items-center justify-center gap-2"
                >
                  Abort_Mission
                </button>
              </div>
            </div>

            {/* Main Chat HUD */}
            <div className="flex-1 flex flex-col min-h-0 relative">
               {/* Aesthetic Scanline effect */}
              <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.3)_50%)] bg-[size:100%_4px] pointer-events-none opacity-20 z-0"></div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-12 space-y-6 md:space-y-8 custom-scrollbar relative z-10">
                {messages.map((msg, i) => (
                  <motion.div
                    initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i}
                    className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 flex items-center justify-center shrink-0 border ${msg.role === 'user' ? 'bg-white/10 border-white/20' : 'bg-brand-emerald/5 border-brand-emerald/30 text-brand-emerald'}`}>
                      {msg.role === 'user' ? <Terminal className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
                    </div>
                    <div className={`max-w-[85%] md:max-w-[70%] p-4 text-sm md:text-base leading-relaxed ${msg.role === 'user' ? 'bg-white/5 border border-white/10 text-white italic' : 'bg-brand-surface border border-white/5 text-neutral-300'}`}>
                      <div className="text-[8px] font-black uppercase tracking-[0.4em] text-neutral-600 mb-2">
                        {msg.role === 'user' ? 'Outgoing_Signal' : 'Incoming_Analysis'}
                      </div>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}

                {isTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                    <div className="w-8 h-8 flex items-center justify-center border bg-brand-emerald/5 border-brand-emerald/30 text-brand-emerald">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div className="bg-brand-surface border border-brand-emerald/20 p-4 flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-brand-emerald rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-brand-emerald rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-brand-emerald rounded-full animate-bounce [animation-delay:0.4s]" />
                      <span className="text-[8px] font-black tracking-widest text-brand-emerald uppercase animate-pulse ml-2">Processing_Counter_Logic</span>
                    </div>
                  </motion.div>
                )}
               <div ref={messagesEndRef} />
              </div>

              <div className="p-4 sm:p-8 md:p-12 bg-brand-dark/50 border-t border-white/5 relative z-10 backdrop-blur-xl">
                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                  className="max-w-4xl mx-auto relative flex items-center group"
                >
                  <div className="absolute left-3 md:left-4 z-10 text-brand-emerald opacity-40 group-focus-within:opacity-100 transition-opacity">
                    <Terminal className="w-4 h-4 md:w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="ENTER_INPUT..."
                    disabled={isTyping}
                    className="w-full bg-brand-surface border border-white/10 py-4 md:py-6 pl-10 md:pl-14 pr-14 md:pr-16 text-sm md:text-lg font-black uppercase tracking-widest focus:outline-none focus:border-brand-emerald/50 transition-all disabled:opacity-20 placeholder:text-neutral-800"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    className="absolute right-3 md:right-4 p-2 md:p-3 bg-brand-emerald text-black hover:bg-white active:scale-95 disabled:bg-neutral-900/50 transition-all"
                  >
                    <Send className="w-4 h-4 md:w-5 h-5" />
                  </button>
                </form>
                <div className="mt-3 md:mt-4 flex justify-between items-center text-[7px] md:text-[8px] font-black tracking-[0.4em] text-neutral-700 uppercase">
                  <span>Encr: AES-1024</span>
                  <span className="text-neutral-500">Iter: 0{round} / 0{session.maxRounds}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'debrief' && debrief && (
          <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-xl bg-brand-dark border border-white/10 p-5 sm:p-8 md:p-12 space-y-6 md:space-y-10 neo-dark-shadow relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-emerald/20 overflow-hidden">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-1/3 h-full bg-brand-emerald"
                ></motion.div>
              </div>

              <div className="text-center space-y-4">
                <div className="inline-block px-3 py-1 border border-brand-emerald/30 bg-brand-emerald/5 text-[10px] font-black uppercase tracking-[0.4em] text-brand-emerald mb-2">
                  Post_Action_Report
                </div>
                <h2 className="text-4xl md:text-6xl font-black uppercase italic leading-none tracking-tighter">Mission <br /> <span className={debrief.type === 'deal' ? 'text-brand-emerald' : 'text-red-500'}>{debrief.type === 'deal' ? 'Success' : 'Aborted'}</span></h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-white/5 border border-white/10 p-4 md:p-6 space-y-4">
                  <div>
                    <p className="text-[8px] md:text-[9px] font-black text-neutral-600 uppercase tracking-[0.3em] mb-1">Final_Deal</p>
                    <p className="text-lg md:text-2xl font-mono font-black text-brand-emerald">${debrief.entry?.dealPrice?.toLocaleString() || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] md:text-[9px] font-black text-neutral-600 uppercase tracking-[0.3em] mb-1">Score_Audit</p>
                    <p className="text-base md:text-lg font-mono font-bold">{debrief.entry?.score || 0}</p>
                  </div>
                </div>

                <div className="bg-brand-surface p-4 md:p-6 border border-white/5 flex flex-col justify-center">
                  <h3 className="font-black text-[10px] md:text-xs uppercase tracking-[0.3em] text-neutral-500 mb-3 md:mb-4">Internal_Analysis</h3>
                  <p className="text-xs md:text-sm text-neutral-400 leading-relaxed italic line-clamp-4">{debrief.insight}</p>
                  <div className="mt-4 pt-4 border-t border-neutral-800 space-y-2">
                    <div className="flex justify-between items-center text-[10px] md:text-xs">
                      <span className="text-neutral-600 uppercase font-bold tracking-widest">Archetype</span>
                      <span className="font-medium text-neutral-300">{debrief.archetype}</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => { setGameState('home'); setDebrief(null); setSession(null); }}
                className="w-full bg-white text-black py-4 md:py-6 font-black text-xl md:text-2xl uppercase tracking-tighter hover:bg-brand-emerald transition-all active:scale-[0.98]"
              >
                Return to Grid_
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
