"use client";

import { useDashboardUI } from "@/stores/useDashboardUI";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  FiHome,
  FiBookOpen,
  FiUsers,
  FiBarChart2,
  FiUser,
  FiLogOut,
} from "react-icons/fi";

export default function SidebarAdmin() {
  const { section, setSection } = useDashboardUI();
  const { user, logout } = useAuth();
  const router = useRouter();
  const initials = user?.email?.charAt(0).toUpperCase() ?? "A";

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // 🔹 Navegación principal
  const menuCampus = [
    { id: "home", label: "Dashboard", icon: <FiHome size={16} /> },
    { id: "material", label: "Material Académico", icon: <FiBookOpen size={16} /> },
    { id: "alumnos", label: "Alumnos", icon: <FiUsers size={16} /> },
    { id: "profesores", label: "Profesores", icon: <FiUser size={16} /> },
    { id: "estadisticas", label: "Estadísticas", icon: <FiBarChart2 size={16} /> },
  ];

  const menuCuenta = [
    { id: "perfil", label: "Perfil", icon: <FiUser size={16} /> },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* HEADER */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800 tracking-tight">
          Further Campus
        </h1>
        <p className="text-xs text-gray-500 mt-1">Panel de administración</p>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto">
        <SectionTitle>Administrar</SectionTitle>
        <ul className="space-y-1 mb-6">
          {menuCampus.map((item) => (
            <SidebarButton
              key={item.id}
              id={item.id}
              icon={item.icon}
              label={item.label}
              active={section === item.id}
              onClick={() => setSection(item.id as any)}
            />
          ))}
        </ul>

        <SectionTitle>Cuenta</SectionTitle>
        <ul className="space-y-1">
          {menuCuenta.map((item) => (
            <SidebarButton
              key={item.id}
              id={item.id}
              icon={item.icon}
              label={item.label}
              active={section === item.id}
              onClick={() => setSection(item.id as any)}
            />
          ))}
        </ul>
      </nav>

      {/* FOOTER */}
      <div className="border-t border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            {initials}
          </div>
          <div className="flex flex-col truncate">
            <span className="text-sm font-medium text-gray-800 truncate max-w-[150px]">
              {user?.email}
            </span>
            <span className="text-xs text-gray-500">Administrador</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium text-sm transition"
        >
          <FiLogOut size={16} />
          Cerrar sesión
        </button>

        <p className="text-xs text-gray-400 text-center mt-5">
          © {new Date().getFullYear()} Further Academy
        </p>
      </div>
    </aside>
  );
}

/* 🔹 COMPONENTES AUXILIARES */
function SidebarButton({
  id,
  icon,
  label,
  active,
  onClick,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
        active
          ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase text-gray-400 font-semibold tracking-wide px-4 mb-2 mt-1">
      {children}
    </p>
  );
}
