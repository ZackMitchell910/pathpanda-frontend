export type SimetrixRequestInit = RequestInit & {
  headers?: HeadersInit;
};

type PathInput = string | URL;

export type SimetrixClient = {
  resolvePath: (path: string) => string;
  getHeaders: () => Record<string, string>;
  request: (pathOrUrl: PathInput, init?: SimetrixRequestInit) => Promise<Response>;
  getText: (pathOrUrl: PathInput, init?: SimetrixRequestInit) => Promise<string>;
  getJson: <T = unknown>(pathOrUrl: PathInput, init?: SimetrixRequestInit) => Promise<T>;
  postJson: <T = unknown>(
    path: string,
    body?: unknown,
    init?: SimetrixRequestInit
  ) => Promise<T>;
};

const toHeadersRecord = (headers?: HeadersInit): Record<string, string> => {
  const out: Record<string, string> = {};
  if (!headers) return out;
  const h = new Headers(headers);
  h.forEach((value, key) => {
    out[key] = value;
  });
  return out;
};

export function createSimetrixClient({
  resolvePath,
  getHeaders,
}: {
  resolvePath: (path: string) => string;
  getHeaders: () => Record<string, string>;
}): SimetrixClient {
  const mergeInit = (init?: SimetrixRequestInit): RequestInit => {
    const baseHeaders = new Headers(getHeaders());
    const extraHeaders = toHeadersRecord(init?.headers);
    Object.entries(extraHeaders).forEach(([key, value]) => {
      baseHeaders.set(key, value);
    });

    return {
      ...init,
      credentials: init?.credentials ?? "include",
      headers: baseHeaders,
    };
  };

  const resolveUrl = (pathOrUrl: PathInput) => {
    const value = typeof pathOrUrl === "string" ? pathOrUrl : pathOrUrl.toString();
    return /^https?:\/\//i.test(value) ? value : resolvePath(value);
  };

  const request = (pathOrUrl: PathInput, init?: SimetrixRequestInit) =>
    fetch(resolveUrl(pathOrUrl), mergeInit(init));

  const getText = async (pathOrUrl: PathInput, init?: SimetrixRequestInit) => {
    const resp = await request(pathOrUrl, init);
    const txt = await resp.text();
    if (!resp.ok) {
      throw new Error(txt || `HTTP ${resp.status}`);
    }
    return txt;
  };

  const getJson = async <T>(pathOrUrl: PathInput, init?: SimetrixRequestInit) => {
    const txt = await getText(pathOrUrl, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        Accept: "application/json",
      },
    });
    return txt ? (JSON.parse(txt) as T) : ({} as T);
  };

  const postJson = async <T>(
    path: string,
    body?: unknown,
    init?: SimetrixRequestInit
  ) =>
    getJson<T>(path, {
      ...init,
      method: init?.method ?? "POST",
      body: body !== undefined ? JSON.stringify(body) : init?.body,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });

  return {
    resolvePath,
    getHeaders,
    request,
    getText,
    getJson,
    postJson,
  };
}
