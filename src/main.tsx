import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Polyfill scrollTo / scroll for legacy Smart TV browsers (Chromium < 61 / older WebKit)
if (typeof window !== 'undefined') {
  if (typeof Element !== 'undefined') {
    const proto = Element.prototype as any;
    const origScrollTo = proto.scrollTo;
    proto.scrollTo = function (optionsOrX?: any, y?: any) {
      if (typeof optionsOrX === 'object' && optionsOrX !== null) {
        const left = typeof optionsOrX.left === 'number' ? optionsOrX.left : this.scrollLeft;
        const top = typeof optionsOrX.top === 'number' ? optionsOrX.top : this.scrollTop;
        try {
          if (typeof origScrollTo === 'function') {
            return origScrollTo.call(this, optionsOrX);
          }
        } catch {
          // If native scrollTo rejects dictionary options
        }
        try {
          if (typeof origScrollTo === 'function') {
            return origScrollTo.call(this, left, top);
          }
        } catch {}
        this.scrollLeft = left;
        this.scrollTop = top;
      } else {
        try {
          if (typeof origScrollTo === 'function') {
            return origScrollTo.call(this, optionsOrX, y);
          }
        } catch {}
        if (typeof optionsOrX === 'number') this.scrollLeft = optionsOrX;
        if (typeof y === 'number') this.scrollTop = y;
      }
    };

    if (!proto.scroll) {
      proto.scroll = proto.scrollTo;
    }
  }

  const origWinScrollTo = window.scrollTo;
  window.scrollTo = function (optionsOrX?: any, y?: any) {
    if (typeof optionsOrX === 'object' && optionsOrX !== null) {
      const left = typeof optionsOrX.left === 'number' ? optionsOrX.left : (window.pageXOffset || 0);
      const top = typeof optionsOrX.top === 'number' ? optionsOrX.top : (window.pageYOffset || 0);
      try {
        if (typeof origWinScrollTo === 'function') {
          return origWinScrollTo.call(window, optionsOrX);
        }
      } catch {}
      try {
        if (typeof origWinScrollTo === 'function') {
          return origWinScrollTo.call(window, left, top);
        }
      } catch {}
    } else {
      try {
        if (typeof origWinScrollTo === 'function') {
          return origWinScrollTo.call(window, optionsOrX, y);
        }
      } catch {}
    }
  };
  if (!window.scroll) {
    window.scroll = window.scrollTo;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
