import { useEffect, useLayoutEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Flame, Trophy, Search } from "lucide-react";
import { cn } from "../utils";

export function Layout() {
  const location = useLocation();

  const navItems = [
    { name: "Trending", path: "/", icon: <Flame size={20} /> },
    { name: "Rankings", path: "/rankings", icon: <Trophy size={20} /> },
    { name: "Search", path: "/search", icon: <Search size={20} /> },
  ];

  const rawIndex = navItems.findIndex((item) => item.path === location.pathname);
  const hasActiveTab = rawIndex !== -1;
  const activeIndex = hasActiveTab ? rawIndex : 0;

  const isPlayerPage = location.pathname.startsWith("/player/");

  useLayoutEffect(() => {
    if (!isPlayerPage) {
      sessionStorage.setItem(
        "last_browse_path",
        `${location.pathname}${location.search || ""}`
      );
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

  const navTabWidth = isMobileNav ? 104 : 136;
  const navTabGap = isMobileNav ? 4 : 8;

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-white overflow-hidden relative select-none">
      {/* Floating Bottom Navigation */}
      {!isPlayerPage && (
        <div className="fixed bottom-4 sm:bottom-5 md:bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
          <nav className="relative flex items-center gap-1 sm:gap-2 p-1.5 rounded-full bg-white/[0.07] border border-white/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_8px_32px_rgba(0,0,0,0.75)] pointer-events-auto max-w-full">
            {/* Sliding Highlight Track */}
            <div
              className={cn(
                "absolute top-1.5 bottom-1.5 left-1.5 bg-white text-black rounded-full transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none",
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
                    "group relative z-10 flex items-center justify-center py-2 sm:py-2.5 text-xs sm:text-base rounded-full transition-colors duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] outline-none font-medium tracking-wide shrink-0",
                    "focus:outline-none focus-visible:outline-none select-none",
                    isActive ? "text-black" : "text-white/75 hover:text-white"
                  )}
                >
                  <span className="flex items-center gap-1.5 sm:gap-2 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110 group-focus:scale-110 will-change-transform transform-gpu">
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
