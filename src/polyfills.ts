// Targeted runtime polyfills for legacy Smart TV browsers (e.g., Samsung Tizen 3.0/4.0, Chromium 47/56).
// Every guard is a no-op on modern desktop and mobile browsers.

// 0. Core ES5 runtime shims for Tizen 3.0 (which strips Object.assign, Number.*, Map, Set, Promise)
if (typeof (Object as any).assign !== "function") {
  (Object as any).assign = function (target: any) {
    if (target == null) {
      throw new TypeError("Cannot convert undefined or null to object");
    }
    const to = Object(target);
    for (let i = 1; i < arguments.length; i++) {
      const nextSource = arguments[i];
      if (nextSource != null) {
        for (const key in nextSource) {
          if (Object.prototype.hasOwnProperty.call(nextSource, key)) {
            to[key] = nextSource[key];
          }
        }
      }
    }
    return to;
  };
}

if (typeof (Number as any).isFinite !== "function") {
  (Number as any).isFinite = (v: unknown): v is number =>
    typeof v === "number" && isFinite(v);
}
if (typeof (Number as any).isNaN !== "function") {
  (Number as any).isNaN = (v: unknown): boolean =>
    typeof v === "number" && isNaN(v);
}
if (typeof (Number as any).isInteger !== "function") {
  (Number as any).isInteger = (v: unknown): v is number =>
    typeof v === "number" && isFinite(v) && Math.floor(v) === v;
}
if (typeof (Number as any).parseInt !== "function") {
  (Number as any).parseInt = parseInt;
}
if (typeof (Number as any).parseFloat !== "function") {
  (Number as any).parseFloat = parseFloat;
}

if (
  typeof NodeList !== "undefined" &&
  NodeList.prototype &&
  !(NodeList.prototype as any).forEach
) {
  (NodeList.prototype as any).forEach = Array.prototype.forEach;
}

if (typeof Promise === "undefined") {
  const globalObj = (
    typeof window !== "undefined" ? window : globalThis
  ) as any;

  const defer = (fn: () => void) => setTimeout(fn, 0);

  class PolyfillPromise<T = unknown> {
    private _state = 0; // 0: pending, 1: fulfilled, 2: rejected
    private _value: any = undefined;
    private _handlers: Array<{
      onFulfilled?: (val: any) => any;
      onRejected?: (err: any) => any;
      resolve: (val: any) => void;
      reject: (err: any) => void;
    }> = [];

    constructor(
      executor: (
        resolve: (value?: T | PromiseLike<T>) => void,
        reject: (reason?: any) => void
      ) => void
    ) {
      const resolve = (val?: any) => {
        if (this._state !== 0) return;
        if (val === this) {
          reject(new TypeError("Chaining cycle detected for promise"));
          return;
        }
        if (val && (typeof val === "object" || typeof val === "function")) {
          let called = false;
          try {
            const thenFn = val.then;
            if (typeof thenFn === "function") {
              thenFn.call(
                val,
                (y: any) => {
                  if (!called) {
                    called = true;
                    resolve(y);
                  }
                },
                (r: any) => {
                  if (!called) {
                    called = true;
                    reject(r);
                  }
                }
              );
              return;
            }
          } catch (e) {
            if (!called) reject(e);
            return;
          }
        }
        this._state = 1;
        this._value = val;
        this._flush();
      };

      const reject = (err?: any) => {
        if (this._state !== 0) return;
        this._state = 2;
        this._value = err;
        this._flush();
      };

      try {
        executor(resolve, reject);
      } catch (e) {
        reject(e);
      }
    }

    private _flush() {
      const state = this._state;
      const val = this._value;
      const list = this._handlers;
      this._handlers = [];
      defer(() => {
        for (let i = 0; i < list.length; i++) {
          const h = list[i];
          const cb = state === 1 ? h.onFulfilled : h.onRejected;
          if (typeof cb === "function") {
            try {
              h.resolve(cb(val));
            } catch (err) {
              h.reject(err);
            }
          } else if (state === 1) {
            h.resolve(val);
          } else {
            h.reject(val);
          }
        }
      });
    }

    then(onFulfilled?: any, onRejected?: any) {
      return new PolyfillPromise((resolve, reject) => {
        this._handlers.push({ onFulfilled, onRejected, resolve, reject });
        if (this._state !== 0) {
          this._flush();
        }
      });
    }

    catch(onRejected?: any) {
      return this.then(undefined, onRejected);
    }

    finally(onFinally?: (() => void) | null) {
      const handler =
        typeof onFinally === "function" ? onFinally : () => undefined;
      return this.then(
        (v: any) => PolyfillPromise.resolve(handler()).then(() => v),
        (r: any) =>
          PolyfillPromise.resolve(handler()).then(() => {
            throw r;
          })
      );
    }

    static resolve(val?: any) {
      if (val instanceof PolyfillPromise) return val;
      return new PolyfillPromise((resolve) => resolve(val));
    }

    static reject(err?: any) {
      return new PolyfillPromise((_, reject) => reject(err));
    }

    static all(iterable: Iterable<any>) {
      return new PolyfillPromise((resolve, reject) => {
        const items = Array.from(iterable || []);
        if (items.length === 0) {
          resolve([]);
          return;
        }
        const results = new Array(items.length);
        let remaining = items.length;
        for (let i = 0; i < items.length; i++) {
          ((idx: number) => {
            PolyfillPromise.resolve(items[idx]).then(
              (val: any) => {
                results[idx] = val;
                remaining--;
                if (remaining === 0) resolve(results);
              },
              reject
            );
          })(i);
        }
      });
    }

    static race(iterable: Iterable<any>) {
      return new PolyfillPromise((resolve, reject) => {
        const items = Array.from(iterable || []);
        for (let i = 0; i < items.length; i++) {
          PolyfillPromise.resolve(items[i]).then(resolve, reject);
        }
      });
    }

    static allSettled(iterable: Iterable<any>) {
      const items = Array.from(iterable || []);
      return PolyfillPromise.all(
        items.map((item) =>
          PolyfillPromise.resolve(item).then(
            (value: any) => ({ status: "fulfilled", value }),
            (reason: any) => ({ status: "rejected", reason })
          )
        )
      );
    }
  }

  globalObj.Promise = PolyfillPromise;
}

