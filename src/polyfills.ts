// Targeted runtime polyfills for legacy Smart TV browsers (e.g., Samsung Tizen 4.0 / Chromium 56).
// Every guard is a no-op on modern desktop and mobile browsers.

if (typeof window !== "undefined" && typeof document !== "undefined") {
  // 1. Detect :focus-visible selector support so legacy browsers can use html.no-focus-visible rules
  try {
    document.querySelector(":focus-visible");
  } catch {
    document.documentElement.classList.add("no-focus-visible");
  }

  // 2. Polyfill plain-object record constructor support for URLSearchParams (Chrome < 61)
  if (typeof window.URLSearchParams === "function") {
    try {
      const probe = new window.URLSearchParams({ a: "1" } as unknown as string);
      if (probe.toString() !== "a=1") {
        const NativeURLSearchParams = window.URLSearchParams;
        const PatchedURLSearchParams = function (
          init?:
            | string
            | string[][]
            | Record<string, string>
            | URLSearchParams
        ): URLSearchParams {
          if (
            init &&
            typeof init === "object" &&
            !Array.isArray(init) &&
            !(init instanceof NativeURLSearchParams) &&
            Object.prototype.toString.call(init) === "[object Object]"
          ) {
            const instance = new NativeURLSearchParams();
            const record = init as Record<string, string>;
            const keys = Object.keys(record);
            for (let i = 0; i < keys.length; i++) {
              const key = keys[i];
              instance.append(key, String(record[key]));
            }
            return instance;
          }
          return init === undefined
            ? new NativeURLSearchParams()
            : new NativeURLSearchParams(init as string);
        } as unknown as typeof URLSearchParams;
        PatchedURLSearchParams.prototype = NativeURLSearchParams.prototype;
        window.URLSearchParams = PatchedURLSearchParams;
      }
    } catch {
      // Ignore if URLSearchParams cannot be patched
    }
  }
}

// 2. Element.prototype.append / Element.prototype.replaceChildren / NodeList.prototype.forEach / focus options
if (
  typeof NodeList !== "undefined" &&
  NodeList.prototype &&
  !(NodeList.prototype as any).forEach
) {
  (NodeList.prototype as any).forEach = Array.prototype.forEach;
}

if (
  typeof HTMLElement !== "undefined" &&
  HTMLElement.prototype &&
  typeof HTMLElement.prototype.focus === "function"
) {
  let supportsFocusOptions = false;
  try {
    const probeEl = document.createElement("button");
    probeEl.focus({
      get preventScroll() {
        supportsFocusOptions = true;
        return true;
      },
    });
  } catch {
    supportsFocusOptions = false;
  }
  if (!supportsFocusOptions) {
    const origFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function (this: HTMLElement) {
      try {
        origFocus.call(this);
      } catch {}
    };
  }
}

if (typeof Element !== "undefined") {
  if (!Element.prototype.append) {
    Element.prototype.append = function (...nodes: (Node | string)[]) {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        frag.appendChild(
          node instanceof Node ? node : document.createTextNode(String(node))
        );
      }
      this.appendChild(frag);
    };
  }

  if (!Element.prototype.replaceChildren) {
    Element.prototype.replaceChildren = function (...nodes: (Node | string)[]) {
      while (this.firstChild) {
        this.removeChild(this.firstChild);
      }
      if (nodes.length > 0) {
        const frag = document.createDocumentFragment();
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          frag.appendChild(
            node instanceof Node ? node : document.createTextNode(String(node))
          );
        }
        this.appendChild(frag);
      }
    };
  }
}

// 3. String.prototype.padStart / padEnd (Chrome 57)
if (!String.prototype.padStart) {
  String.prototype.padStart = function (targetLength: number, padString = " ") {
    const len = targetLength >> 0;
    const str = String(this);
    if (str.length >= len) return str;
    const pad = String(padString || " ");
    const needed = len - str.length;
    let prefix = "";
    while (prefix.length < needed) {
      prefix += pad;
    }
    return prefix.slice(0, needed) + str;
  };
}

