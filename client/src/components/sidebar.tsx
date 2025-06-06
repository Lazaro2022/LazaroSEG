import { 
  BarChart3, 
  FileText, 
  Clock, 
  TrendingUp, 
  Settings,
  Shield,
  Users,
  Menu,
  X
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const navigationItems = [
  { icon: BarChart3, label: "Dashboard", href: "/" },
  { icon: FileText, label: "Documentos", href: "/documents" },
  { icon: Clock, label: "Prazos", href: "/deadlines" },
  { icon: TrendingUp, label: "Relatórios", href: "/reports" },
  { icon: Settings, label: "Configurações", href: "/settings" },
];

const adminNavigationItems = [
  { icon: Users, label: "Usuários", href: "/users" },
];

export function Sidebar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAdmin } = useAuth();

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800/90 backdrop-blur-sm border border-white/10 rounded-lg text-white"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 glass-morphism-dark fixed left-0 top-0 h-full z-50 flex flex-col transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="flex items-center space-x-3" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-yellow-400 tracking-wide">Lazarus</h1>
              <p className="text-xs text-gray-400 hidden sm:block">Sistema de Controle Documentos Judiciais</p>
            </div>
          </Link>
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-8">
          <ul className="space-y-2">
            {navigationItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <li key={index}>
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      sidebar-item flex items-center px-4 py-3 rounded-lg font-medium transition-all duration-300
                      ${isActive 
                        ? 'text-white bg-blue-600/30 border-l-2 border-l-[hsl(var(--neon-turquoise))]' 
                        : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
            
            {/* Admin Section */}
            {isAdmin && (
              <>
                <li className="pt-4">
                  <div className="flex items-center px-4 py-2">
                    <Shield className="w-4 h-4 mr-2 text-yellow-500" />
                    <span className="text-xs font-semibold text-yellow-500 uppercase tracking-wider">
                      Administração
                    </span>
                  </div>
                </li>
                {adminNavigationItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = location === item.href;
                  
                  return (
                    <li key={`admin-${index}`}>
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`
                          sidebar-item flex items-center px-4 py-3 rounded-lg font-medium transition-all duration-300
                          ${isActive 
                            ? 'text-white bg-yellow-600/30 border-l-2 border-l-yellow-500' 
                            : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                          }
                        `}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </>
            )}
          </ul>
        </nav>
      </aside>
    </>
  );
}
