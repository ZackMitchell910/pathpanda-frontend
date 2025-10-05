export function encodeState(obj: any) { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }
export function decodeState(s: string) { return JSON.parse(decodeURIComponent(escape(atob(s)))); }
