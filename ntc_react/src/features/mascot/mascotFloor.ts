import { useEffect, useState } from "react";
const wholeFrameFloor = {
  directions: Array(9).fill(300 / 320),
  reactions: Array(9).fill(300 / 320),
  max: 300 / 320,
};

const floors = new Map<string, Promise<number[]>>();
const resolvedFloors = new Map<string, number[]>();

// Atlas padding differs by character. Measure once, never during pointer motion.
function floor(source: string): Promise<number[]> {
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
        const { data } = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        );
        const width = Math.floor(canvas.width / 3);
        const height = Math.floor(canvas.height / 3);
        const bottoms: number[] = [];
        for (let cell = 0; cell < 9; cell++) {
          for (let y = height - 1; y >= 0; y--) {
            let pixels = 0;
            for (let x = Math.floor(width * 0.3); x < width * 0.7; x++) {
              const offset =
                ((Math.floor(cell / 3) * height + y) * canvas.width +
                  (cell % 3) * width +
                  x) *
                4;
              if (data[offset + 3] > 96) pixels++;
            }
            if (pixels >= 2) {
              bottoms[cell] = (y + 1) / height;
              break;
            }
          }
        }
        const values = Array.from({ length: 9 }, (_, i) => bottoms[i] || 1);
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
    value: { directions: number[]; reactions: number[]; max: number };
  }>();
  useEffect(() => {
    if (!enabled || directions.includes("/ntc-v4/")) return;
    let active = true;
    void Promise.all([floor(directions), floor(reactions)]).then(
      (values) => {
        if (active)
          setMeasured({
            key,
            value: {
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
  if (directions.includes("/ntc-v4/")) return wholeFrameFloor;
  if (measured?.key === key) return measured.value;
  const cachedDirections = resolvedFloors.get(directions);
  const cachedReactions = resolvedFloors.get(reactions);
  return cachedDirections && cachedReactions
    ? {
        directions: cachedDirections,
        reactions: cachedReactions,
        max: Math.max(...cachedDirections, ...cachedReactions),
      }
    : undefined;
}
