import { Link, Outlet, useLocation } from "react-router-dom";
import { Home, Trophy, Search } from "lucide-react";
import { cn } from "../utils";

export function Layout() {
  const location = useLocation();
  const navItems = [
    { name: "Home", path: "/", icon: <Home size={20} /> },
    { name: "Rankings", path: "/rankings", icon: <Trophy size={20} /> },
    { name: "Search", path: "/search", icon: <Search size={20} /> },
  ];

  const activeIndex = Math.max(
    0,
    navItems.findIndex((item) => item.path === location.pathname)
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-white overflow-hidden relative">
      {/* Global Top Edge Cinematic Dissolve Mask */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-6 md:h-8 bg-gradient-to-b from-black to-transparent pointer-events-none" />

      {/* Floating Bottom Navigation - Apple Liquid Glass */}
      <div className="fixed bottom-6 md:bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <nav className="relative flex items-center gap-2 p-1.5 rounded-full bg-white/5 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] pointer-events-auto">
          {/* Absolute Sliding Highlight Track */}
          <div
            className="absolute top-1.5 bottom-1.5 bg-white text-black rounded-full transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] shadow-[0_0_30px_rgba(255,255,255,0.4)] border border-white/40 pointer-events-none"
            style={{
              width: "136px",
              left: `calc(6px + ${activeIndex} * 136px + ${activeIndex} * 8px)`,
            }}
          />

          {navItems.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <Link
                key={item.path}
                to={item.path}
                tabIndex={0}
                aria-label={item.name}
                className={cn(
                  "relative z-10 flex items-center justify-center gap-2 w-[136px] py-2.5 rounded-full transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] outline-none font-medium tracking-wide will-change-transform transform-gpu backface-hidden [backface-visibility:hidden]",
                  "focus:ring-2 focus:ring-white focus:scale-110 hover:scale-110",
                  isActive ? "text-black" : "text-white/70 hover:text-white"
                )}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      
      {/* Main Content Area */}
      <main className="flex-1 relative w-full h-full overflow-y-auto overflow-x-hidden no-scrollbar pt-0 pb-[120px]">
        <Outlet />
      </main>
    </div>
  );
}
