"use client";

import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowDown, ArrowUpRight, CircuitBoard, LockKeyhole, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { useRef } from "react";

const cards = [
  { name: "ShopBot", type: "GROCERY MANDATE", number: "•••• 2048", tone: "cyan", amount: "₹2,000", rotation: -14, x: -390 },
  { name: "TravelGenie", type: "TRAVEL MANDATE", number: "•••• 7712", tone: "gold", amount: "₹10,000", rotation: -7, x: -195 },
  { name: "Core treasury", type: "SETTLEMENT RAIL", number: "•••• 4861", tone: "emerald", amount: "₹50,000", rotation: 0, x: 0 },
  { name: "Razorpay rail", type: "BURNER CREDENTIAL", number: "•••• 9034", tone: "violet", amount: "₹1,240", rotation: 7, x: 195 },
  { name: "Monad anchor", type: "AUDIT BATCH", number: "•••• 10143", tone: "blue", amount: "LIVE", rotation: 14, x: 390 },
];

function HoloCard({ card, index, progress }: { card: (typeof cards)[number]; index: number; progress: ReturnType<typeof useSpring> }) {
  const revealY = useTransform(progress, [0, 0.3], [330, 0]);
  const spreadX = useTransform(progress, [0.3, 0.6], [0, card.x]);
  const spreadRotate = useTransform(progress, [0.3, 0.6], [0, card.rotation]);
  const orbitRotate = useTransform(progress, [0.6, 1], [card.rotation, (index - 2) * 72]);
  const orbitZ = useTransform(progress, [0.6, 1], [0, 500]);
  const opacity = useTransform(progress, [0, 0.08], [0, 1]);
  return (
    <motion.article
      className={`holo-card card-${card.tone}`}
      style={{ y: revealY, x: spreadX, rotate: spreadRotate, rotateY: orbitRotate, translateZ: orbitZ, opacity, zIndex: 10 - Math.abs(index - 2) }}
    >
      <div className="card-shine" />
      <div className="card-top"><span className="card-chip" /><span className="card-contact">◌</span></div>
      <div className="card-label">{card.type}</div>
      <div className="card-name">{card.name}</div>
      <div className="card-number">{card.number}</div>
      <div className="card-bottom"><span>{card.amount}</span><span className="card-symbol">PF</span></div>
    </motion.article>
  );
}

export default function Home() {
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.35 });
  const titleY = useTransform(progress, [0, 0.25], [0, -75]);
  const titleOpacity = useTransform(progress, [0, 0.22], [1, 0]);
  const stageScale = useTransform(progress, [0, 0.5, 1], [0.86, 1, 0.92]);
  const walletY = useTransform(progress, [0, 0.32], [0, 80]);
  const walletScale = useTransform(progress, [0, 0.32], [1, 1.12]);
  const hintOpacity = useTransform(progress, [0, 0.12], [1, 0]);
  const orbitLabelOpacity = useTransform(progress, [0.62, 0.76], [0, 1]);

  return (
    <main className="cinematic-page" ref={trackRef}>
      <div className="grainless-void" />
      <header className="cinema-nav"><div className="cinema-brand"><span>PF</span> PAYFENCE</div><div className="nav-center">PAYMENT RELIABILITY LAYER</div><div className="nav-right"><span className="status-pip" /> MONAD TESTNET <span className="nav-divider" /> <span>01 / 03</span></div></header>
      <section className="sticky-stage">
        <div className="stage-grid" />
        <motion.div className="story-copy" style={{ y: titleY, opacity: titleOpacity }}>
          <div className="eyebrow-line"><span /> THE WALLET OF AGENTIC COMMERCE</div>
          <h1>Every instruction.<br /><em>Held to account.</em></h1>
          <p>Signed mandates, bounded credentials, and a ledger that remembers everything.</p>
          <motion.div className="scroll-hint" style={{ opacity: hintOpacity }}><ArrowDown size={14} /> SCROLL TO REVEAL</motion.div>
        </motion.div>
        <motion.div className="orbit-label" style={{ opacity: orbitLabelOpacity }}><Sparkles size={14} /> MANDATES IN ORBIT <span>05 ACTIVE CREDENTIALS</span></motion.div>
        <motion.div className="wallet-stage" style={{ scale: stageScale }}>
          <div className="cards-orbit">
            {cards.map((card, index) => <HoloCard key={card.name} card={card} index={index} progress={progress} />)}
          </div>
          <motion.div className="leather-wallet" style={{ y: walletY, scale: walletScale }}>
            <div className="wallet-stitch" /><div className="wallet-slot"><div className="slot-glow" /></div><div className="wallet-body"><div className="wallet-mark">PF</div><span>PAYFENCE</span></div>
          </motion.div>
          <div className="stage-shadow" />
        </motion.div>
        <div className="stage-footer"><span><LockKeyhole size={13} /> HMAC-SHA256 VERIFIED</span><span><ShieldCheck size={13} /> TAMPER-EVIDENT BY DESIGN</span><span>SCROLL PROGRESS <b>01—100</b></span></div>
      </section>
      <section className="after-scene"><div><span className="eyebrow-line"><span /> THE FENCE</span><h2>Trust is not a feeling.<br /><em>It is a system.</em></h2></div><div className="after-grid"><div><CircuitBoard /><b>Bounded credentials</b><p>Every mandate mints a scoped, single-use payment rail.</p></div><div><WalletCards /><b>Deterministic gates</b><p>Every retry, quote, and ceiling is verified before money moves.</p></div><div><ArrowUpRight /><b>Permanent proof</b><p>Every decision becomes a hash-chained, verifiable record.</p></div></div></section>
    </main>
  );
}
