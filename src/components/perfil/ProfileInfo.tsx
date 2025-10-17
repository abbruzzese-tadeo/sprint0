"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase"; // ✅ tu instancia
import { useAuth } from "@/contexts/AuthContext"; // ✅ tu contexto real

export default function PerfilPage() {
  const router = useRouter();
  const { user, loading, authReady } = useAuth();

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
      <div className="min-h-[50vh] grid place-items-center text-slate-400">
        Cargando información del usuario...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[50vh] grid place-items-center text-slate-400">
        No hay sesión activa.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto text-slate-200">
      <h1 className="text-2xl font-bold text-white mb-6">Mi perfil</h1>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-400">Correo electrónico:</span>
          <span className="text-yellow-400 font-medium">{user.email}</span>
        </div>

        {user.role && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Rol:</span>
            <span className="text-emerald-400 font-medium capitalize">
              {user.role}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleResetPassword}
          className="bg-yellow-400 text-slate-900 hover:bg-yellow-300 font-semibold flex-1"
        >
          Restablecer contraseña
        </Button>

        <Button
          variant="outline"
          onClick={() => router.push("/dashboard")}
          className="text-slate-300 border-slate-700 hover:bg-slate-800 flex-1"
        >
          Volver al dashboard
        </Button>
      </div>
    </div>
  );
}
