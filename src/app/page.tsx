"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowDown, ArrowUpRight, CircuitBoard, LockKeyhole, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { useRef, useState } from "react";

const PAYFENCE_FEATURES = [
  {
    id: "f1",
    title: "Payment Storm Simulator",
    subtitle: "Real-time idempotency",
    description: "One click makes an agent retry the same payment 3–5×. The dashboard shows '5 attempts → 1 payment, 1 ledger entry' in real time. Proves idempotency live instead of claiming it.",
  },
  {
    id: "f2",
    title: "Burner credentials",
    subtitle: "Bounded by construction",
    description: "Every mandate mints exactly one Razorpay order, scoped to merchant + amount + expiry. It dies after use or validity window.",
  },
  {
    id: "f3",
    title: "Trust tiers",
    subtitle: "Live tightening",
    description: "Dispute a transaction and watch the agent's effective limit shrink on the dashboard in real time. Makes the trust score visceral.",
  },
  {
    id: "f4",
    title: "Kill switch",
    subtitle: "Instant accountability",
    description: "Freeze an agent across ALL its mandates instantly. A one-tap global pause for rogue agents.",
  },
  {
    id: "f5",
    title: "Receipt-vs-mandate",
    subtitle: "Cryptographic reconciliation",
    description: "Turns attribution from a log file into a user-facing proof: 'You authorised X · You were charged Y · MATCH ✓'.",
  },
  {
    id: "f6",
    title: "Quote registry",
    subtitle: "Pre-payment verification",
    description: "Merchants register signed quotes. The gateway verifies the agent's price against the signed quote before any funds move.",
  },
  {
    id: "f7",
    title: "Monad-anchored",
    subtitle: "Tamper-evident audit",
    description: "Every ledger batch hash is verifiable on-chain with a testnet explorer link directly in the dashboard.",
  },
  {
    id: "f8",
    title: "Approval inbox",
    subtitle: "Human-in-the-loop",
    description: "When a payment pauses, the user sees context: mandate excerpt, agent tier, and price vs signed quote—then approves with a passkey.",
  },
];

const cardTones = ["cyan", "gold", "emerald", "violet", "blue", "cyan", "gold", "emerald"] as const;

function HoloCard({ feature, index, progress, active, onOpen }: { feature: (typeof PAYFENCE_FEATURES)[number]; index: number; progress: ReturnType<typeof useSpring>; active: boolean; onOpen: () => void }) {
  const card = { name: feature.title, type: feature.subtitle.toUpperCase(), number: `•••• ${String(index + 1).padStart(4, "0")}`, tone: cardTones[index], amount: `0${index + 1}` };
  const revealY = useTransform(progress, [0, 0.3], [330, 0]);
  const x = (index - (PAYFENCE_FEATURES.length - 1) / 2) * 154;
  const rotation = (index - (PAYFENCE_FEATURES.length - 1) / 2) * 4;
  const spreadX = useTransform(progress, [0.3, 0.6], [0, x]);
  const spreadRotate = useTransform(progress, [0.3, 0.6], [0, rotation]);
  const orbitRotate = useTransform(progress, [0.6, 1], [rotation, (index - 3.5) * 45]);
  const orbitZ = useTransform(progress, [0.6, 1], [0, 500]);
  const opacity = useTransform(progress, [0, 0.08], [0, 1]);
  return (
    <motion.article
      className={`holo-card card-${card.tone} ${active ? "card-placeholder" : ""}`}
      layoutId={`feature-card-${feature.id}`}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpen(); }}
      style={{ y: revealY, x: spreadX, rotate: spreadRotate, rotateY: orbitRotate, translateZ: orbitZ, opacity: active ? 0 : opacity, zIndex: 10 - Math.abs(index - 3.5) }}
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
  const [activeCard, setActiveCard] = useState<(typeof PAYFENCE_FEATURES)[number] | null>(null);
  const [isOrbit, setIsOrbit] = useState(false);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.35 });
  useMotionValueEvent(progress, "change", (value) => setIsOrbit(value >= 0.6));
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
        <motion.div className="orbit-label" style={{ opacity: orbitLabelOpacity }}><Sparkles size={14} /> MANDATES IN ORBIT <span>08 ACTIVE CREDENTIALS</span></motion.div>
        <motion.div className="wallet-stage" style={{ scale: stageScale }}>
          <motion.div className={`cards-orbit ${isOrbit ? "cards-orbit-draggable" : ""}`} drag={isOrbit ? "x" : false} dragConstraints={{ left: -420, right: 420 }} dragElastic={0.12} dragMomentum={false}>
            {PAYFENCE_FEATURES.map((feature, index) => <HoloCard key={feature.id} feature={feature} index={index} progress={progress} active={activeCard?.id === feature.id} onOpen={() => setActiveCard(feature)} />)}
          </motion.div>
          <motion.div className="leather-wallet" style={{ y: walletY, scale: walletScale }}>
            <div className="wallet-stitch" /><div className="wallet-slot"><div className="slot-glow" /></div><div className="wallet-body"><div className="wallet-mark">PF</div><span>PAYFENCE</span></div>
          </motion.div>
          <div className="stage-shadow" />
        </motion.div>
        <div className="stage-footer"><span><LockKeyhole size={13} /> HMAC-SHA256 VERIFIED</span><span><ShieldCheck size={13} /> TAMPER-EVIDENT BY DESIGN</span><span>SCROLL PROGRESS <b>01—100</b></span></div>
      </section>
      <AnimatePresence>
        {activeCard && (
          <motion.div className="feature-modal-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveCard(null)}>
            <motion.div className="feature-modal-backdrop" onClick={() => setActiveCard(null)} />
            <motion.article className={`feature-modal card-${cardTones[PAYFENCE_FEATURES.findIndex((item) => item.id === activeCard.id)]}`} layoutId={`feature-card-${activeCard.id}`} onClick={(event) => event.stopPropagation()}>
              <button className="modal-close" onClick={() => setActiveCard(null)} aria-label="Close feature">×</button>
              <div className="modal-kicker"><span /> PAYFENCE KILLER FEATURE</div>
              <div className="modal-index">0{PAYFENCE_FEATURES.findIndex((item) => item.id === activeCard.id) + 1} / 08</div>
              <h2>{activeCard.title}</h2>
              <p className="modal-subtitle">{activeCard.subtitle}</p>
              <p className="modal-description">{activeCard.description}</p>
              <div className="modal-proof"><ShieldCheck size={17} /><span>Verified at the gateway</span><b>ACTIVE</b></div>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
      <section className="after-scene"><div><span className="eyebrow-line"><span /> THE FENCE</span><h2>Trust is not a feeling.<br /><em>It is a system.</em></h2></div><div className="after-grid"><div><CircuitBoard /><b>Bounded credentials</b><p>Every mandate mints a scoped, single-use payment rail.</p></div><div><WalletCards /><b>Deterministic gates</b><p>Every retry, quote, and ceiling is verified before money moves.</p></div><div><ArrowUpRight /><b>Permanent proof</b><p>Every decision becomes a hash-chained, verifiable record.</p></div></div></section>
    </main>
  );
}
