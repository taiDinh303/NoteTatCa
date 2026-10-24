import { useEffect, useRef, useSyncExternalStore } from "react";
import { NavLink } from "react-router-dom";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { GripVertical, Hash } from "lucide-react";
import { toast } from "sonner";
import type { Label } from "../../domain/models";
import { useAuth } from "../../shared/hooks";
import { t as tr, useLanguage } from "../../shared/i18n";
import "./SidebarLabels.css";

const changed = "ntc-label-order-changed";
function blockDragClick(ref: React.RefObject<number>) {
  ref.current = performance.now() + 350;
}
function subscribe(listener: () => void) {
  window.addEventListener(changed, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(changed, listener);
    window.removeEventListener("storage", listener);
  };
}
function read(key: string) {
  try {
    return localStorage.getItem(key) ?? "[]";
  } catch {
    return "[]";
  }
}
function ordered(labels: Label[], raw: string) {
  let ids: unknown;
  try {
    ids = JSON.parse(raw);
  } catch {
    ids = [];
  }
  const ranks = new Map<string, number>();
  if (Array.isArray(ids))
    ids.forEach((id: unknown, index) => {
      if (typeof id === "string" && !ranks.has(id)) ranks.set(id, index);
    });
  return [...labels].sort(
    (a, b) => (ranks.get(a.id) ?? Infinity) - (ranks.get(b.id) ?? Infinity),
  );
}
function Row({
  label,
  onNavigate,
  clickGuardRef,
}: {
  label: Label;
  onNavigate: () => void;
  clickGuardRef: React.RefObject<number>;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    attributes,
    listeners,
    isDragging,
  } = useSortable({
    id: label.id,
    transition: { duration: 200, easing: "ease-out" },
  });
  return (
    <div
      ref={setNodeRef}
      className={`sidebar-label-row ${isDragging ? "sorting" : ""}`}
      style={{
        transform: transform
          ? `translate3d(0, calc(${transform.y}px / var(--interface-scale)), 0)`
          : undefined,
        transition,
      }}
      onMouseDown={(event) => {
        clickGuardRef.current = 0;
        listeners?.onMouseDown?.(event);
      }}
      onTouchStart={(event) => {
        clickGuardRef.current = 0;
        listeners?.onTouchStart?.(event);
      }}
    >
      <NavLink
        to={`/labels/${label.id}`}
        onClick={(event) => {
          if (performance.now() < clickGuardRef.current) {
            event.preventDefault();
            return;
          }
          onNavigate();
        }}
        draggable={false}
      >
        <Hash size={17} style={{ color: label.color ?? undefined }} />
        <span>{label.name}</span>
      </NavLink>
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="label-drag-handle"
        {...attributes}
        onKeyDown={(event) => listeners?.onKeyDown?.(event)}
        aria-label={tr("Move {0}", label.name)}
      >
        <GripVertical size={14} />
      </button>
    </div>
  );
}
export function SidebarLabels({
  labels,
  children,
  onNavigate,
}: {
  labels: Label[];
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  useLanguage();
  const auth = useAuth();
  const clickGuardRef = useRef(0);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    // dnd-kit's document capture handler stops React click propagation but
    // does not cancel the anchor's native navigation after a mouse drag.
    const preventDragClick = (event: MouseEvent) => {
      if (
        performance.now() < clickGuardRef.current &&
        event.target instanceof Node &&
        navRef.current?.contains(event.target)
      )
        event.preventDefault();
    };
    document.addEventListener("click", preventDragClick, true);
    return () => document.removeEventListener("click", preventDragClick, true);
  }, []);
  const key = `ntc.sidebar-label-order.v1:${auth.session?.userId ?? "anonymous"}`;
  const raw = useSyncExternalStore(subscribe, () => read(key));
  const items = ordered(labels, raw);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 7 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  return (
    <nav ref={navRef} className="label-nav" aria-label={tr("Labels")}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={() => {
          clickGuardRef.current = Infinity;
        }}
        onDragCancel={() => {
          blockDragClick(clickGuardRef);
        }}
        onDragEnd={({ active, over }) => {
          blockDragClick(clickGuardRef);
          if (!over || active.id === over.id) return;
          const from = items.findIndex((l) => l.id === active.id),
            to = items.findIndex((l) => l.id === over.id);
          if (from < 0 || to < 0) return;
          try {
            localStorage.setItem(
              key,
              JSON.stringify(arrayMove(items, from, to).map((l) => l.id)),
            );
            window.dispatchEvent(new Event(changed));
          } catch {
            toast.error(tr("Could not save"));
          }
        }}
      >
        <SortableContext
          items={items.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((label) => (
            <Row
              key={label.id}
              label={label}
              onNavigate={onNavigate}
              clickGuardRef={clickGuardRef}
            />
          ))}
        </SortableContext>
      </DndContext>
      {children}
    </nav>
  );
}
