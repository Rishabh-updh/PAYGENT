"use client";

import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";
import { ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import OverviewPage from "./dashboard/page";

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

const AMBIENT_ITEMS = [
  { label: "Verified Mandate", tone: "cyan", path: "shield" },
  { label: "Autonomous Agent", tone: "gold", path: "robot" },
  { label: "Cryptographic Receipt", tone: "violet", path: "receipt" },
  { label: "Digital Currency", tone: "emerald", path: "coin" },
  { label: "Identity Hash", tone: "blue", path: "fingerprint" },
  { label: "Ledger Log", tone: "gold", path: "audit" },
  { label: "Expiry Window", tone: "cyan", path: "clock" },
  { label: "Verified Mandate", tone: "violet", path: "shield" },
  { label: "Autonomous Agent", tone: "emerald", path: "robot" },
] as const;

const AMBIENT_POSITIONS = [
  [7, 22], [22, 13], [39, 19], [58, 14], [78, 22], [91, 34], [88, 68], [70, 83], [49, 88],
  [27, 82], [9, 67], [3, 44], [16, 37], [33, 29], [52, 25], [71, 34], [84, 50], [76, 65],
  [57, 76], [36, 72], [19, 57], [12, 49], [29, 18], [47, 9], [67, 19], [94, 55], [61, 92],
] as const;

function AmbientGlyph({ path }: { path: (typeof AMBIENT_ITEMS)[number]["path"] }) {
  const common = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (path === "shield") return <svg viewBox="0 0 48 48" aria-hidden="true"><path {...common} strokeWidth="2" d="M24 44s16-8 16-20V10l-16-6-16 6v14c0 12 16 20 16 20z"/><path {...common} strokeWidth="2" d="m18 24 4 4 8-8"/></svg>;
  if (path === "robot") return <svg viewBox="0 0 48 48" aria-hidden="true"><rect {...common} strokeWidth="2" x="8" y="20" width="32" height="20" rx="4"/><path {...common} strokeWidth="2" d="M14 20v-4c0-3.3 2.7-6 6-6h8c3.3 0 6 2.7 6 6v4M24 10V4m-4 0h8"/><circle {...common} strokeWidth="1.5" cx="18" cy="28" r="2"/><circle {...common} strokeWidth="1.5" cx="30" cy="28" r="2"/><path {...common} strokeWidth="2" d="M20 34h8"/></svg>;
  if (path === "receipt") return <svg viewBox="0 0 48 48" aria-hidden="true"><path {...common} strokeWidth="2" d="M12 6v36l4-2 4 2 4-2 4 2 4-2 4 2 4-2V6H12z"/><path {...common} strokeWidth="2" d="M20 18h12M20 26h12M20 34h6"/></svg>;
  if (path === "coin") return <svg viewBox="0 0 48 48" aria-hidden="true"><circle {...common} strokeWidth="2" cx="24" cy="24" r="16"/><path {...common} strokeWidth="2" d="M24 14v20M18 20h12M18 28h12"/></svg>;
  if (path === "fingerprint") return <svg viewBox="0 0 48 48" aria-hidden="true"><path {...common} strokeWidth="2" d="M12 28c0-8.8 7.2-16 16-16s16 7.2 16 16M16 28c0-6.6 5.4-12 12-12s12 5.4 12 12M20 28c0-4.4 3.6-8 8-8s8 3.6 8 8M24 28v-4"/></svg>;
  if (path === "audit") return <svg viewBox="0 0 48 48" aria-hidden="true"><rect {...common} strokeWidth="2" x="12" y="8" width="24" height="32" rx="2"/><path {...common} strokeWidth="2" d="M12 18h24M18 26h12M18 32h8"/></svg>;
  if (path === "clock") return <svg viewBox="0 0 48 48" aria-hidden="true"><circle {...common} strokeWidth="2" cx="24" cy="24" r="16"/><polyline {...common} strokeWidth="2" points="24 14 24 24 30 28"/></svg>;
  return <svg viewBox="0 0 48 48" aria-hidden="true"><circle {...common} strokeWidth="2" cx="24" cy="24" r="10"/></svg>;
}

function AmbientIcon({ item, index }: { item: (typeof AMBIENT_ITEMS)[number]; index: number }) {
  const magneticX = useMotionValue(0);
  const magneticY = useMotionValue(0);
  const springX = useSpring(magneticX, { stiffness: 70, damping: 18, mass: 0.8 });
  const springY = useSpring(magneticY, { stiffness: 70, damping: 18, mass: 0.8 });
  const drift = [
    { x: [0, 32, -18, 0], y: [0, -18, 28, 0] },
    { x: [0, -26, 18, 0], y: [0, 24, -14, 0] },
    { x: [0, 22, -30, 0], y: [0, 18, 32, 0] },
  ][index % 3];

  return (
    <motion.div
      className={`ambient-icon ambient-${item.tone} ambient-path-${item.path}`}
      style={{
        left: `${AMBIENT_POSITIONS[index % AMBIENT_POSITIONS.length][0]}%`,
        top: `${AMBIENT_POSITIONS[index % AMBIENT_POSITIONS.length][1]}%`,
        translateX: springX,
        translateY: springY,
      }}
      animate={drift}
      transition={{ duration: 12 + index * 0.7, repeat: Infinity, ease: "easeInOut", delay: index * -0.8 }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.parentElement?.getBoundingClientRect();
        if (!rect) return;
        magneticX.set((event.clientX - rect.left - rect.width / 2) * 0.035);
        magneticY.set((event.clientY - rect.top - rect.height / 2) * 0.035);
      }}
      onPointerLeave={() => {
        magneticX.set(0);
        magneticY.set(0);
      }}
      title={item.label}
      aria-label={item.label}
    >
      <AmbientGlyph path={item.path} />
    </motion.div>
  );
}