if (typeof Map === "undefined") {
  const globalObj = (
    typeof window !== "undefined" ? window : globalThis
  ) as any;

  class PolyfillMap<K = any, V = any> {
    private _keys: K[] = [];
    private _vals: V[] = [];

    constructor(entries?: Iterable<[K, V]> | Array<[K, V]> | null) {
      if (entries) {
        const list = Array.isArray(entries) ? entries : Array.from(entries);
        for (let i = 0; i < list.length; i++) {
          const pair = list[i];
          if (pair) this.set(pair[0], pair[1]);
        }
      }
    }

    get size(): number {
      return this._keys.length;
    }

    private _indexOf(key: K): number {
      for (let i = 0; i < this._keys.length; i++) {
        const k = this._keys[i];
        if (k === key || (k !== k && key !== key)) return i;
      }
      return -1;
    }

    has(key: K): boolean {
      return this._indexOf(key) !== -1;
    }

    get(key: K): V | undefined {
      const idx = this._indexOf(key);
      return idx === -1 ? undefined : this._vals[idx];
    }

    set(key: K, value: V): this {
      const idx = this._indexOf(key);
      if (idx === -1) {
        this._keys.push(key);
        this._vals.push(value);
      } else {
        this._vals[idx] = value;
      }
      return this;
    }

    delete(key: K): boolean {
      const idx = this._indexOf(key);
      if (idx === -1) return false;
      this._keys.splice(idx, 1);
      this._vals.splice(idx, 1);
      return true;
    }

    clear(): void {
      this._keys.length = 0;
      this._vals.length = 0;
    }

    forEach(cb: (value: V, key: K, map: this) => void, thisArg?: any): void {
      for (let i = 0; i < this._keys.length; i++) {
        cb.call(thisArg, this._vals[i], this._keys[i], this);
      }
    }

    keys() {
      let i = 0;
      const keys = this._keys;
      const iter: any = {
        next: () =>
          i < keys.length
            ? { value: keys[i++], done: false }
            : { value: undefined, done: true },
        [Symbol ? Symbol.iterator : "@@iterator"]: () => iter,
      };
      return iter;
    }

    values() {
      let i = 0;
      const vals = this._vals;
      const iter: any = {
        next: () =>
          i < vals.length
            ? { value: vals[i++], done: false }
            : { value: undefined, done: true },
      };
      return iter;
    }

    entries() {
      let i = 0;
      const keys = this._keys;
      const vals = this._vals;
      const iter: any = {
        next: () =>
          i < keys.length
            ? { value: [keys[i], vals[i++]] as [K, V], done: false }
            : { value: undefined, done: true },
      };
      return iter;
    }
  }

  globalObj.Map = PolyfillMap;
}

