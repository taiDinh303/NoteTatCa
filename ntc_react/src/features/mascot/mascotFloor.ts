import { useEffect, useState } from "react";

const floors = new Map<string, Promise<number>>();

// Atlas padding differs by character. Measure once, never during pointer motion.
function floor(source: string): Promise<number> {
  const cached = floors.get(source);
  if (cached) return cached;
  const result = new Promise<number>((resolve, reject) => {
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
        let bottom = 0;
        for (let cell = 0; cell < 9; cell++) {
          for (let y = height - 1; y >= 0; y--) {
            let pixels = 0;
            for (let x = 0; x < width; x++) {
              const offset =
                ((Math.floor(cell / 3) * height + y) * canvas.width +
                  (cell % 3) * width +
                  x) *
                4;
              if (data[offset + 3] > 16) pixels++;
            }
            if (pixels >= 2) {
              bottom = Math.max(bottom, (y + 1) / height);
              break;
            }
          }
        }
        resolve(bottom || 1);
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
  const [measured, setMeasured] = useState<{ key: string; value: number }>();
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void Promise.all([floor(directions), floor(reactions)]).then(
      (values) => {
        if (active) setMeasured({ key, value: Math.max(...values) });
      },
      () => {
        if (active) setMeasured({ key, value: 1 });
      },
    );
    return () => {
      active = false;
    };
  }, [directions, reactions, key, enabled]);
  return measured?.key === key ? measured.value : undefined;
}
