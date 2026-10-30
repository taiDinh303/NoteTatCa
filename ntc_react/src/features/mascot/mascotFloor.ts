import { mascotBodyAnchor } from "./mascotBodyFloor";
import { useEffect, useState } from "react";
import { presetAtlasAnchors } from "./presetAnchors";

const centers = new Map<string, number[]>();
const floors = new Map<string, Promise<number[]>>();
const resolvedFloors = new Map<string, number[]>();

// Atlas padding differs by character. Measure once, never during pointer motion.
function floor(source: string): Promise<number[]> {
  const preset = presetAtlasAnchors(source);
  if (preset) {
    centers.set(source, preset.centers);
    resolvedFloors.set(source, preset.floors);
    return Promise.resolve(preset.floors);
  }
  const cached = floors.get(source);
  if (cached) return cached;
  const result = new Promise<number[]>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true })!;
        context.drawImage(image, 0, 0);

        const width = Math.floor(canvas.width / 3);
        const height = Math.floor(canvas.height / 3);
        const bottoms: number[] = [];
        const horizontal: number[] = [];
        for (let cell = 0; cell < 9; cell++) {
          const tile = context.getImageData(
            (cell % 3) * width,
            Math.floor(cell / 3) * height,
            width,
            height,
          );
          const anchor = mascotBodyAnchor(tile.data, width, height);
          bottoms[cell] = anchor.floor;
          horizontal[cell] = anchor.center;
        }
        const values = Array.from({ length: 9 }, (_, i) => bottoms[i] || 1);
        centers.set(source, horizontal);
        resolvedFloors.set(source, values);
        resolve(values);
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = reject;
    image.src = source;
  });
  floors.set(source, result);
  return result;
}

export function useMascotFloor(
  directions: string,
  reactions: string,
  enabled: boolean,
) {
  const key = directions + reactions;
  const [measured, setMeasured] = useState<{
    key: string;
    value: {
      directions: number[];
      reactions: number[];
      max: number;
      directionsX?: number[];
      reactionsX?: number[];
    };
  }>();
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void Promise.all([floor(directions), floor(reactions)]).then(
      (values) => {
        if (active)
          setMeasured({
            key,
            value: {
              directionsX: centers.get(directions),
              reactionsX: centers.get(reactions),
              directions: values[0],
              reactions: values[1],
              max: Math.max(...values.flat()),
            },
          });
      },
      () => {
        if (active)
          setMeasured({
            key,
            value: {
              directions: Array(9).fill(1),
              reactions: Array(9).fill(1),
              max: 1,
            },
          });
      },
    );
    return () => {
      active = false;
    };
  }, [directions, reactions, key, enabled]);

  if (measured?.key === key) return measured.value;
  const cachedDirections = resolvedFloors.get(directions) ?? presetAtlasAnchors(directions)?.floors;
  const cachedReactions = resolvedFloors.get(reactions) ?? presetAtlasAnchors(reactions)?.floors;
  return cachedDirections && cachedReactions
    ? {
        directionsX: centers.get(directions) ?? presetAtlasAnchors(directions)?.centers,
        reactionsX: centers.get(reactions) ?? presetAtlasAnchors(reactions)?.centers,
        directions: cachedDirections,
        reactions: cachedReactions,
        max: Math.max(...cachedDirections, ...cachedReactions),
      }
    : undefined;
}
