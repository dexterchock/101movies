/**
 * Inline SVG icon helpers (zero external icon runtime).
 */

function svg(
  body: string,
  className = "",
  opts: { fill?: string; strokeWidth?: number; size?: number } = {}
): string {
  const fill = opts.fill ?? "none";
  const sw = opts.strokeWidth ?? 2;
  const sizeAttr = opts.size ? ` width="${opts.size}" height="${opts.size}"` : "";
  const clsAttr = className ? ` class="${className}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg"${sizeAttr} viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${clsAttr}>${body}</svg>`;
}

export const icons = {
  flame: (className = "") =>
    svg(
      `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>`,
      className
    ),
  trophy: (className = "") =>
    svg(
      `<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>`,
      className
    ),
  history: (className = "") =>
    svg(
      `<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>`,
      className
    ),
  search: (className = "") =>
    svg(
      `<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>`,
      className
    ),
  chevronLeft: (className = "") =>
    svg(`<path d="m15 18-6-6 6-6"/>`, className),
  chevronRight: (className = "") =>
    svg(`<path d="m9 18 6-6-6-6"/>`, className),
  chevronUp: (className = "", size = 14) =>
    svg(`<path d="m18 15-6-6-6 6"/>`, className, { size }),
  arrowLeft: (className = "") =>
    svg(`<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>`, className),
  star: (className = "") =>
    svg(
      `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
      className,
      { fill: "currentColor" }
    ),
  film: (className = "") =>
    svg(
      `<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>`,
      className
    ),
  tv: (className = "") =>
    svg(
      `<rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/>`,
      className
    ),
  x: (className = "", size?: number, strokeWidth = 2) =>
    svg(`<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`, className, {
      size,
      strokeWidth,
    }),
  layers: (className = "", size = 14) =>
    svg(
      `<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>`,
      className,
      { size }
    ),
  play: (className = "", size = 13) =>
    svg(`<polygon points="6 3 20 12 6 21 6 3"/>`, className, {
      size,
      fill: "currentColor",
    }),
  server: (size = 18) =>
    svg(
      `<rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>`,
      "",
      { size }
    ),
  copy: (size = 13) =>
    svg(
      `<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>`,
      "",
      { size }
    ),
  check: (className = "", size = 13) =>
    svg(`<path d="M20 6 9 17l-5-5"/>`, className, { size }),
  refreshCw: (className = "", size = 13) =>
    svg(
      `<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>`,
      className,
      { size }
    ),
  link2: (className = "", size = 13) =>
    svg(
      `<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/>`,
      className,
      { size }
    ),
  plus: (size = 14) =>
    svg(`<path d="M5 12h14"/><path d="M12 5v14"/>`, "", { size }),
  activity: (size = 14) =>
    svg(
      `<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>`,
      "",
      { size }
    ),
  folderGit2: (size = 13) =>
    svg(
      `<path d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v5"/><circle cx="13" cy="12" r="2"/><path d="M18 19c-2.8 0-5-2.2-5-5v8"/><circle cx="20" cy="19" r="2"/>`,
      "",
      { size }
    ),
};