/* ─── Magnetic HoloCard ─── */
function HoloCard({
  feature,
  index,
  progress,
  orbitRotation,
  active,
  radius,
  verticalRadius,
  onOpen,
}: {
  feature: (typeof PAYFENCE_FEATURES)[number];
  index: number;
  progress: ReturnType<typeof useSpring>;
  orbitRotation: ReturnType<typeof useMotionValue<number>>;
  active: boolean;
  radius: number;
  verticalRadius: number;
  onOpen: () => void;
}) {
  const card = {
    name: feature.title,
    type: feature.subtitle.toUpperCase(),
    number: `•••• ${String(index + 1).padStart(4, "0")}`,
    tone: cardTones[index],
    amount: `0${index + 1}`,
  };

  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  /* ── Magnetic cursor tracking (spring-based) ── */
  const magnetX = useMotionValue(0);
  const magnetY = useMotionValue(0);
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);

  // Fluid spring config — lower stiffness + higher damping = smooth, natural tracking
  const springX = useSpring(magnetX, { stiffness: 120, damping: 14, mass: 0.5 });
  const springTiltX = useSpring(tiltX, { stiffness: 150, damping: 16, mass: 0.35 });
  const springTiltY = useSpring(tiltY, { stiffness: 150, damping: 16, mass: 0.35 });

  /* ── Pop-out hover springs (scale + lift) ── */
  const hoverScale = useMotionValue(1);
  const hoverLift = useMotionValue(0);
  const springScale = useSpring(hoverScale, { stiffness: 260, damping: 22, mass: 0.3 });
  const springLift = useSpring(hoverLift, { stiffness: 260, damping: 22, mass: 0.3 });

  // Using onPointerMove/onPointerLeave ensures event delegation works on every card
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      magnetX.set(dx * 0.22);
      magnetY.set(dy * 0.22);
      tiltY.set((dx / rect.width) * 16);
      tiltX.set(-(dy / rect.height) * 12);
    },
    [magnetX, magnetY, tiltX, tiltY],
  );

  const handlePointerEnter = useCallback(() => {
    setIsHovered(true);
    hoverScale.set(1.1);
    hoverLift.set(-30);
  }, [hoverScale, hoverLift]);

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
    magnetX.set(0);
    magnetY.set(0);
    tiltX.set(0);
    tiltY.set(0);
    hoverScale.set(1);
    hoverLift.set(0);
  }, [magnetX, magnetY, tiltX, tiltY, hoverScale, hoverLift]);

  /* ── Scroll-driven animation values ── */
  // Phase 1 (0 → 0.35): cards rise vertically out of the wallet
  const revealY = useTransform(progress, [0, 0.35], [70, 0]);
  const revealScale = useTransform(progress, [0, 0.35], [0.26, 1]);

  // Phase 2 (0.35 → 0.65): cards settle into a compact carousel in the X-Z plane
  const totalCards = PAYFENCE_FEATURES.length;
  const cardAngle = (index / totalCards) * Math.PI * 2;
  const orbitX = useTransform([progress, orbitRotation], ([value, rotation]: number[]) => {
    const orbitProgress = Math.min(1, Math.max(0, (value - 0.35) / 0.3));
    const angle = cardAngle + value * Math.PI * 1.5 + (rotation * Math.PI) / 180;
    return Math.sin(angle) * radius * orbitProgress;
  });
  const orbitZ = useTransform([progress, orbitRotation], ([value, rotation]: number[]) => {
    const orbitProgress = Math.min(1, Math.max(0, (value - 0.35) / 0.3));
    const angle = cardAngle + value * Math.PI * 1.5 + (rotation * Math.PI) / 180;
    return Math.cos(angle) * radius * 0.62 * orbitProgress;
  });
  const orbitY = useTransform([progress, orbitRotation], ([value, rotation]: number[]) => {
    const orbitProgress = Math.min(1, Math.max(0, (value - 0.35) / 0.3));
    const angle = cardAngle + value * Math.PI * 1.5 + (rotation * Math.PI) / 180;
    return Math.cos(angle) * verticalRadius * orbitProgress;
  });
  const cardY = useTransform([revealY, orbitY], ([reveal, orbit]: number[]) => reveal + orbit);

  // No rotation at any point — strict horizontal alignment
  const opacity = useTransform(progress, [0, 0.08], [0, 1]);

  // Dynamic z-index: hovered card goes to the top
  const baseZ = 10 - Math.abs(index - 3.5);
  const dynamicZ = isHovered ? 50 : baseZ;

  return (
    <motion.article
      ref={cardRef}
      className={`holo-card card-${card.tone} ${active ? "card-placeholder" : ""} ${isHovered ? "card-hovered" : ""}`}
      layoutId={`feature-card-${feature.id}`}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen();
      }}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      style={{
        y: cardY,
        x: orbitX,
        z: orbitZ,
        translateX: springX,
        translateY: springLift,
        rotateX: springTiltX,
        rotateY: 0,
        rotateZ: springTiltY,
        scale: useTransform([revealScale, springScale], ([reveal, hover]: number[]) => reveal * hover),
        opacity: active ? 0 : opacity,
        zIndex: dynamicZ,
      }}
    >
      <div className="card-shine" />
      <div className="card-top">
        <span className="card-chip" />
        <span className="card-contact">◌</span>
      </div>
      <div className="card-label">{card.type}</div>
      <div className="card-name">{card.name}</div>
      <div className="card-number">{card.number}</div>
      <div className="card-bottom">
        <span>{card.amount}</span>
        <span className="card-symbol">PG</span>
      </div>
    </motion.article>
  );
}

