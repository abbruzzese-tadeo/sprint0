"use client";
import { useDashboardUI } from "@/stores/useDashboardUI";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { FiHome, FiBookOpen, FiAward, FiUser, FiLogOut } from "react-icons/fi";

export default function SidebarAlumno() {
  const { section, setSection } = useDashboardUI();
  const { user, logout } = useAuth();
  const router = useRouter();

  const initials = user?.email?.charAt(0).toUpperCase() ?? "A";

  const items = [
    { id: "home", label: "Home", icon: <FiHome size={16} /> },
    { id: "miscursos", label: "My Courses", icon: <FiBookOpen size={16} /> },
    { id: "certificados", label: "Certificates", icon: <FiAward size={16} /> },
    { id: "perfil", label: "Profile Information", icon: <FiUser size={16} /> },
  ];

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col min-h-screen">
      {/* LOGO */}
      <div className="p-5 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-800">Further School</h1>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 p-3 space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id as any)}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition ${
              section === item.id
                ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* FOOTER / USER INFO */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            {initials}
          </div>
          <div className="flex flex-col truncate">
            <span className="text-sm font-medium text-gray-800 truncate max-w-[150px]">
              {user?.email}
            </span>
            <span className="text-xs text-gray-500">Alumno</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium text-sm transition"
        >
          <FiLogOut size={16} />
          Log out
        </button>
      </div>

      {/* COPYRIGHT */}
      <div className="text-xs text-gray-400 text-center p-3 border-t border-gray-100">
        © {new Date().getFullYear()} Further School
      </div>
    </aside>
  );
}
