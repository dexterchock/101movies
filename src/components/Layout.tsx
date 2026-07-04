import { Link, Outlet, useLocation } from "react-router-dom";
import { Home, Trophy, Search, Film } from "lucide-react";
import { cn } from "../utils";

export function Layout() {
  const location = useLocation();
  const navItems = [
    { name: "Home", path: "/", icon: <Home size={28} /> },
    { name: "Rankings", path: "/rankings", icon: <Trophy size={28} /> },
    { name: "Search", path: "/search", icon: <Search size={28} /> },
  ];

  return (
    <div className="flex h-screen w-screen bg-black text-white overflow-hidden">
      {/* Sidebar - optimized for TV with large touch/focus targets */}
      <nav className="flex flex-col items-center w-24 border-r border-white/10 py-8 bg-black z-50 shrink-0">
        <div className="mb-12 text-white">
          <Film size={36} className="text-white" />
        </div>
        <div className="flex flex-col gap-6 w-full px-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                tabIndex={0}
                aria-label={item.name}
                className={cn(
                  "flex justify-center items-center w-full aspect-square rounded-xl transition-all duration-200 outline-none",
                  "focus:ring-4 focus:ring-white focus:scale-110 focus:bg-white/10",
                  isActive ? "text-white bg-white/20" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                )}
              >
                {item.icon}
              </Link>
            );
          })}
        </div>
      </nav>
      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto no-scrollbar">
        <Outlet />
      </main>
    </div>
  );
}
