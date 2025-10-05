export function throttle<T extends (...a:any[])=>void>(fn: T, ms: number) {
  let last = 0, t: any;
  return (...args: Parameters<T>) => {
    const now = Date.now(), remain = ms - (now - last);
    if (remain <= 0) { last = now; fn(...args); }
    else { clearTimeout(t); t = setTimeout(() => { last = Date.now(); fn(...args); }, remain); }
  };
}
