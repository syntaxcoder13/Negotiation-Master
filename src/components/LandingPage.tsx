import { motion, useScroll, useTransform } from 'motion/react';
import { Trophy, ArrowRight, Shield, Zap, LayoutGrid, User, Cpu, Terminal, Layers, Activity } from 'lucide-react';
import { useRef } from 'react';

interface Product {
  id: string;
  name: string;
  listedPrice: number;
  currency: string;
  image: string;
}

interface InventoryItem {
  productId: string;
  productName: string;
  dealPrice: number;
  date: string;
}

interface LandingPageProps {
  playerName: string;
  setPlayerName: (name: string) => void;
  products: Product[];
  selectedProductId: string | null;
  setSelectedProductId: (id: string) => void;
  startSession: () => void;
  leaderboard: any[];
  purchasedIds: string[];
  inventory: InventoryItem[];
}

export default function LandingPage({
  playerName,
  setPlayerName,
  products,
  selectedProductId,
  setSelectedProductId,
  startSession,
  leaderboard,
  purchasedIds,
  inventory
}: LandingPageProps) {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  return (
    <div ref={containerRef} className="bg-brand-dark text-neutral-50 min-h-screen overflow-x-hidden selection:bg-brand-emerald/30">
      {/* Dynamic Background */}
      <motion.div
        style={{ y: backgroundY }}
        className="fixed inset-0 -z-10 pointer-events-none"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </motion.div>

      {/* Nav */}
      <nav className="flex justify-between items-center px-6 py-6 border-b border-white/5 backdrop-blur-xl sticky top-0 z-50">
        <div className="font-display font-black text-2xl tracking-[0.2em] flex items-center gap-3 italic">
          <div className="w-10 h-10 bg-brand-emerald/10 border border-brand-emerald/30 flex items-center justify-center relative group">
            <div className="absolute inset-0 bg-brand-emerald/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Shield className="w-5 h-5 text-brand-emerald" />
          </div>
          NEGOTIATION <span className="text-brand-emerald font-light">MASTER</span>
        </div>

        <div className="hidden lg:flex items-center gap-10 text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-500">
          <a href="#archetype" className="hover:text-brand-emerald transition-colors">Archetype.sys</a>
          {inventory.length > 0 && <a href="#vault" className="text-brand-emerald animate-pulse">My_Vault.sys</a>}
          <a href="#entity" className="hover:text-brand-emerald transition-colors">Entity.db</a>
          <a href="#ledger" className="hover:text-brand-emerald transition-colors">Ledger.log</a>
          <a href="#terminal" className="hover:text-brand-emerald transition-colors">Terminal.io</a>
        </div>

        <button className="px-6 py-2 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
          Connect_
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-48 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="relative mb-12"
        >
          <div className="absolute inset-0 bg-brand-emerald/20 blur-[120px] rounded-full -z-10 animate-pulse"></div>
          <div className="border border-brand-emerald/20 bg-brand-emerald/5 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.4em] text-brand-emerald mb-8 inline-block backdrop-blur-sm">
            Neural Negotiation Engine v4.0
          </div>
          <h1 className="text-7xl md:text-[8rem] xl:text-[10rem] font-black leading-none tracking-tight uppercase italic mb-8">
            Negotiation <br />
            <span className="text-brand-emerald">Master</span>
          </h1>
          <p className="text-lg md:text-2xl text-neutral-400 font-medium max-w-2xl mx-auto leading-relaxed mb-16 px-4">
            Master the psychology of trade. Face advanced AI sellers, manipulate the margin, and secure your place in the global ledger.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button
              onClick={() => document.getElementById('terminal')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-brand-emerald text-black px-12 py-5 font-black text-xl uppercase tracking-tighter hover:bg-white hover:scale-105 transition-all relative group"
            >
              Initialize Game
              <div className="absolute inset-0 border-2 border-brand-emerald opacity-0 group-hover:opacity-100 group-hover:inset-[-6px] transition-all"></div>
            </button>
            <button
              onClick={() => document.getElementById('ledger')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white/5 border border-white/10 px-12 py-5 font-black text-xl uppercase tracking-tighter hover:bg-white/10 transition-all backdrop-blur-md"
            >
              View Ledger
            </button>
          </div>
        </motion.div>

        {/* Modular Grid Background decoration */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-4 w-full max-w-4xl mt-12 opacity-30 select-none pointer-events-none">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="aspect-square border border-white/10 bg-white/5 relative flex items-center justify-center overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-1 bg-brand-emerald"></div>
              {i % 3 === 0 && <Activity className="w-4 h-4 text-brand-emerald/40 animate-pulse" />}
            </div>
          ))}
        </div>
      </section>

      {/* Archetypes Section */}
      <section id="archetype" className="py-24 border-y border-white/5 bg-brand-surface/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
            <h3 className="text-3xl font-black uppercase tracking-tighter italic">Merchant <span className="text-brand-emerald">Profiles</span></h3>
            <div className="h-px flex-1 bg-white/10 hidden md:block mx-8 text-[8px] font-bold text-neutral-800 uppercase tracking-[1em]">Scanning_Neural_Nodes</div>
            <div className="text-[10px] font-bold uppercase text-brand-emerald flex items-center gap-2">
              <Activity className="w-4 h-4" /> 5 Archetypes Detected
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { id: "anchor", name: "The Anchor", risk: "HIGH", desc: "Opens high, concedes slowly. Very stubborn." },
              { id: "eager", name: "The Closer", risk: "LOW", desc: "Wants a deal fast, drops early. Impatient." },
              { id: "craftsman", name: "The Artisan", risk: "MED", desc: "Responds to quality arguments, values appreciation." },
              { id: "skeptic", name: "The Skeptic", risk: "HIGH", desc: "Requires proof, resistant to flattery." },
              { id: "gambler", name: "The Gambler", risk: "V-HIGH", desc: "Unpredictable concessions. Mood-driven." }
            ].map((arch, i) => (
              <motion.div
                key={arch.id}
                whileHover={{ y: -5 }}
                className="bg-brand-dark/40 border border-white/5 p-6 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                  <Cpu className="w-12 h-12" />
                </div>
                <div className="text-[8px] font-black tracking-widest text-neutral-500 uppercase mb-4">Neural_ID: 0{i + 1}</div>
                <h4 className="text-xl font-black uppercase italic mb-2 group-hover:text-brand-emerald transition-colors">{arch.name}</h4>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[8px] font-bold text-neutral-600 uppercase">Risk_Level:</span>
                  <span className={`text-[8px] font-black px-1.5 py-0.5 border ${arch.risk === 'V-HIGH' ? 'border-red-500 text-red-500' : arch.risk === 'HIGH' ? 'border-orange-500 text-orange-500' : 'border-brand-emerald text-brand-emerald'}`}>{arch.risk}</span>
                </div>
                <p className="text-[11px] text-neutral-500 font-medium leading-relaxed italic">{arch.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* My Vault Section - Conditional */}
      {inventory.length > 0 && (
        <section id="vault" className="py-24 px-6 border-t border-white/5 bg-gradient-to-b from-brand-emerald/5 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4">
              <div>
                <h3 className="text-3xl font-black uppercase italic text-brand-emerald">Private_Vault.sys</h3>
                <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mt-1">Authorized User: {playerName}</p>
              </div>
              <div className="flex items-center gap-8 bg-black/40 border border-white/5 px-6 py-3">
                <div className="text-center">
                  <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Assets_Acquired</p>
                  <p className="text-xl font-black text-white">{inventory.length}</p>
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div className="text-center">
                  <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Total_Value</p>
                  <p className="text-xl font-black text-brand-emerald">${inventory.reduce((sum, item) => sum + item.dealPrice, 0).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {inventory.map((item, i) => {
                const baseProduct = products.find(p => p.id === item.productId);
                return (
                  <motion.div
                    key={item.productId}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-brand-surface/40 border-2 border-brand-emerald/20 p-4 relative group"
                  >
                    <div className="absolute top-2 right-2 flex gap-1">
                      <div className="w-1 h-1 bg-brand-emerald"></div>
                      <div className="w-1 h-1 bg-brand-emerald animate-pulse"></div>
                    </div>

                    <div className="aspect-square mb-4 bg-brand-dark/50 border border-white/5 overflow-hidden flex items-center justify-center p-4">
                      {baseProduct ? (
                        <img src={baseProduct.image} alt={item.productName} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" />
                      ) : (
                        <Layers className="w-12 h-12 text-neutral-800" />
                      )}
                    </div>

                    <h4 className="text-xs font-black uppercase italic tracking-wider truncate mb-2">{item.productName}</h4>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Acq_Price</p>
                        <p className="text-sm font-mono text-brand-emerald">${item.dealPrice.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Secure_Date</p>
                        <p className="text-[10px] text-neutral-500">{new Date(item.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* The Grid / Marketplace Section */}
      <section id="entity" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-end mb-24 gap-8">
            <div className="flex-1">
              <div className="text-brand-emerald text-xs font-black uppercase tracking-[0.5em] mb-4 flex items-center gap-2">
                <span className="w-12 h-px bg-brand-emerald"></span> Modular Exchange
              </div>
              <h2 className="text-6xl md:text-8xl font-black uppercase leading-none tracking-tighter italic">High-Stakes <br /> <span className="text-brand-emerald font-light">Inventory</span></h2>
            </div>
            <p className="text-neutral-500 font-medium max-w-sm text-right lg:mb-4">
              Exclusive modular sets currently locked in the negotiation chamber. Select an entity to begin protocol.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 px-1 bg-white/5" id="marketplace">
            {products.map((product) => {
              const isPurchased = (purchasedIds || []).includes(product.id);
              const isSelected = selectedProductId === product.id;
              return (
                <motion.div
                  key={product.id}
                  whileHover={{ backgroundColor: 'rgba(16, 185, 129, 0.08)' }}
                  onClick={() => !isPurchased && setSelectedProductId(product.id)}
                  className={`relative p-8 transition-all cursor-pointer group bg-brand-dark/80 min-h-[400px] flex flex-col justify-between ${isSelected ? 'ring-2 ring-brand-emerald ring-inset bg-brand-emerald/5' : ''}`}
                >
                  <div className="flex justify-between items-start z-10">
                    <div>
                      <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.3em] mb-1">Entity-0{products.indexOf(product) + 1}</div>
                      <h3 className="text-2xl font-black uppercase italic group-hover:text-brand-emerald transition-colors">{product.name}</h3>
                    </div>
                    {isPurchased ? (
                      <div className="border border-red-500/50 text-red-500 px-3 py-1 text-[8px] font-black uppercase bg-red-500/10">Collected</div>
                    ) : (
                      <div className="text-brand-emerald font-mono text-sm">${product.listedPrice.toLocaleString()}</div>
                    )}
                  </div>

                  <div className="relative mt-auto h-48 flex items-center justify-center overflow-hidden">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 2 }}
                      className="w-full h-full relative z-10"
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className={`w-full h-full object-cover mix-blend-luminosity hover:mix-blend-normal transition-all duration-700 ${isPurchased ? 'opacity-20' : 'opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100'}`}
                      />
                    </motion.div>
                    <div className="absolute bottom-0 left-0 text-[6rem] font-black text-white/[0.03] select-none uppercase tracking-tighter -mb-8 leading-none">
                      BRICK
                    </div>
                  </div>

                  {isSelected && !isPurchased && (
                    <motion.div
                      layoutId="active-indicator"
                      className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-brand-emerald"
                    ></motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Global Ledger Section */}
      <section id="ledger" className="py-32 border-t border-white/5 bg-brand-dark/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start mb-16 gap-8">
            <div>
              <div className="text-brand-emerald text-xs font-black uppercase tracking-[0.5em] mb-4 flex items-center gap-2">
                <span className="w-12 h-px bg-brand-emerald"></span> Verified Transactions
              </div>
              <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic">Global <span className="text-brand-emerald">Ledger</span></h2>
            </div>
            <div className="bg-white/5 p-6 border border-white/10 max-w-xs">
              <div className="flex items-center gap-3 text-brand-emerald mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Network_Stats</span>
              </div>
              <div className="text-xs text-neutral-500 font-medium leading-relaxed">
                Showing top 50 verified acquisitions. Data is immutable and synchronized across the neural grid.
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500">
                  <th className="py-6 px-4">Rank_</th>
                  <th className="py-6 px-4">Entity.Alias</th>
                  <th className="py-6 px-4">Deal_Price</th>
                  <th className="py-6 px-4">Rounds</th>
                  <th className="py-6 px-4">Efficiency</th>
                  <th className="py-6 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm">
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-24 text-center text-neutral-600 text-[10px] font-bold uppercase tracking-widest">
                      No data detected in the local ledger.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((entry, i) => (
                    <motion.tr
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      viewport={{ once: true }}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="py-6 px-4 text-brand-emerald font-black">#0{i + 1}</td>
                      <td className="py-6 px-4 text-neutral-200 uppercase font-black tracking-wider group-hover:text-brand-emerald">
                        {entry.playerName}
                      </td>
                      <td className="py-6 px-4 text-white font-black">
                        ${entry.dealPrice.toLocaleString()}
                      </td>
                      <td className="py-6 px-4 text-neutral-400">
                        {entry.rounds} <span className="text-[8px] uppercase opacity-50">Iter</span>
                      </td>
                      <td className="py-6 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-emerald" style={{ width: `${entry.discountPct}%` }}></div>
                          </div>
                          <span className="text-brand-emerald text-[10px] font-black">{entry.discountPct}%</span>
                        </div>
                      </td>
                      <td className="py-6 px-4 text-right text-neutral-600 text-[10px] uppercase font-bold tracking-widest">
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Terminal Footer */}
      <section id="terminal" className="py-32 bg-brand-surface/40 border-t border-white/5 relative overflow-hidden">
        {/* Aesthetic scanline */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[size:100%_4px] pointer-events-none opacity-20"></div>

        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <div className="bg-brand-dark border border-white/10 p-1 md:p-2 neo-dark-shadow">
            <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex items-center justify-between text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
              <span>System_Access.exe</span>
              <span className="text-brand-emerald animate-pulse">Running_</span>
            </div>
            <div className="p-8 md:p-12 space-y-12">
              <div className="space-y-4">
                <h3 className="text-4xl md:text-6xl font-black uppercase italic leading-none">Login Credentials</h3>
                <p className="text-neutral-500 text-sm max-w-md">Initialize your neural signature to enter the negotiation grid. High variance detected.</p>
              </div>

              <div className="flex flex-col gap-6">
                <div className="relative group">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="ENTER_ALIAS_HERE..."
                    className="w-full bg-transparent border-b-2 border-white/10 py-6 text-2xl font-black uppercase tracking-[0.2em] focus:outline-none focus:border-brand-emerald transition-all placeholder:text-neutral-800"
                  />
                  <div className="absolute bottom-0 left-0 h-[2px] bg-brand-emerald w-0 group-focus-within:w-full transition-all duration-500"></div>
                </div>

                <button
                  onClick={startSession}
                  disabled={!selectedProductId || !playerName.trim()}
                  className="w-full bg-white text-black py-6 font-black text-2xl uppercase tracking-tighter hover:bg-brand-emerald active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale cursor-pointer"
                >
                  Initiate Protocol {selectedProductId && `(${selectedProductId.toUpperCase()})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="py-12 border-t border-white/5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">
          <div className="flex items-center gap-4">
            <span>© 2026 NEGOTIATION MASTER</span>
            <span className="h-4 w-px bg-white/10"></span>
            <span>Proprietary AI Engine</span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-brand-emerald">Discord.io</a>
            <a href="#" className="hover:text-brand-emerald">Matrix.net</a>
            <a href="#" className="hover:text-brand-emerald">Logs.api</a>
          </div>
          <div className="text-neutral-800">
            Session_09182-AX.4
          </div>
        </div>
      </footer>

      <style>{`
        .outline-text {
          -webkit-text-stroke: 1px rgba(255,255,255,0.1);
          color: transparent;
        }
        @media (min-width: 768px) {
          .outline-text {
            -webkit-text-stroke: 2px rgba(255,255,255,0.1);
          }
        }
      `}</style>
    </div>
  );
}
