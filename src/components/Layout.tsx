import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Home, Trophy, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "../utils";
import { TvboxModal } from "./TvboxModal";

export function Layout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [isTvboxModalOpen, setIsTvboxModalOpen] = useState(false);

  const navItems = [
    { name: "Home", path: "/", icon: <Home size={20} /> },
    { name: "Rankings", path: "/rankings", icon: <Trophy size={20} /> },
    { name: "Search", path: "/search", icon: <Search size={20} /> },
  ];

  const rawIndex = navItems.findIndex((item) => item.path === location.pathname);
  const hasActiveTab = rawIndex !== -1;
  const activeIndex = hasActiveTab ? rawIndex : 0;

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  useEffect(() => {
    const handleOpenModal = () => setIsTvboxModalOpen(true);
    window.addEventListener("open-tvbox-modal", handleOpenModal);
    return () => window.removeEventListener("open-tvbox-modal", handleOpenModal);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-white overflow-hidden relative">
      {/* Global Top Edge Cinematic Dissolve Mask */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-6 md:h-8 bg-gradient-to-b from-black to-transparent pointer-events-none" />

      {/* Floating Bottom Navigation */}
      <div className="fixed bottom-6 md:bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <nav className="relative flex items-center gap-2 p-1.5 rounded-full bg-[#121212] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.8)] pointer-events-auto">
          {/* Absolute Sliding Highlight Track */}
          <div
            className={cn(
              "absolute top-1.5 bottom-1.5 bg-white text-black rounded-full transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none",
              hasActiveTab ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )}
            style={{
              width: "136px",
              left: `calc(6px + ${activeIndex} * 136px + ${activeIndex} * 8px)`,
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
                  "relative z-10 flex items-center justify-center gap-2 w-[136px] py-2.5 rounded-full transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] outline-none font-medium tracking-wide will-change-transform transform-gpu backface-hidden",
                  "focus:outline-none focus-visible:outline-none select-none focus:scale-110 hover:scale-110",
                  isActive ? "text-black" : "text-white/70 hover:text-white"
                )}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}

          <div className="w-px h-5 bg-white/10 shrink-0" />

          <button
            type="button"
            onClick={() => setIsTvboxModalOpen(true)}
            aria-label="TVBox Sources Settings"
            title="TVBox / 影视仓配置源"
            className="group relative z-10 flex items-center justify-center w-[44px] h-[44px] rounded-full text-white/70 hover:text-white transition-colors duration-300 cursor-pointer focus:outline-none focus-visible:outline-none select-none"
          >
            <SlidersHorizontal
              size={19}
              className="transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-115 will-change-transform transform-gpu backface-hidden"
            />
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <main
        ref={mainRef}
        className="flex-1 relative w-full h-full overflow-y-auto overflow-x-hidden no-scrollbar pt-0 pb-[120px]"
      >
        <Outlet />
      </main>

      {/* TVBox / 影视仓 Source Configuration Modal */}
      <TvboxModal
        isOpen={isTvboxModalOpen}
        onClose={() => setIsTvboxModalOpen(false)}
      />
    </div>
  );
}
