import { useEffect, useRef, useState } from "react";
import { Tag } from "lucide-react";
import type { Label } from "../../domain/models";
import { labelTint } from "../../domain/color";
import "./CardLabels.css";

function LabelChip({ label }: { label: Label }) {
  return (
    <span
      className="label-chip"
      style={{ background: labelTint(label.color) ?? undefined }}
    >
      <Tag size={10} style={{ color: label.color ?? undefined }} />
      {label.name}
    </span>
  );
}

export function CardLabels({ labels }: { labels: Label[] }) {
  const container = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const root = container.current;
    const sizing = measure.current;
    if (!root || !sizing) return;
    const observer = new ResizeObserver(() => {
      const chips = Array.from(sizing.children) as HTMLElement[];
      const widths = chips.slice(0, labels.length).map((chip) => chip.offsetWidth);
      const gap = parseFloat(getComputedStyle(sizing).columnGap) || 0;
      const available = root.clientWidth;
      const allWidth = widths.reduce((sum, width) => sum + width, 0)
        + Math.max(0, widths.length - 1) * gap;
      let count = widths.length;
      if (allWidth > available) {
        const counterWidth = chips[labels.length].offsetWidth;
        let used = 0;
        count = 0;
        for (const width of widths) {
          if (used + width + gap + counterWidth > available) break;
          used += width + gap;
          count++;
        }
      }
      setVisibleCount(count);
    });
    observer.observe(root);
    observer.observe(sizing);
    return () => observer.disconnect();
  }, [labels]);

  const count = Math.min(visibleCount, labels.length);
  const hidden = labels.slice(count);
  return (
    <div className="note-tags card-labels" ref={container}>
      {labels.slice(0, count).map((label) => <LabelChip key={label.id} label={label} />)}
      {hidden.length ? (
        <span className="label-chip label-overflow" title={hidden.map((label) => label.name).join(", ")}>
          <span aria-hidden="true">+{hidden.length}</span>
          <span className="sr-only">{hidden.map((label) => label.name).join(", ")}</span>
        </span>
      ) : null}
      <div className="card-labels-measure" ref={measure} aria-hidden="true">
        {labels.map((label) => <LabelChip key={label.id} label={label} />)}
        <span className="label-chip">+{labels.length}</span>
      </div>
    </div>
  );
}