if (!String.prototype.padEnd) {
  String.prototype.padEnd = function (targetLength: number, padString = " ") {
    const len = targetLength >> 0;
    const str = String(this);
    if (str.length >= len) return str;
    const pad = String(padString || " ");
    const needed = len - str.length;
    let suffix = "";
    while (suffix.length < needed) {
      suffix += pad;
    }
    return str + suffix.slice(0, needed);
  };
}

// 4. Promise.prototype.finally (Chrome 63) & Promise.allSettled (Chrome 76)
if (typeof Promise !== "undefined") {
  if (!Promise.prototype.finally) {
    Promise.prototype.finally = function <T>(
      this: Promise<T>,
      onFinally?: (() => void) | null
    ): Promise<T> {
      const handler =
        typeof onFinally === "function" ? onFinally : () => undefined;
      return this.then(
        (value) => Promise.resolve(handler()).then(() => value),
        (reason) =>
          Promise.resolve(handler()).then(() => {
            throw reason;
          })
      );
    };
  }

  if (typeof (Promise as any).allSettled !== "function") {
    (Promise as any).allSettled = function (iterable: Iterable<unknown>) {
      const items = Array.from(iterable);
      return Promise.all(
        items.map((item) =>
          Promise.resolve(item).then(
            (value) => ({ status: "fulfilled" as const, value }),
            (reason) => ({ status: "rejected" as const, reason })
          )
        )
      );
    };
  }
}

