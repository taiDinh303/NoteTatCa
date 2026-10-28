import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { t as tr, useLanguage } from "../../shared/i18n";
import { X } from "lucide-react";
import "./MascotPage.css";

/*
 * MascotPage — port of nilbuild/page-mascot (MIT, Kamran Ahmed) into
 * NoteTatCa. Renders a chibi character from two 3x3 sprite sheets
 * (head directions + reactions) that follows the cursor and blinks
 * when poked. No chat logic, no external calls — pure local animation.
 *
 * Sprite sheets: /mascots/<name>-directions.png and /mascots/<name>-reactions.png
 * (copied from D:\Tools\page-mascot\characters/<name>/, MIT-licensed).
 */

const DIRECTIONS = [
  "up-left",
  "up",
  "up-right",
  "left",
  "center",
  "right",
  "down-left",
  "down",
  "down-right",
] as const;

const REACTIONS = [
  "blink",
  "heart",
  "sparkle",
  "surprised",
  "wink",
  "bashful",
  "sleepy",
  "dizzy",
  "delighted",
] as const;

type Direction = (typeof DIRECTIONS)[number];
type Reaction = (typeof REACTIONS)[number];

/* Clockwise from the right, matching atan2 with y pointing down. */
const CLOCKWISE: Direction[] = [
  "right",
  "down-right",
  "down",
  "down-left",
  "left",
  "up-left",
  "up",
  "up-right",
];
const SECTOR = (Math.PI * 2) / CLOCKWISE.length;
const HYSTERESIS = 0.12;
const DEAD_ZONE = 70;

const PAYOFFS: Reaction[] = ["heart", "sparkle", "delighted"];
const BOOP_PAYOFF = 120;
const BOOP_END = 560;
const SQUASH_MS = 420;
const DIZZY_AFTER = 4;
const DIZZY_WINDOW = 1600;
const DIZZY_END = 1100;

const SQUASH: Keyframe[] = [
  { transform: "scale(1, 1)", easing: "ease-in" },
  { transform: "scale(1.10, 0.86)", offset: 0.18, easing: "ease-out" },
  { transform: "scale(0.95, 1.08)", offset: 0.45, easing: "ease-in-out" },
  { transform: "scale(1.03, 0.97)", offset: 0.72, easing: "ease-in-out" },
  { transform: "scale(1, 1)" },
];

function cell(index: number): CSSProperties {
  return {
    backgroundPosition: `${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%`,
  };
}

function wrap(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

const layer: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundSize: "300% 300%",
  backgroundRepeat: "no-repeat",
};

export type MascotPageProps = {
  /** The 3x3 sheet of head directions. A served path, or an imported image. */
  directions: string;
  /** The 3x3 sheet of expressions. */
  reactions: string;
  size?: number;
  className?: string;
  /** What a screen reader calls it. */
  label?: string;
  /** Aligned note sprites stay planted when clicked. */
  disableSquash?: boolean;
  floors?: { directions: number[]; reactions: number[]; max: number };
};

export function MascotPage(props: MascotPageProps) {
  const {
    directions,
    reactions,
    size = 96,
    className = "",
    label = "mascot",
    disableSquash = false,
    floors,
  } = props;

  const buttonRef = useRef<HTMLButtonElement>(null);
  const squashRef = useRef<HTMLSpanElement>(null);
  const timersRef = useRef<number[]>([]);
  const boopsRef = useRef({ count: 0, at: 0 });
  const [direction, setDirection] = useState<Direction>("center");
  const [reaction, setReaction] = useState<Reaction | null>(null);

  /* Cursor following with hysteresis + dead zone (ported from repo). */
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }

    let sector = -1;
    let pointer: { x: number; y: number } | null = null;

    const aim = () => {
      const button = buttonRef.current;
      if (!button || !pointer) return;

      const box = button.getBoundingClientRect();
      const dx = pointer.x - (box.left + box.width / 2);
      const dy = pointer.y - (box.top + box.height / 2);

      if (Math.hypot(dx, dy) < DEAD_ZONE) {
        sector = -1;
        setDirection("center");
        return;
      }

      const angle = Math.atan2(dy, dx);
      if (
        sector !== -1 &&
        Math.abs(wrap(angle - sector * SECTOR)) < SECTOR / 2 + HYSTERESIS
      ) {
        return;
      }

      sector =
        (Math.round(angle / SECTOR) + CLOCKWISE.length) % CLOCKWISE.length;
      setDirection(CLOCKWISE[sector]);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      aim();
    };

    window.addEventListener("pointermove", onPointerMove, {
      passive: true,
    });
    window.addEventListener("scroll", aim, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", aim);
    };
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(window.clearTimeout);
    };
  }, []);

  const boop = useCallback(() => {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];

    const later = (ms: number, next: Reaction | null) => {
      timersRef.current.push(window.setTimeout(() => setReaction(next), ms));
    };

    const now = Date.now();
    const boops = boopsRef.current;
    boops.count = now - boops.at < DIZZY_WINDOW ? boops.count + 1 : 1;
    boops.at = now;

    if (boops.count >= DIZZY_AFTER) {
      boops.count = 0;
      setReaction("dizzy");
      later(DIZZY_END, null);
    } else {
      setReaction("blink");
      later(BOOP_PAYOFF, PAYOFFS[(boops.count - 1) % PAYOFFS.length]);
      later(BOOP_END, null);
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    if (!disableSquash) {
      squashRef.current?.animate(SQUASH, {
        duration: SQUASH_MS,
        easing: "linear",
      });
    }
  }, [disableSquash]);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={boop}
      aria-label={`Boop the ${label}`}
      className={`mascot-page ${className}`.trim()}
      style={{
        position: "relative",
        display: "block",
        flexShrink: 0,
        width: size,
        height: size,
        padding: 0,
        border: 0,
        background: "transparent",
        appearance: "none",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <span
        ref={squashRef}
        style={{
          position: "relative",
          display: "block",
          width: "100%",
          height: "100%",
          transformOrigin: "50% 78%",
        }}
      >
        <span
          className="mascot-directions"
          style={{
            ...layer,
            backgroundImage: `url(${directions})`,
            ...cell(DIRECTIONS.indexOf(direction)),
            transform: floors
              ? `translateY(${size * (floors.max - floors.directions[DIRECTIONS.indexOf(direction)])}px)`
              : undefined,
            opacity: reaction ? 0 : 1,
          }}
        />
        {/* Always mounted so the reactions sheet is fetched up front, never on
            the first click. */}
        <span
          className="mascot-reactions"
          style={{
            ...layer,
            backgroundImage: `url(${reactions})`,
            ...cell(REACTIONS.indexOf(reaction ?? "blink")),
            transform: floors
              ? `translateY(${size * (floors.max - floors.reactions[REACTIONS.indexOf(reaction ?? "blink")])}px)`
              : undefined,
            opacity: reaction ? 1 : 0,
          }}
        />
      </span>
    </button>
  );
}

/* Floating wrapper — bottom-right of the customer workspace. */
export function FloatingMascot() {
  const [dismissed, setDismissed] = useState(false);
  useLanguage();
  if (dismissed) return null;
  return (
    <div className="mascot-floating">
      <MascotPage
        directions="/mascots/bunny-directions.png"
        reactions="/mascots/bunny-reactions.png"
        size={96}
        label={tr("mascot")}
      />
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
