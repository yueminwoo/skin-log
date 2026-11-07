// 사진 줄이기 / 잘라내기
async function decode(blob) {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}

const dims = (im) => [im.naturalWidth || im.width, im.naturalHeight || im.height];

/** 긴 변 max px의 JPEG로 변환 (아이폰 HEIC도 사파리에서 JPEG로 넘어옴) */
export async function resizeImage(file, max = 1600, quality = 0.85) {
  const im = await decode(file);
  const [w, h] = dims(im);
  const scale = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  im.close?.();
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('사진 변환 실패'))), 'image/jpeg', quality));
}

const bitmapCache = new Map();
function bitmap(key, blob) {
  if (!bitmapCache.has(key)) {
    if (bitmapCache.size > 40) bitmapCache.delete(bitmapCache.keys().next().value);
    bitmapCache.set(key, decode(blob));
  }
  return bitmapCache.get(key);
}

/** (x,y)=사진 비율 좌표 중심으로 정사각형 잘라서 dataURL. frac = 사진 너비 대비 잘라낼 크기 */
export async function cropAround(key, blob, x, y, frac = 0.2, out = 220) {
  const im = await bitmap(key, blob);
  const [w, h] = dims(im);
  const side = Math.min(w, h, Math.round(w * frac));
  const sx = Math.max(0, Math.min(w - side, Math.round(x * w - side / 2)));
  const sy = Math.max(0, Math.min(h - side, Math.round(y * h - side / 2)));
  const c = document.createElement('canvas');
  c.width = c.height = out;
  const g = c.getContext('2d');
  g.drawImage(im, sx, sy, side, side, 0, 0, out, out);
  // 위치 표시 링
  const cx = ((x * w - sx) / side) * out;
  const cy = ((y * h - sy) / side) * out;
  g.strokeStyle = 'rgba(255,255,255,0.75)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(cx, cy, out * 0.12, 0, Math.PI * 2);
  g.stroke();
  return c.toDataURL('image/jpeg', 0.85);
}
