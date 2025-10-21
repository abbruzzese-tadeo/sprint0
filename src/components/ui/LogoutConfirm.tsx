"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay } from "@/components/ui/dialog";
import { LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LogoutConfirm() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await logout();
      toast.success(`Hasta pronto, ${user?.email?.split("@")[0]} 👋`);
      router.replace("/login");
    } catch {
      toast.error("Error al cerrar sesión");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      {/* 🔹 Botón que abre el modal */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-all duration-200"
      >
        <LogOut size={18} />
        <span>Cerrar sesión</span>
      </button>

      {/* 🔹 Modal de confirmación */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogOverlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
        <DialogContent className="bg-white rounded-2xl shadow-xl max-w-sm p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-800">
              ¿Deseas cerrar tu sesión?
            </DialogTitle>
          </DialogHeader>

          <p className="text-gray-500 text-sm">
            Tendrás que iniciar sesión nuevamente para acceder al panel.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
              disabled={loading}
            >
              Cancelar
            </button>

            <button
              onClick={handleConfirm}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Cerrando..." : "Sí, salir"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
