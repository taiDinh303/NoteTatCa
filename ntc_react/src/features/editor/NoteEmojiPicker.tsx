import { useMemo, useState } from "react";
import { Smile } from "lucide-react";
import { t as tr, useLanguage } from "../../shared/i18n";
import { useAuth } from "../../shared/hooks";
import { Button, IconButton } from "../../shared/ui";
import NoteToolPanel from "./NoteToolPanel";
import catalog from "./emoji/catalog.json";
import "./NoteEmojiPicker.css";

const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d");
const entries = catalog.items.flatMap((items, group) => items.map(([value, en, vi, keywords]) => ({
  value, group, en, vi,
  keywords: keywords.split(".").map(id => catalog.words[parseInt(id, 36)]).join(" "),
})));
const byValue = new Map(entries.map(entry => [entry.value, entry]));
function readRecent(key: string): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(saved) ? [...new Set(saved.filter((value): value is string => typeof value === "string" && byValue.has(value)))].slice(0, 24) : [];
  } catch { return []; }
}
export default function NoteEmojiPicker({ onInsert }: { onInsert: (text: string) => boolean }) {
  useLanguage();
  const [open, setOpen] = useState(false);
  const userId = useAuth().session?.userId ?? "guest";
  return <>
    <IconButton data-note-tool-trigger icon={Smile} label={tr("Insert emoji or symbol")} aria-expanded={open} active={open} onClick={() => setOpen(!open)} />
    {open ? <NoteToolPanel className="note-emoji-panel" title={tr("Emoji and symbols")} onClose={() => setOpen(false)}>
      <EmojiChoices key={userId} storageKey={`ntc.emoji.recent.v1.${userId}`} onInsert={onInsert} />
    </NoteToolPanel> : null}
  </>;
}
function EmojiChoices({ storageKey, onInsert }: { storageKey: string; onInsert: (text: string) => boolean }) {
  const language = useLanguage();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [limit, setLimit] = useState(96);
  const [recent, setRecent] = useState(() => readRecent(storageKey));
  const [last, setLast] = useState("");
  const filtered = useMemo(() => {
    const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
    return entries.filter(entry => (group === "" || entry.group === Number(group)) && terms.every(term => entry.keywords.includes(term) || entry.value.includes(term)));
  }, [query, group]);
  const insert = (value: string) => {
    if (!onInsert(value)) return;
    const next = [value, ...recent.filter(item => item !== value)].slice(0, 24);
    setRecent(next);
    setLast(value);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Insertion works without local storage. */ }
  };
  const buttons = (values: string[]) => <div className="emoji-symbol-grid">
    {values.map(value => {
      const entry = byValue.get(value)!;
      const name = language === "vi" ? entry.vi : entry.en;
      return <button type="button" key={value} title={name} aria-label={`${value} ${name}`} onClick={() => insert(value)}>{value}</button>;
    })}
  </div>;
  return <div className="emoji-symbol-picker">
    <div className="emoji-symbol-controls">
    <input type="search" aria-label={tr("Search emoji or symbols")} placeholder={tr("Search")} value={query} onChange={event => { setQuery(event.target.value); setLimit(96); }} />
    <select aria-label={tr("Emoji category")} value={group} onChange={event => { setGroup(event.target.value); setLimit(96); }}>
      <option value="">{tr("All emoji and symbols")}</option>
      {catalog.groups.map((name, index) => <option key={name} value={index}>{tr(name)}</option>)}
    </select>
    </div>
    {recent.length && !query && !group ? <section aria-label={tr("Recently used")}><h3>{tr("Recently used")}</h3>{buttons(recent)}</section> : null}
    <p className="emoji-symbol-count">{tr("Characters: {0}", filtered.length)}</p>
    {filtered.length ? buttons(filtered.slice(0, limit).map(entry => entry.value)) : <p role="status">{tr("No emoji or symbols found.")}</p>}
    {filtered.length > limit ? <Button variant="ghost" className="emoji-load-more" onClick={() => setLimit(value => value + 96)}>{tr("Show more characters")}</Button> : null}
    <span className="sr-only" role="status" aria-live="polite">{last ? tr("Inserted {0}", last) : ""}</span>
  </div>;
}