// 5. AbortController / AbortSignal (Chrome 66), fetch init sanitization, & addEventListener({ signal }) (Chrome 90)
if (typeof window !== "undefined") {
  const createPolyfillAbortError = (): Error => {
    try {
      const domErr = new DOMException("Aborted", "AbortError");
      if (domErr && domErr.name === "AbortError") {
        return domErr;
      }
    } catch {}
    const err = new Error("Aborted");
    err.name = "AbortError";
    return err;
  };

  const hasNativeAbortController =
    typeof (window as any).AbortController === "function";

  if (!hasNativeAbortController) {
    type AbortListener = (ev: Event) => void;

    class PolyfillAbortSignal {
      aborted = false;
      reason: unknown = undefined;
      onabort: ((this: PolyfillAbortSignal, ev: Event) => void) | null = null;
      private listeners = new Map<EventListenerOrEventListenerObject, AbortListener>();

      addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions
      ) {
        if (type !== "abort" || !listener) return;
        const once = typeof options === "object" && options !== null && !!options.once;
        const rawFn: AbortListener =
          typeof listener === "function"
            ? listener
            : (ev: Event) => listener.handleEvent(ev);
        const fn: AbortListener = once
          ? (ev: Event) => {
              this.listeners.delete(listener);
              rawFn.call(this, ev);
            }
          : rawFn;
        this.listeners.set(listener, fn);
      }

      removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null) {
        if (type !== "abort" || !listener) return;
        this.listeners.delete(listener);
      }

      dispatchEvent(event: Event): boolean {
        if (event.type !== "abort") return true;
        if (typeof this.onabort === "function") {
          this.onabort.call(this, event);
        }
        Array.from(this.listeners.values()).forEach((fn) => {
          try {
            fn.call(this, event);
          } catch {}
        });
        return true;
      }

      throwIfAborted() {
        if (this.aborted) {
          throw this.reason;
        }
      }
    }

    class PolyfillAbortController {
      readonly signal = new PolyfillAbortSignal();

      abort(reason?: unknown) {
        if (this.signal.aborted) return;
        this.signal.aborted = true;
        this.signal.reason =
          reason !== undefined ? reason : createPolyfillAbortError();
        let evt: Event;
        try {
          evt = new Event("abort");
        } catch {
          evt = document.createEvent("Event");
          evt.initEvent("abort", false, false);
        }
        this.signal.dispatchEvent(evt);
      }
    }

    (window as any).AbortSignal = PolyfillAbortSignal;
    (window as any).AbortController = PolyfillAbortController;
  }

  // Wrap window.fetch only when native fetch rejects polyfilled signal or unsupported init options (e.g. older Tizen/WebKit)
  if (typeof window.fetch === "function") {
    let nativeFetchSupportsSignal = false;
    if (hasNativeAbortController) {
      try {
        if (typeof Request === "function") {
          new Request("https://example.com/", {
            signal: new AbortController().signal,
          });
          nativeFetchSupportsSignal = true;
        } else {
          nativeFetchSupportsSignal = true;
        }
      } catch {
        nativeFetchSupportsSignal = false;
      }
    }

    let nativeFetchSupportsCache = false;
    try {
      if (typeof Request === "function") {
        new Request("https://example.com/", { cache: "no-store" });
        nativeFetchSupportsCache = true;
      }
    } catch {
      nativeFetchSupportsCache = false;
    }

    let nativeFetchSupportsKeepalive = false;
    try {
      if (typeof Request === "function") {
        new Request("https://example.com/", { keepalive: false } as RequestInit);
        nativeFetchSupportsKeepalive = true;
      }
    } catch {
      nativeFetchSupportsKeepalive = false;
    }

    if (
      !nativeFetchSupportsSignal ||
      !nativeFetchSupportsCache ||
      !nativeFetchSupportsKeepalive
    ) {
      const origFetch = window.fetch.bind(window);
      window.fetch = function (
        input: RequestInfo | URL,
        init?: RequestInit
      ): Promise<Response> {
        if (!init || typeof init !== "object") {
          return origFetch(input);
        }

        const sig = !nativeFetchSupportsSignal
          ? (init.signal as AbortSignal | undefined)
          : undefined;
        if (sig && sig.aborted) {
          return Promise.reject(createPolyfillAbortError());
        }

        const cleanInit: Record<string, unknown> = {};
        const keys = Object.keys(init);
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          if (k === "signal" && !nativeFetchSupportsSignal) continue;
          if (k === "cache" && !nativeFetchSupportsCache) continue;
          if (k === "keepalive" && !nativeFetchSupportsKeepalive) continue;
          cleanInit[k] = (init as Record<string, unknown>)[k];
        }

        const fetchPromise =
          Object.keys(cleanInit).length > 0
            ? origFetch(input, cleanInit as RequestInit)
            : origFetch(input);

        if (!sig) {
          return fetchPromise;
        }

        return new Promise<Response>((resolve, reject) => {
          let settled = false;
          const onAbort = () => {
            if (settled) return;
            settled = true;
            reject(createPolyfillAbortError());
          };
          sig.addEventListener("abort", onAbort, { once: true });
          fetchPromise.then(
            (res) => {
              if (settled) return;
              settled = true;
              sig.removeEventListener("abort", onAbort);
              resolve(res);
            },
            (err) => {
              if (settled) return;
              settled = true;
              sig.removeEventListener("abort", onAbort);
              reject(err);
            }
          );
        });
      };
    }
  }

  // Test if EventTarget.addEventListener honors { signal }; wrap if unsupported (Chrome < 90)
  if (typeof EventTarget !== "undefined" && typeof (window as any).AbortController === "function") {
    let supportsListenerSignal = false;
    try {
      const testEl = document.createElement("div");
      const testAc = new AbortController();
      let fired = false;
      testEl.addEventListener("x-sig-test", () => {
        fired = true;
      }, { signal: testAc.signal });
      testAc.abort();
      testEl.dispatchEvent(new Event("x-sig-test"));
      supportsListenerSignal = !fired;
    } catch {
      supportsListenerSignal = false;
    }

    if (!supportsListenerSignal) {
      const origAdd = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function (
        this: EventTarget,
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions
      ) {
        if (
          options &&
          typeof options === "object" &&
          options.signal
        ) {
          const sig = options.signal;
          if (sig.aborted || !listener) return;
          const cleanOpts: AddEventListenerOptions = {
            capture: !!options.capture,
            once: !!options.once,
            passive: !!options.passive,
          };
          const captureFlag = !!options.capture;
          const onAbort = () => {
            this.removeEventListener(type, listener, captureFlag);
          };
          sig.addEventListener("abort", onAbort, { once: true });
          try {
            origAdd.call(this, type, listener, cleanOpts);
          } catch {
            origAdd.call(this, type, listener, captureFlag);
          }
          return;
        }
        try {
          origAdd.call(this, type, listener, options);
        } catch {
          origAdd.call(
            this,
            type,
            listener,
            typeof options === "object" && options !== null ? !!options.capture : !!options
          );
        }
      };
    }
  }
}
