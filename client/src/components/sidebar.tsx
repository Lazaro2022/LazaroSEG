import { 
  BarChart3, 
  FileText, 
  Clock, 
  TrendingUp, 
  Settings,
  Shield
} from "lucide-react";

const navigationItems = [
  { icon: BarChart3, label: "Dashboard", href: "#", active: true },
  { icon: FileText, label: "Documentos", href: "#", active: false },
  { icon: Clock, label: "Prazos", href: "#", active: false },
  { icon: TrendingUp, label: "Relatórios", href: "#", active: false },
  { icon: Settings, label: "Configurações", href: "#", active: false },
];

export function Sidebar() {
  return (
    <aside className="w-64 glass-morphism-dark fixed left-0 top-0 h-full z-50 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-yellow-400 tracking-wide">
              Lazarus CG
            </h1>
            <p className="text-xs text-gray-400">Sistema de Controle</p>
          </div>
        </div>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-8">
        <ul className="space-y-2">
          {navigationItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <li key={index}>
                <a
                  href={item.href}
                  className={`
                    sidebar-item flex items-center px-4 py-3 rounded-lg font-medium transition-all duration-300
                    ${item.active 
                      ? 'text-white bg-blue-600/30 border-l-2 border-l-[hsl(var(--neon-turquoise))]' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <span>{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