if (typeof Set === "undefined") {
  const globalObj = (
    typeof window !== "undefined" ? window : globalThis
  ) as any;

  class PolyfillSet<T = any> {
    private _items: T[] = [];

    constructor(values?: Iterable<T> | Array<T> | null) {
      if (values) {
        const list = Array.isArray(values) ? values : Array.from(values);
        for (let i = 0; i < list.length; i++) {
          this.add(list[i]);
        }
      }
    }

    get size(): number {
      return this._items.length;
    }

    private _indexOf(val: T): number {
      for (let i = 0; i < this._items.length; i++) {
        const v = this._items[i];
        if (v === val || (v !== v && val !== val)) return i;
      }
      return -1;
    }

    has(val: T): boolean {
      return this._indexOf(val) !== -1;
    }

    add(val: T): this {
      if (this._indexOf(val) === -1) {
        this._items.push(val);
      }
      return this;
    }

    delete(val: T): boolean {
      const idx = this._indexOf(val);
      if (idx === -1) return false;
      this._items.splice(idx, 1);
      return true;
    }

    clear(): void {
      this._items.length = 0;
    }

    forEach(cb: (value: T, value2: T, set: this) => void, thisArg?: any): void {
      for (let i = 0; i < this._items.length; i++) {
        const v = this._items[i];
        cb.call(thisArg, v, v, this);
      }
    }

    values() {
      let i = 0;
      const items = this._items;
      return {
        next: () =>
          i < items.length
            ? { value: items[i++], done: false }
            : { value: undefined, done: true },
      };
    }

    keys() {
      return this.values();
    }

    entries() {
      let i = 0;
      const items = this._items;
      return {
        next: () => {
          if (i >= items.length) return { value: undefined, done: true };
          const v = items[i++];
          return { value: [v, v] as [T, T], done: false };
        },
      };
    }
  }

  globalObj.Set = PolyfillSet;
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  // 1. Detect :focus-visible selector support so legacy browsers can use html.no-focus-visible rules
  try {
    document.querySelector(":focus-visible");
  } catch {
    document.documentElement.classList.add("no-focus-visible");
  }

  // 2. Polyfill URLSearchParams when absent (Chrome < 49) OR plain-object record constructor (Chrome < 61)
  if (typeof window.URLSearchParams !== "function") {
    class PolyfillURLSearchParams {
      private _pairs: Array<[string, string]> = [];

      constructor(
        init?: string | string[][] | Record<string, string> | URLSearchParams
      ) {
        if (typeof init === "string") {
          const raw = init.charAt(0) === "?" ? init.slice(1) : init;
          if (raw) {
            const parts = raw.split("&");
            for (let i = 0; i < parts.length; i++) {
              const part = parts[i];
              if (!part) continue;
              const eqIdx = part.indexOf("=");
              const k = eqIdx === -1 ? part : part.slice(0, eqIdx);
              const v = eqIdx === -1 ? "" : part.slice(eqIdx + 1);
              this.append(
                decodeURIComponent(k.replace(/\+/g, " ")),
                decodeURIComponent(v.replace(/\+/g, " "))
              );
            }
          }
        } else if (Array.isArray(init)) {
          for (let i = 0; i < init.length; i++) {
            const pair = init[i];
            if (pair && pair.length >= 2) {
              this.append(String(pair[0]), String(pair[1]));
            }
          }
        } else if (init && typeof init === "object") {
          const rec = init as Record<string, string>;
          const keys = Object.keys(rec);
          for (let i = 0; i < keys.length; i++) {
            this.append(keys[i], String(rec[keys[i]]));
          }
        }
      }

      append(name: string, value: string): void {
        this._pairs.push([String(name), String(value)]);
      }

      delete(name: string): void {
        const key = String(name);
        this._pairs = this._pairs.filter((p) => p[0] !== key);
      }

      get(name: string): string | null {
        const key = String(name);
        for (let i = 0; i < this._pairs.length; i++) {
          if (this._pairs[i][0] === key) return this._pairs[i][1];
        }
        return null;
      }

      has(name: string): boolean {
        return this.get(name) !== null;
      }

      set(name: string, value: string): void {
        this.delete(name);
        this.append(name, value);
      }

      forEach(
        cb: (value: string, key: string, parent: this) => void,
        thisArg?: any
      ): void {
        for (let i = 0; i < this._pairs.length; i++) {
          cb.call(thisArg, this._pairs[i][1], this._pairs[i][0], this);
        }
      }

      entries() {
        let i = 0;
        const pairs = this._pairs;
        return {
          next: () =>
            i < pairs.length
              ? { value: pairs[i++], done: false }
              : { value: undefined, done: true },
        };
      }

      toString(): string {
        return this._pairs
          .map(
            (p) =>
              `${encodeURIComponent(p[0]).replace(/%20/g, "+")}=${encodeURIComponent(
                p[1]
              ).replace(/%20/g, "+")}`
          )
          .join("&");
      }
    }

    (window as any).URLSearchParams = PolyfillURLSearchParams;
  } else {
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

// 2. Element.prototype.append / Element.prototype.replaceChildren (Chrome 54 / Chrome 86)
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

// 5. AbortController / AbortSignal (Chrome 66) & addEventListener({ signal }) (Chrome 90)
if (typeof window !== "undefined") {
  if (typeof (window as any).AbortController === "undefined") {
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
        if (reason !== undefined) {
          this.signal.reason = reason;
        } else {
          try {
            this.signal.reason = new DOMException("Aborted", "AbortError");
          } catch {
            const err = new Error("Aborted");
            err.name = "AbortError";
            this.signal.reason = err;
          }
        }
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
