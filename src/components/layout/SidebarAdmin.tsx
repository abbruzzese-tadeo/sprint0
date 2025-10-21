"use client";
import { useDashboardUI } from "@/stores/useDashboardUI";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import LogoutConfirm from "@/components/ui/LogoutConfirm";


export default function SidebarAdmin() {
  const { section, setSection } = useDashboardUI();
  const { user, logout } = useAuth();
  const router = useRouter();
  const initials = user?.email?.charAt(0).toUpperCase() ?? "A";
  

  const items = [
    { id: "home", label: "Inicio" },
    { id: "cursos", label: "Cursos" },
    { id: "usuarios", label: "Usuarios" },
    { id: "perfil", label: "Perfil" },
  ];

  const handleLogout = async () => {
  try {
    await logout();
    router.replace("/login"); // 👈 replace evita volver con "atrás"
  } catch (error) {
    console.error("Error en logout:", error);
  }
};
  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col">
      <div className="p-4 font-bold text-lg border-b border-slate-700">
        Admin Panel
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id as any)}
            className={`w-full text-left px-4 py-2 rounded-md transition ${
              section === item.id
                ? "bg-yellow-400 text-black font-semibold"
                : "hover:bg-slate-800"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold">
            {initials}
          </div>
          <div className="flex flex-col">
            <span className="text-gray-300 text-sm">Hola,</span>
            <span className="text-white text-sm truncate max-w-[150px]">
              {user?.email}
            </span>
          </div>
        </div>
        {/* <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-200 hover:text-white transition"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Cerrar sesión</span>
        </button> */}
        <LogoutConfirm />
      </div>
    </aside>
  );
}
