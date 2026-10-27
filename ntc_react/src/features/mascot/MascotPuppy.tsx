import { useCallback, useEffect, useRef, useState } from "react";
import { t as tr, useLanguage } from "../../shared/i18n";
import { X } from "lucide-react";

/*
 * MascotPuppy — một chú cún nhỏ có thể nháy mắt / nhìn theo con trỏ / phản
 * ứng khi user "poke" (bấm) nó. Đây là bản UI demo (mock), CHƯA nối chat AI
 * thật (chưa có API/provider nào).
 *
 * Cách hoạt động:
 * - Blinks periodically (eye state closed briefly).
 * - Pupil tracks the cursor (limited angle).
 * - Clicking the mascot triggers a "poke" reaction (squint + tiny tilt).
 * - No chat logic, no external calls — pure local animation.
 */
type Pose = "idle" | "looking" | "poking";

export function MascotPuppy({ size = 56 }: { size?: number }) {
  useLanguage();
  const [pose, setPose] = useState<Pose>("idle");
  const [eyesClosed, setEyesClosed] = useState(false);
  const [pupilX, setPupilX] = useState(0);
  const [pupilY, setPupilY] = useState(0);
  const [pokeTick, setPokeTick] = useState(0);
  const lastPoke = useRef(0);

  /* Periodic blink + cursor tracking */
  useEffect(() => {
    let raf = 0;
    function tick() {
      const now = performance.now();
      const t = now / 1000;

      /* blink roughly every 3.4s, 160ms close window */
      const cycle = t % 3.4;
      if (cycle > 3.2 && cycle < 3.36) {
        setEyesClosed(true);
      } else {
        setEyesClosed(false);
      }

      /* subtle bob when idle: eyes drift up/down slightly */
      if (pose === "idle") {
        setPupilY(Math.sin(t * 0.9) * 0.6);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pose]);

  /* Cursor tracking — only when not poking */
  useEffect(() => {
    if (pose === "poking") return;
    function onMove(e: MouseEvent) {
      const dx = e.clientX / window.innerWidth - 0.5;
      const dy = e.clientY / window.innerHeight - 0.5;
      /* clamp to small offsets so the eyes stay in the head */
      setPupilX(dx * 3.2);
      setPupilY(dy * 3.2);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [pose]);

  const handlePoke = useCallback(() => {
    const now = performance.now();
    if (now - lastPoke.current < 700) return; /* debounce rapid clicks */
    lastPoke.current = now;
    setPokeTick((n) => n + 1);
    setPose("poking");
    /* return to idle/looking after a short reaction */
    setTimeout(() => setPose("idle"), 520);
  }, []);

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  /* Eye offset based on pose */
  const eyeTilt = pose === "poking" ? 2.2 : 0;
  const pupilXFinal = reducedMotion ? 0 : pose === "poking" ? pupilX * 0.3 : pupilX;
  const pupilYFinal = reducedMotion ? 0 : pose === "poking" ? pupilY * 0.3 + eyeTilt : pupilY;

  const scale = size / 56;

  return (
    <div
      className="mascot-puppy"
      style={{
        width: size,
        height: size,
        ["--mascot-scale" as string]: scale,
      }}
      onClick={reducedMotion ? undefined : handlePoke}
      role={reducedMotion ? undefined : "button"}
      aria-label={tr("Poke the mascot (decorative)")}
      tabIndex={reducedMotion ? -1 : 0}
      onKeyDown={(e) => {
        if (reducedMotion) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handlePoke();
        }
      }}
      data-pose={pose}
      data-poke={pokeTick}
    >
      <svg
        viewBox="0 0 64 64"
        width="100%"
        height="100%"
        fill="none"
        aria-hidden="true"
        style={{ overflow: "visible" }}
      >
        {/* head base */}
        <circle cx="32" cy="36" r="22" fill="#f5b447" />
        {/* ears */}
        <ellipse cx="13" cy="20" rx="8" ry="14" fill="#e4922b" transform="rotate(-18 13 20)" />
        <ellipse cx="51" cy="20" rx="8" ry="14" fill="#e4922b" transform="rotate(18 51 20)" />
        {/* ear inner */}
        <ellipse cx="14" cy="22" rx="4.5" ry="9" fill="#fce4b0" transform="rotate(-18 14 22)" />
        <ellipse cx="50" cy="22" rx="4.5" ry="9" fill="#fce4b0" transform="rotate(18 50 22)" />
        {/* snout */}
        <ellipse cx="32" cy="44" rx="11" ry="8" fill="#fff3e0" />
        {/* nose */}
        <ellipse cx="32" cy="42" rx="3.5" ry="2.6" fill="#5a4a33" />
        {/* mouth */}
        <path d="M32 44.5 L32 47 M29 46.5 Q32 49.5 35 46.5" stroke="#8a7355" strokeWidth="1.1" strokeLinecap="round" fill="none" />

        {/* eyes */}
        {eyesClosed ? (
          /* closed eyes: gentle arcs */
          <>
            <path d="M22 34 Q25 36 28 34" stroke="#3a2f1f" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <path d="M36 34 Q39 36 42 34" stroke="#3a2f1f" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </>
        ) : pose === "poking" ? (
          /* squinted eyes (poke reaction) */
          <>
            <ellipse cx="25" cy="34" rx="3.2" ry="1.6" fill="#3a2f1f" />
            <ellipse cx="39" cy="34" rx="3.2" ry="1.6" fill="#3a2f1f" />
          </>
        ) : (
          /* open eyes with tracking pupil */
          <>
            <circle cx="25" cy="34" r="4.2" fill="#1e1a14" />
            <circle cx="39" cy="34" r="4.2" fill="#1e1a14" />
            {/* highlight */}
            <circle cx="24" cy="33" r="1.3" fill="#fff" />
            <circle cx="38" cy="33" r="1.3" fill="#fff" />
            {/* subtle pupil shift layer (uses pupilX/Y) */}
            <circle
              cx={25 + pupilXFinal}
              cy={34 + pupilYFinal}
              r="1.8"
              fill="#fff3e0"
              opacity="0.55"
            />
            <circle
              cx={39 + pupilXFinal}
              cy={34 + pupilYFinal}
              r="1.8"
              fill="#fff3e0"
              opacity="0.55"
            />
          </>
        )}

        {/* cheeks */}
        <ellipse cx="17" cy="38" rx="3.5" ry="2.5" fill="#f8b8a0" opacity="0.55" />
        <ellipse cx="47" cy="38" rx="3.5" ry="2.5" fill="#f8b8a0" opacity="0.55" />
      </svg>
    </div>
  );
}

/* Wrapper for floating mascot position (bottom-right of workspace). */
export function FloatingMascot() {
  const [dismissed, setDismissed] = useState(false);
  useLanguage();
  if (dismissed) return null;
  return (
    <div className="mascot-floating">
      <MascotPuppy size={56} />
      <button
        className="mascot-dismiss"
        onClick={() => setDismissed(true)}
        aria-label={tr("Dismiss mascot")}
      >
        <X size={12} />
      </button>
    </div>
  );
}
