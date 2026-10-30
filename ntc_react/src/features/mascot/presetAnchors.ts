import metadata from "./mascotAnchors.generated.json";

const atlases: Record<string, { floors: number[]; centers: number[]; sha256: string }> = metadata.atlases;
export function presetAtlasAnchors(source: string) {
  const match = source.match(/^\/mascots\/ntc-v6\/(?:previews\/)?([a-z]+-(?:directions|reactions))\.webp\?rev=([^&]+)$/);
  return match && match[2] === metadata.revision ? atlases[match[1]] : undefined;
}