export default function Home() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeCard, setActiveCard] = useState<(typeof PAYFENCE_FEATURES)[number] | null>(null);
  const [orbitRadius, setOrbitRadius] = useState(150);
  const [orbitVerticalRadius, setOrbitVerticalRadius] = useState(230);
  const orbitRotation = useMotionValue(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartRotation = useRef(0);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 58, damping: 22, mass: 0.65 });
  const titleY = useTransform(progress, [0, 0.25], [0, -75]);
  const titleOpacity = useTransform(progress, [0, 0.22], [1, 0]);
  const stageScale = useTransform(progress, [0, 0.5, 1], [0.86, 1, 0.92]);
  const walletScale = useTransform(progress, [0, 0.32, 0.65, 1], [1, 1.08, 0.72, 0.72]);
  const orbitLabelOpacity = useTransform(progress, [0.62, 0.76], [0, 1]);

  const handleOrbitTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length < 2) return;
    touchStartX.current = (event.touches[0].clientX + event.touches[1].clientX) / 2;
    touchStartRotation.current = orbitRotation.get();
  }, [orbitRotation]);

  const handleOrbitTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length < 2 || touchStartX.current === null) return;
    event.preventDefault();
    const midpointX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
    orbitRotation.set(touchStartRotation.current + (midpointX - touchStartX.current) * 0.7);
  }, [orbitRotation]);

  const handleOrbitTouchEnd = useCallback(() => {
    touchStartX.current = null;
  }, []);

  useEffect(() => {
    const updateRadius = () => {
      const isMobile = window.innerWidth <= 800;
      setOrbitRadius(isMobile ? 155 : Math.min(330, window.innerWidth * 0.4));
      setOrbitVerticalRadius(isMobile ? 170 : Math.min(245, window.innerHeight * 0.36));
    };
    updateRadius();
    window.addEventListener("resize", updateRadius);
    return () => window.removeEventListener("resize", updateRadius);
  }, []);

  return (
    <main className="cinematic-page">
      <div className="grainless-void" />
      <div className="cinematic-track" ref={trackRef}>
        <header className="cinema-nav">
          <div className="cinema-brand">
            <Image className="brand-logo" src="/paygent-logo.png" alt="" width={38} height={52} priority />
          </div>
        </header>
        <section className="sticky-stage">
          <div className="stage-grid" />
          <div className="ambient-field" aria-label="Ambient commerce objects">
            <div className="ambient-curve ambient-curve-one" />
            <div className="ambient-curve ambient-curve-two" />
            {Array.from({ length: 3 }, (_, pass) => AMBIENT_ITEMS.map((item, index) => (
              <AmbientIcon key={`${item.label}-${pass}`} item={item} index={pass * AMBIENT_ITEMS.length + index} />
            )))}
          </div>
          <motion.div className="story-copy" style={{ y: titleY, opacity: titleOpacity }}>
            <h1>
              Every instruction.
              <br />
              <em>Held to account.</em>
            </h1>
            <p>Signed mandates, bounded credentials, and a ledger that remembers everything.</p>
          </motion.div>
          <motion.div className="orbit-label" style={{ opacity: orbitLabelOpacity }}>
            <Sparkles size={14} /> MANDATES REVEALED <span>08 ACTIVE CREDENTIALS</span>
          </motion.div>

          <motion.div className="telemetry-block top-right" style={{ opacity: titleOpacity }}>
            <div className="tel-label">TRANSACTIONS / MIN</div>
            <div className="tel-value">1,482</div>
            <div className="tel-bars spark-pulse">
              <div className="tel-bar" style={{ height: '40%' }}></div>
              <div className="tel-bar" style={{ height: '70%' }}></div>
              <div className="tel-bar" style={{ height: '50%' }}></div>
              <div className="tel-bar active" style={{ height: '90%' }}></div>
              <div className="tel-bar" style={{ height: '60%' }}></div>
              <div className="tel-bar" style={{ height: '80%' }}></div>
              <div className="tel-bar" style={{ height: '30%' }}></div>
            </div>
          </motion.div>
          
          <motion.div className="telemetry-block bottom-left" style={{ opacity: titleOpacity }}>
            <div className="tel-label">ACTIVE MANDATES</div>
            <div className="tel-value">3,492</div>
          </motion.div>

          <motion.div className="telemetry-block bottom-right" style={{ opacity: titleOpacity }}>
            <div className="tel-label">AGENT TRUST AVG</div>
            <div className="tel-value">94.2% <span className="tel-unit">↑</span></div>
          </motion.div>
          <motion.div className="wallet-stage" style={{ scale: stageScale }}>
            <div className="wallet-back">
              <motion.div className="leather-wallet wallet-back-layer" style={{ scale: walletScale }}>
                <div className="wallet-stitch" />
                <div className="wallet-slot">
                  <div className="slot-glow" />
                </div>
                <div className="wallet-body">
                  <Image className="wallet-mark" src="/paygent-logo.png" alt="PAYGENT" width={54} height={74} />
                </div>
              </motion.div>
            </div>
            <div className="cards-clipped-container">
              <div
                className="cards-orbit"
                onTouchStart={handleOrbitTouchStart}
                onTouchMove={handleOrbitTouchMove}
                onTouchEnd={handleOrbitTouchEnd}
              >
                {PAYFENCE_FEATURES.map((feature, index) => (
                  <HoloCard
                    key={feature.id}
                    feature={feature}
                    index={index}
                    progress={progress}
                    orbitRotation={orbitRotation}
                    active={activeCard?.id === feature.id}
                    radius={orbitRadius}
                    verticalRadius={orbitVerticalRadius}
                    onOpen={() => setActiveCard(feature)}
                  />
                ))}
              </div>
            </div>
            <motion.div className="wallet-front-pocket" style={{ scale: walletScale }} />
            <Image className="wallet-center-logo" src="/paygent-logo.png" alt="PAYGENT" width={72} height={98} />
            <div className="stage-shadow" />
          </motion.div>

          <motion.div className="hero-ticker-wrap" style={{ opacity: titleOpacity }}>
            <div className="hero-ticker">
              AGENT_047 → verified → ₹840 → blinkit.com &nbsp;&nbsp;&nbsp;&nbsp; AGENT_012 → escalated → ₹4,200 → zeptonow.com &nbsp;&nbsp;&nbsp;&nbsp; AGENT_092 → approved → ₹150 → amazon.in &nbsp;&nbsp;&nbsp;&nbsp; AGENT_047 → verified → ₹840 → blinkit.com &nbsp;&nbsp;&nbsp;&nbsp; AGENT_012 → escalated → ₹4,200 → zeptonow.com
            </div>
          </motion.div>
        </section>
      </div>
      <section className="pg-main" style={{ marginLeft: 0, paddingBottom: 100 }}>
        <OverviewPage />
      </section>
      <AnimatePresence>
        {activeCard && (
          <motion.div className="feature-modal-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveCard(null)}>
            <motion.div className="feature-modal-backdrop" onClick={() => setActiveCard(null)} />
            <motion.article
              className={`feature-modal card-${cardTones[PAYFENCE_FEATURES.findIndex((item) => item.id === activeCard.id)]}`}
              layoutId={`feature-card-${activeCard.id}`}
              onClick={(event) => event.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setActiveCard(null)} aria-label="Close feature">
                ×
              </button>
              <div className="modal-kicker">
                <span /> PAYGENT KILLER FEATURE
              </div>
              <div className="modal-index">0{PAYFENCE_FEATURES.findIndex((item) => item.id === activeCard.id) + 1} / 08</div>
              <h2>{activeCard.title}</h2>
              <p className="modal-subtitle">{activeCard.subtitle}</p>
              <p className="modal-description">{activeCard.description}</p>
              <div className="modal-proof">
                <ShieldCheck size={17} />
                <span>Verified at the gateway</span>
                <b>ACTIVE</b>
              </div>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
