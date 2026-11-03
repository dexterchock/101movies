import { useLayoutEffect, useRef } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Home, Trophy, Search } from "lucide-react";
import { cn } from "../utils";

export function Layout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const activeScrollPathRef = useRef<string>(location.pathname);
  const isRestoringScrollRef = useRef<boolean>(false);

  const navItems = [
    { name: "Home", path: "/", icon: <Home size={20} /> },
    { name: "Rankings", path: "/rankings", icon: <Trophy size={20} /> },
    { name: "Search", path: "/search", icon: <Search size={20} /> },
  ];

  const rawIndex = navItems.findIndex((item) => item.path === location.pathname);
  const hasActiveTab = rawIndex !== -1;
  const activeIndex = hasActiveTab ? rawIndex : 0;

  const isPlayerPage = location.pathname.startsWith("/player/");

  useLayoutEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    isRestoringScrollRef.current = true;
    activeScrollPathRef.current = location.pathname;

    if (isPlayerPage) {
      el.scrollTop = 0;
      isRestoringScrollRef.current = false;
      return;
    }

    sessionStorage.setItem(
      "last_browse_path",
      `${location.pathname}${location.search || ""}`
    );

    const saved = sessionStorage.getItem(`scroll_pos_${location.pathname}`);
    const targetTop = saved ? parseInt(saved, 10) : 0;
    const validTop = Number.isNaN(targetTop) ? 0 : targetTop;

    // Set scrollTop synchronously before browser paint to prevent any frame shift/stutter
    el.scrollTop = validTop;

    const rafId = requestAnimationFrame(() => {
      isRestoringScrollRef.current = false;
    });

    return () => {
      cancelAnimationFrame(rafId);
      isRestoringScrollRef.current = false;
    };
  }, [location.pathname, location.search, isPlayerPage]);

  const handleMainScroll = () => {
    if (isPlayerPage || !mainRef.current || isRestoringScrollRef.current) return;
    if (activeScrollPathRef.current !== location.pathname) return;
    sessionStorage.setItem(
      `scroll_pos_${location.pathname}`,
      String(mainRef.current.scrollTop)
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-white overflow-hidden relative">
      {/* Global Top Edge Cinematic Dissolve Mask (Hidden on Player page so video has no top tint) */}
      {!isPlayerPage && (
        <div className="fixed top-0 left-0 right-0 z-[60] h-6 md:h-8 bg-gradient-to-b from-black to-transparent pointer-events-none" />
      )}

      {/* Floating Bottom Navigation with Apple Liquid Glass Blur */}
      {!isPlayerPage && (
        <div className="fixed bottom-6 md:bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <nav className="relative flex items-center gap-2 p-1.5 rounded-full bg-white/[0.07] backdrop-blur-md border border-white/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_8px_32px_rgba(0,0,0,0.75)] pointer-events-auto">
            {/* Sliding Highlight Track */}
            <div
              className={cn(
                "absolute top-1.5 bottom-1.5 left-1.5 bg-white text-black rounded-full transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none",
                hasActiveTab ? "opacity-100 scale-100" : "opacity-0 scale-95"
              )}
              style={{
                width: "136px",
                transform: `translate3d(${activeIndex * (136 + 8)}px, 0, 0)`,
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
                  className={cn(
                    "relative z-10 flex items-center justify-center gap-2 w-[136px] py-2.5 rounded-full transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] outline-none font-medium tracking-wide",
                    "focus:outline-none focus-visible:outline-none select-none focus:scale-110 hover:scale-110",
                    isActive ? "text-black" : "text-white/75 hover:text-white"
                  )}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main
        ref={mainRef}
        onScroll={handleMainScroll}
        className={cn(
          "flex-1 relative w-full h-full overflow-x-hidden no-scrollbar pt-0",
          isPlayerPage ? "pb-0 overflow-hidden" : "pb-[120px] overflow-y-auto"
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
