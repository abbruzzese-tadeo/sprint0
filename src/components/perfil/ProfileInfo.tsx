"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { FiMail, FiUser, FiArrowLeft, FiLogOut, FiLock } from "react-icons/fi";

export default function PerfilPage() {
  const router = useRouter();
  const { user, loading, authReady, logout } = useAuth();

  const handleResetPassword = async () => {
    if (!user?.email) {
      toast.error("No hay un usuario autenticado.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast.success("Se ha enviado un correo para restablecer tu contraseña.");
    } catch (err: any) {
      console.error(err);
      toast.error("Error al enviar el correo de restablecimiento.");
    }
  };

  if (!authReady || loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-slate-400">
        Cargando información del usuario...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-slate-400">
        No hay sesión activa.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1220] text-slate-200 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl bg-[#0F172A] border border-slate-800 rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <FiUser className="text-yellow-400" size={26} />
              Mi perfil
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Gestiona tu información personal y credenciales.
            </p>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="text-slate-400 hover:text-yellow-400 transition flex items-center gap-1 text-sm"
          >
            <FiArrowLeft size={18} /> Volver
          </button>
        </div>

        {/* Avatar e Info */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-yellow-400/20 border border-yellow-500 flex items-center justify-center text-yellow-400 text-3xl font-bold mb-4">
            {user.email?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <h2 className="text-xl font-semibold text-white">
            {user.displayName || "Usuario autenticado"}
          </h2>
          <p className="text-slate-400 text-sm mt-1">{user.email}</p>
        </div>

        {/* Datos */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 mb-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <FiMail size={16} />
              <span>Correo electrónico</span>
            </div>
            <span className="text-yellow-400 font-medium truncate max-w-[60%] text-right">
              {user.email}
            </span>
          </div>

          {user.role && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <FiUser size={16} />
                <span>Rol</span>
              </div>
              <span className="text-emerald-400 font-medium capitalize">
                {user.role}
              </span>
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            onClick={handleResetPassword}
            className="bg-yellow-400 text-slate-900 hover:bg-yellow-300 font-semibold flex items-center justify-center gap-2 py-5 rounded-xl shadow-md"
          >
            <FiLock size={18} />
            Restablecer contraseña
          </Button>

          <Button
            variant="outline"
            onClick={logout}
            className="text-slate-300 border-slate-700 hover:bg-slate-800 font-semibold flex items-center justify-center gap-2 py-5 rounded-xl"
          >
            <FiLogOut size={18} />
            Cerrar sesión
          </Button>
        </div>

        {/* Footer */}
        <p className="text-xs text-slate-600 mt-10 text-center">
          © {new Date().getFullYear()} Further Academy. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
