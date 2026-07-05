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

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-white overflow-hidden relative">
      {/* Floating Bottom Navigation - Apple Liquid Glass */}
      <div className="fixed bottom-4 md:bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <nav className="flex items-center gap-2 p-1.5 rounded-full bg-white/5 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] pointer-events-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                tabIndex={0}
                aria-label={item.name}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] outline-none font-medium tracking-wide relative",
                  "focus:ring-2 focus:ring-white focus:scale-105",
                  isActive 
                    ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.4)] border border-white/40" 
                    : "text-white/70 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 hover:scale-105"
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
