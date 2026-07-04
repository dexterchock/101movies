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
    <div className="flex flex-col min-h-screen w-screen bg-black text-white overflow-hidden relative">
      {/* Floating Top Navigation - Apple Liquid Glass */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <nav className="flex items-center gap-2 p-2 rounded-full bg-black/80 border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.6)] pointer-events-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                tabIndex={0}
                aria-label={item.name}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] outline-none font-medium tracking-wide",
                  "focus:ring-2 focus:ring-white focus:bg-white/20 focus:scale-105",
                  "hover:bg-white/20 hover:scale-105",
                  isActive ? "bg-white text-black hover:bg-white focus:bg-white" : "text-white"
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
      <main className="flex-1 relative w-full h-full overflow-y-auto overflow-x-hidden no-scrollbar pt-28 pb-12">
        <Outlet />
      </main>
    </div>
  );
}
