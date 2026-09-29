// Downscale big photos so projects fit in browser storage.
export function shrinkImage(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = rej;
    fr.onload = () => {
      if (/gif|svg/.test(file.type)) return res(fr.result);
      const img = new Image();
      img.onerror = rej;
      img.onload = () => {
        const max = 1600;
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.86));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
