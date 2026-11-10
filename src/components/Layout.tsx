import { useEffect, useLayoutEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Flame } from "lucide-react";
import { cn } from "../utils";

function CleanTrophy({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <mask id="nav-trophy-mask">
          <rect width="24" height="24" fill="black" />
          <g stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978" />
            <path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978" />
            <path d="M18 9h1.5a1 1 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" />
            <path d="M6 9H4.5a1 1 0 0 1 0-5H6" />
          </g>
        </mask>
      </defs>
      <rect width="24" height="24" fill="currentColor" mask="url(#nav-trophy-mask)" />
    </svg>
  );
}

function CleanSearch({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <mask id="nav-search-mask">
          <rect width="24" height="24" fill="black" />
          <g stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.34-4.34" />
          </g>
        </mask>
      </defs>
      <rect width="24" height="24" fill="currentColor" mask="url(#nav-search-mask)" />
    </svg>
  );
}

export function Layout() {
  const location = useLocation();

  const navItems = [
    { name: "Trending", path: "/", icon: <Flame size={20} className="shrink-0" /> },
    { name: "Rankings", path: "/rankings", icon: <CleanTrophy size={20} className="shrink-0" /> },
    { name: "Search", path: "/search", icon: <CleanSearch size={20} className="shrink-0" /> },
  ];

  const rawIndex = navItems.findIndex((item) => item.path === location.pathname);
  const hasActiveTab = rawIndex !== -1;
  const activeIndex = hasActiveTab ? rawIndex : 0;

  const isPlayerPage = location.pathname.startsWith("/player/");

  useLayoutEffect(() => {
    if (!isPlayerPage) {
      try {
        sessionStorage.setItem(
          "last_browse_path",
          `${location.pathname}${location.search || ""}`
        );
      } catch {}
    }
  }, [location.pathname, location.search, isPlayerPage]);

  const [isMobileNav, setIsMobileNav] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobileNav(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const navTabWidth = isMobileNav ? 96 : 136;
  const navTabGap = isMobileNav ? 4 : 8;

  return (
    <div className="flex flex-col min-h-[100dvh] h-[100dvh] w-screen bg-black text-white overflow-hidden relative select-none">
      {/* Floating Bottom Navigation */}
      {!isPlayerPage && (
        <div className="fixed bottom-2 sm:bottom-2.5 md:bottom-5 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none pb-[env(safe-area-inset-bottom)]">
          <nav className="relative flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 rounded-full bg-white/[0.07] border border-white/[0.14] shadow-[0_8px_32px_rgba(0,0,0,0.75)] backdrop-blur-xl pointer-events-auto max-w-full">
            {/* Sliding Highlight Track */}
            <div
              className={cn(
                "absolute top-1 sm:top-1.5 bottom-1 sm:bottom-1.5 left-1 sm:left-1.5 bg-white text-black rounded-full transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none",
                hasActiveTab ? "opacity-100 scale-100" : "opacity-0 scale-95"
              )}
              style={{
                width: `${navTabWidth}px`,
                transform: `translate3d(${activeIndex * (navTabWidth + navTabGap)}px, 0, 0)`,
              }}
            />

            {navItems.map((item, index) => {
              const isActive = hasActiveTab && index === activeIndex;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  tabIndex={0}
                  aria-label={item.name}
                  style={{ width: `${navTabWidth}px` }}
                  className={cn(
                    "group relative z-10 flex items-center justify-center py-2 sm:py-2.5 text-xs sm:text-base rounded-full transition-all duration-300 outline-none font-medium tracking-wide shrink-0",
                    "focus:outline-none focus-visible:outline-none select-none",
                    isActive
                      ? "text-black opacity-100"
                      : "text-white opacity-75 hover:opacity-100 focus:opacity-100"
                  )}
                >
                  <span className="flex items-center gap-1.5 sm:gap-2">
                    {item.icon}
                    <span>{item.name}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content Area (Locked Viewport, Zero Scroll) */}
      <main className="flex-1 relative w-full h-full overflow-hidden pt-0 pb-0">
        <Outlet />
      </main>
    </div>
  );
}
