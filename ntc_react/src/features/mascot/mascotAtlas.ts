export interface MascotAtlasPair {
  directions: string;
  reactions: string;
}
type Frame = {
  canvas: HTMLCanvasElement;
  bodyX: number;
  floor: number;
  width: number;
  left: number;
  right: number;
  top: number;
};
const SOURCE = 320;
const TILE = 160;
const invalid = () =>
  new Error(
    "The AI artwork could not be aligned. Your current mascot is unchanged.",
  );

function canvas(size: number) {
  const result = document.createElement("canvas");
  result.width = result.height = size;
  return result;
}
async function frames(base64: string): Promise<Frame[]> {
  const response = await fetch(`data:image/png;base64,${base64}`);
  const bitmap = await createImageBitmap(await response.blob());
  if (
    bitmap.width !== bitmap.height ||
    bitmap.width < 768 ||
    bitmap.width > 2048
  ) {
    bitmap.close();
    throw invalid();
  }
  const sheet = canvas(SOURCE * 3);
  sheet.getContext("2d")!.drawImage(bitmap, 0, 0, sheet.width, sheet.height);
  bitmap.close();
  const results: Frame[] = [];
  for (let index = 0; index < 9; index++) {
    const tile = canvas(SOURCE),
      ctx = tile.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(
      sheet,
      (index % 3) * SOURCE,
      Math.floor(index / 3) * SOURCE,
      SOURCE,
      SOURCE,
      0,
      0,
      SOURCE,
      SOURCE,
    );
    const pixels = ctx.getImageData(0, 0, SOURCE, SOURCE);
    const seen = new Uint8Array(SOURCE * SOURCE);
    let main: number[] = [];
    for (let p = 0; p < seen.length; p++) {
      if (seen[p] || pixels.data[p * 4 + 3] < 80) continue;
      const blob = [p];
      seen[p] = 1;
      for (let cursor = 0; cursor < blob.length; cursor++) {
        const at = blob[cursor],
          x = at % SOURCE;
        for (const next of [
          x ? at - 1 : -1,
          x < SOURCE - 1 ? at + 1 : -1,
          at - SOURCE,
          at + SOURCE,
        ]) {
          if (
            next < 0 ||
            next >= seen.length ||
            seen[next] ||
            pixels.data[next * 4 + 3] < 80
          )
            continue;
          seen[next] = 1;
          blob.push(next);
        }
      }
      if (blob.length > main.length) main = blob;
    }
    if (main.length < 300 || main.length > SOURCE * SOURCE * 0.9)
      throw invalid();
    let floor = 0,
      mainLeft = SOURCE,
      mainRight = 0,
      mainTop = SOURCE;
    for (const p of main) {
      const x = p % SOURCE,
        y = Math.floor(p / SOURCE);
      floor = Math.max(floor, y);
      mainTop = Math.min(mainTop, y);
      mainLeft = Math.min(mainLeft, x);
      mainRight = Math.max(mainRight, x);
    }
    if (
      mainLeft < 2 ||
      mainRight > SOURCE - 3 ||
      mainTop < 2 ||
      floor > SOURCE - 3
    )
      throw invalid();
    let bodyLeft = SOURCE,
      bodyRight = 0;
    for (const p of main)
      if (Math.floor(p / SOURCE) >= floor - 16) {
        bodyLeft = Math.min(bodyLeft, p % SOURCE);
        bodyRight = Math.max(bodyRight, p % SOURCE);
      }
    let left = mainLeft,
      right = mainRight,
      top = mainTop;
    for (let p = 0; p < seen.length; p++)
      if (pixels.data[p * 4 + 3] >= 80) {
        left = Math.min(left, p % SOURCE);
        right = Math.max(right, p % SOURCE);
        top = Math.min(top, Math.floor(p / SOURCE));
      }
    results.push({
      canvas: tile,
      bodyX: (bodyLeft + bodyRight) / 2,
      floor,
      width: Math.max(1, bodyRight - bodyLeft),
      left,
      right,
      top,
    });
    // Yield between frames so preparation does not monopolize a mobile UI thread.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
  }
  return results;
}

export async function alignMascotAtlases(
  directionsBase64: string,
  reactionsBase64: string,
): Promise<MascotAtlasPair> {
  const all = [
    ...(await frames(directionsBase64)),
    ...(await frames(reactionsBase64)),
  ];
  const median = [...all].sort((a, b) => a.width - b.width)[9].width;
  const ratios = all.map((frame) =>
    Math.min(1.2, Math.max(0.8, median / frame.width)),
  );
  let halfWidth = 1,
    height = 1;
  all.forEach((frame, index) => {
    halfWidth = Math.max(
      halfWidth,
      (frame.bodyX - frame.left) * ratios[index],
      (frame.right - frame.bodyX) * ratios[index],
    );
    height = Math.max(height, (frame.floor - frame.top) * ratios[index]);
  });
  const scale = Math.min((TILE * 0.44) / halfWidth, (TILE * 0.84) / height);
  const outputs = [canvas(TILE * 3), canvas(TILE * 3)];
  all.forEach((frame, index) => {
    const ctx = outputs[index < 9 ? 0 : 1].getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const factor = scale * ratios[index],
      cell = index % 9;
    ctx.drawImage(
      frame.canvas,
      (cell % 3) * TILE + TILE / 2 - frame.bodyX * factor,
      Math.floor(cell / 3) * TILE + TILE * 0.93 - frame.floor * factor,
      SOURCE * factor,
      SOURCE * factor,
    );
  });
  return {
    directions: outputs[0].toDataURL("image/webp", 0.92),
    reactions: outputs[1].toDataURL("image/webp", 0.92),
  };
}

export async function prepareMascotReference(file: File): Promise<string> {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw new Error("Choose a PNG, JPEG or WebP reference image up to 5 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width > 4096 || bitmap.height > 4096)
      throw new Error("The image must be no larger than 4096 × 4096 pixels.");
    const factor = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    const image = document.createElement("canvas");
    image.width = Math.max(1, Math.round(bitmap.width * factor));
    image.height = Math.max(1, Math.round(bitmap.height * factor));
    image.getContext("2d")!.drawImage(bitmap, 0, 0, image.width, image.height);
    const encoded = image.toDataURL("image/png").split(",")[1];
    if (encoded.length > 2_796_000)
      throw new Error(
        "The reference image is too large. Choose a smaller image.",
      );
    return encoded;
  } finally {
    bitmap.close();
  }
}
