"use client";

import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";
import { ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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
  { label: "Jordan shoe", tone: "cyan", path: "shoe" },
  { label: "JPG perfume bottle", tone: "gold", path: "perfume" },
  { label: "iPhone", tone: "violet", path: "phone" },
  { label: "Lacoste t-shirt", tone: "emerald", path: "shirt" },
  { label: "NYC cap", tone: "blue", path: "cap" },
  { label: "LV glasses", tone: "gold", path: "glasses" },
  { label: "Van Cleef jewellery", tone: "cyan", path: "jewellery" },
  { label: "Camera", tone: "violet", path: "camera" },
  { label: "Rolex watch", tone: "emerald", path: "watch" },
] as const;

const AMBIENT_POSITIONS = [
  [7, 22], [22, 13], [39, 19], [58, 14], [78, 22], [91, 34], [88, 68], [70, 83], [49, 88],
  [27, 82], [9, 67], [3, 44], [16, 37], [33, 29], [52, 25], [71, 34], [84, 50], [76, 65],
  [57, 76], [36, 72], [19, 57], [12, 49], [29, 18], [47, 9], [67, 19], [94, 55], [61, 92],
] as const;

function AmbientGlyph({ path }: { path: (typeof AMBIENT_ITEMS)[number]["path"] }) {
  const common = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (path === "shoe") return <svg viewBox="0 0 48 48" aria-hidden="true"><path {...common} strokeWidth="2" d="M7 30c5 1 9-3 12-13l5 2c2 7 7 10 16 11 2 0 3 2 1 4-5 4-28 4-35 0-2-1-1-4 1-4Z"/><path {...common} strokeWidth="1.5" d="m19 20 5 5m-9-1 6 3m-9-1 5 3"/></svg>;
  if (path === "perfume") return <svg viewBox="0 0 48 48" aria-hidden="true"><path {...common} strokeWidth="2" d="M19 13h10v5l3 3v15H16V21l3-3v-5Zm3-4h4v4h-4zM17 21h14m-10-8h6"/><path {...common} strokeWidth="1.5" d="M21 27h6m-6 5h6"/></svg>;
  if (path === "phone") return <svg viewBox="0 0 48 48" aria-hidden="true"><rect {...common} strokeWidth="2" x="14" y="5" width="20" height="38" rx="4"/><path {...common} strokeWidth="1.5" d="M20 9h8M22 38h4"/><circle {...common} strokeWidth="1.5" cx="29" cy="13" r="2"/></svg>;
  if (path === "shirt") return <svg viewBox="0 0 48 48" aria-hidden="true"><path {...common} strokeWidth="2" d="m19 10 5 4 5-4 10 6-5 8-4-3v17H18V21l-4 3-5-8 10-6Z"/><path {...common} strokeWidth="1.5" d="M20 11c0 5 8 5 8 0"/></svg>;
  if (path === "cap") return <svg viewBox="0 0 48 48" aria-hidden="true"><path {...common} strokeWidth="2" d="M10 27c1-9 7-14 14-14s13 5 14 14v4H10v-4Z"/><path {...common} strokeWidth="2" d="M10 30c-5 1-7 4-3 6 9 3 27 0 32-4 2-2-1-4-4-5"/><path {...common} strokeWidth="1.5" d="M19 17h10"/></svg>;
  if (path === "glasses") return <svg viewBox="0 0 48 48" aria-hidden="true"><path {...common} strokeWidth="2" d="M6 21h6l2 11h8l2-11h2l2 11h8l2-11h6M24 22h-2m4 0h-2"/><path {...common} strokeWidth="1.5" d="M8 21c0-3 3-5 6-5h5c3 0 5 2 5 5m2 0c0-3 2-5 5-5h5c3 0 6 2 6 5"/></svg>;
  if (path === "jewellery") return <svg viewBox="0 0 48 48" aria-hidden="true"><path {...common} strokeWidth="2" d="m24 8 7 7-7 7-7-7 7-7Zm0 14 7 7-7 7-7-7 7-7Z"/><path {...common} strokeWidth="1.5" d="m17 15-7 7 7 7m14-14 7 7-7 7"/></svg>;
  if (path === "camera") return <svg viewBox="0 0 48 48" aria-hidden="true"><path {...common} strokeWidth="2" d="M8 17h8l3-4h10l3 4h8v22H8V17Z"/><circle {...common} strokeWidth="2" cx="24" cy="28" r="7"/><circle {...common} strokeWidth="1.5" cx="35" cy="22" r="1"/></svg>;
  return <svg viewBox="0 0 48 48" aria-hidden="true"><rect {...common} strokeWidth="2" x="13" y="15" width="22" height="20" rx="5"/><path {...common} strokeWidth="2" d="M13 20H8v8h5m22-8h5v8h-5M19 15v-4h10v4"/><circle {...common} strokeWidth="1.5" cx="24" cy="25" r="6"/><path {...common} strokeWidth="1.5" d="M24 25v-4m0 4 3 2"/></svg>;
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
  const router = useRouter();
  const dashboardOpened = useRef(false);
  const [isLeaving, setIsLeaving] = useState(false);
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
  const openDashboard = useCallback(() => {
    if (isLeaving) return;
    sessionStorage.setItem("paygent-route-handoff", "1");
    setIsLeaving(true);
    window.setTimeout(() => router.push("/dashboard"), 420);
  }, [isLeaving, router]);

  useMotionValueEvent(progress, "change", (value) => {
    if (value >= 0.995 && !dashboardOpened.current) {
      dashboardOpened.current = true;
      openDashboard();
    }
  }, [openDashboard]);

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
            <Image className="brand-logo" src="/paygent-logo.png" alt="" width={22} height={30} priority />
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
          <motion.div className="wallet-stage" style={{ scale: stageScale }}>
            <div className="wallet-back">
              <motion.div className="leather-wallet wallet-back-layer" style={{ scale: walletScale }}>
                <div className="wallet-stitch" />
                <div className="wallet-slot">
                  <div className="slot-glow" />
                </div>
                <div className="wallet-body">
                  <Image className="wallet-mark" src="/paygent-logo.png" alt="PAYGENT" width={42} height={58} />
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
            <Image className="wallet-center-logo" src="/paygent-logo.png" alt="PAYGENT" width={54} height={74} />
            <div className="stage-shadow" />
          </motion.div>
        </section>
      </div>
      <section className="dashboard-cta">
        <div className="dashboard-cta-inner">
          <div className="dashboard-cta-kicker">PAYGENT CONTROL CENTER</div>
          <h2>See every payment<br /><em>held to account.</em></h2>
          <p>Move from the wallet animation into the live reliability dashboard.</p>
          <Link className="dashboard-cta-button" href="/dashboard" onClick={(event) => { event.preventDefault(); openDashboard(); }}>
            OPEN DASHBOARD <span>→</span>
          </Link>
        </div>
      </section>
      <AnimatePresence>
        {isLeaving && (
          <motion.div
            className="route-transition-veil"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.42, ease: [0.22, 0.61, 0.36, 1] }}
          />
        )}
      </AnimatePresence>
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
