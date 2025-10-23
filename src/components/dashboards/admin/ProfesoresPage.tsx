"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useMemo, useEffect } from "react";
import {
  FiSearch,
  FiUser,
  FiMail,
  FiCalendar,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiX,
  FiGlobe,
  FiFlag,
} from "react-icons/fi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogTitle,
  DialogPortal,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, deleteDoc, setDoc } from "firebase/firestore";
import { addProfesorToBatch } from "@/lib/profesorBatches";

export default function ProfesoresPage() {
  const {
    profesores,
    loadProfesores,
    loadingProfesores,
    reloadData,
  } = useAuth();

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfesor, setEditingProfesor] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    idioma: "",
    nivel: "",
  });

  useEffect(() => {
  if (!profesores?.length) {
    loadProfesores?.();
  }
}, [profesores]);

  // 🔹 Filtrado dinámico por email o nombre
  const filteredProfesores = useMemo(() => {
    if (!Array.isArray(profesores)) return [];
    return profesores.filter((p) => {
      const q = search.toLowerCase();
      return (
        p.email?.toLowerCase().includes(q) ||
        p.nombre?.toLowerCase().includes(q) ||
        p.apellido?.toLowerCase().includes(q)
      );
    });
  }, [profesores, search]);

  /* =========================================================
     🔹 CRUD Actions
  ========================================================= */
  const handleDelete = async (id: string) => {
    try {
      const confirmDelete = confirm(
        "¿Seguro que deseas eliminar este profesor?"
      );
      if (!confirmDelete) return;
      await deleteDoc(doc(db, "profesores", "batch_1", "profesores", id));
      toast.success("Profesor eliminado correctamente");
      await loadProfesores?.();
    } catch (err) {
      console.error("❌ Error eliminando profesor:", err);
      toast.error("Error al eliminar profesor");
    }
  };

  const handleSave = async () => {
    const { nombre, apellido, email, idioma, nivel } = formData;

    if (!email || !nombre || !apellido || !idioma || !nivel) {
      toast.error("Completa todos los campos del formulario");
      return;
    }

    try {
      await addProfesorToBatch({
  nombre: formData.nombre,
  apellido: formData.apellido,
  email: formData.email,
  idioma: formData.idioma,
  nivel: formData.nivel,
});

      toast.success(
        editingProfesor
          ? "Profesor actualizado correctamente"
          : "Profesor creado correctamente"
      );

      setIsModalOpen(false);
      setEditingProfesor(null);
      setFormData({
        nombre: "",
        apellido: "",
        email: "",
        idioma: "",
        nivel: "",
      });
      await loadProfesores?.();
    } catch (err) {
      console.error("❌ Error guardando profesor:", err);
      toast.error("Error al guardar profesor");
    }
  };

  const openModalForCreate = () => {
    setEditingProfesor(null);
    setFormData({
      nombre: "",
      apellido: "",
      email: "",
      idioma: "",
      nivel: "",
    });
    setIsModalOpen(true);
  };

  const openModalForEdit = (profesor: any) => {
    setEditingProfesor(profesor);
    setFormData({
      nombre: profesor.nombre || "",
      apellido: profesor.apellido || "",
      email: profesor.email || "",
      idioma: profesor.idioma || "",
      nivel: profesor.nivel || "",
    });
    setIsModalOpen(true);
  };

  /* =========================================================
     🔹 Render
  ========================================================= */

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 space-y-10">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FiUser className="text-blue-600" />
            Profesores
          </h1>
          <p className="text-gray-500 mt-1">
            Gestiona los profesores del campus. Crea, edita o elimina docentes.
          </p>
        </div>
        <Button
          onClick={openModalForCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          <FiPlus size={16} /> Nuevo profesor
        </Button>
      </header>

      {/* BUSCADOR */}
      <div className="relative max-w-md">
        <FiSearch size={18} className="absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar profesor por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white shadow-sm"
        />
      </div>

      {/* LISTADO */}
      {loadingProfesores ? (
        <div className="text-center text-gray-500 py-10 bg-white rounded-xl border border-gray-200 shadow-sm">
          Cargando profesores...
        </div>
      ) : filteredProfesores.length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-white rounded-xl border border-gray-200 shadow-sm">
          No hay profesores registrados.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm table-auto border-collapse">
  <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
    <tr>
      <th className="px-5 py-3 text-left w-[35%]">Profesor</th>
      <th className="px-5 py-3 text-left w-[20%]">Idioma</th>
      <th className="px-5 py-3 text-left w-[20%]">Nivel</th>
      <th className="px-5 py-3 text-left w-[15%]">Fecha de alta</th>
      <th className="px-5 py-3 text-left w-[10%]">Acciones</th>
    </tr>
  </thead>
  <tbody>
    {filteredProfesores.map((p, i) => (
      <tr
        key={i}
        className="border-t border-gray-100 hover:bg-gray-50 transition"
      >
        {/* Profesor */}
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              {p.nombre?.charAt(0)?.toUpperCase() ?? "P"}
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-gray-800">
                {p.nombre} {p.apellido}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <FiMail size={12} />
                {p.email}
              </span>
            </div>
          </div>
        </td>

        {/* Idioma */}
<td className="px-5 py-4 text-gray-600">
  <span className="inline-flex items-center gap-1">
    <FiGlobe size={12} className="text-gray-400" />
    {p.idioma || "-"}
  </span>
</td>

{/* Nivel */}
<td className="px-5 py-4 text-gray-600">
  <span className="inline-flex items-center gap-1">
    <FiFlag size={12} className="text-gray-400" />
    {p.nivel || "-"}
  </span>
</td>

{/* Fecha de alta */}
<td className="px-5 py-4 text-gray-600">
  <span className="inline-flex items-center gap-1">
    <FiCalendar size={12} className="text-gray-400" />
    {p.createdAt
      ? new Date(p.createdAt).toLocaleDateString("es-AR")
      : "N/A"}
  </span>
</td>


        {/* Acciones */}
        <td className="px-5 py-4 flex gap-2">
          <button
            onClick={() => openModalForEdit(p)}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-semibold"
          >
            <FiEdit2 size={12} /> Editar
          </button>
          <button
            onClick={() => handleDelete(p.uid)}
            className="flex items-center gap-1 text-red-600 hover:text-red-800 text-xs font-semibold"
          >
            <FiTrash2 size={12} /> Eliminar
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>

        </div>
      )}

      {/* MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
          <DialogContent 
            className="
              fixed left-1/2 top-1/2 z-50
              -translate-x-1/2 -translate-y-1/2
              w-[92vw] max-w-md
              rounded-xl border border-gray-200 bg-white p-6 shadow-2xl
              max-h-[90vh] overflow-y-auto
              focus:outline-none
            "
          >
            <VisuallyHidden>
              <DialogTitle>
                {editingProfesor ? "Editar Profesor" : "Nuevo Profesor"}
              </DialogTitle>
            </VisuallyHidden>

            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-800">
                <FiUser className="text-blue-600" />
                {editingProfesor ? "Editar Profesor" : "Nuevo Profesor"}
              </h2>
              {/* <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={18} />
              </button> */}
            </div>

            
            {/* FORMULARIO MEJORADO */}
<div className="space-y-5">
  {/* NOMBRE / APELLIDO */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-600 mb-1">Nombre</label>
      <input
        type="text"
        placeholder="Ej: Tadeo"
        value={formData.nombre}
        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      />
    </div>

    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-600 mb-1">Apellido</label>
      <input
        type="text"
        placeholder="Ej: Abbruzzese"
        value={formData.apellido}
        onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      />
    </div>
  </div>

  {/* EMAIL */}
  <div className="flex flex-col">
    <label className="text-sm font-medium text-gray-600 mb-1">Email</label>
    <input
      type="email"
      placeholder="profesor@further.edu"
      value={formData.email}
      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
    />
  </div>

  {/* IDIOMA / NIVEL */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-600 mb-1">Idioma</label>
      <input
        type="text"
        placeholder="Ej: English"
        value={formData.idioma}
        onChange={(e) => setFormData({ ...formData, idioma: e.target.value })}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      />
    </div>

    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-600 mb-1">Nivel</label>
      <select
        value={formData.nivel}
        onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
      >
        <option value="">Seleccionar nivel</option>
        <option value="A1">A1 - Beginner</option>
        <option value="A2">A2 - Elementary</option>
        <option value="B1">B1 - Intermediate</option>
        <option value="B2">B2 - Upper Intermediate</option>
        <option value="C1">C1 - Advanced</option>
        <option value="C2">C2 - Mastery</option>
      </select>
    </div>
  </div>
</div>


            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border-gray-300 px-4 text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700"
              >
                {editingProfesor ? "Guardar cambios" : "Crear profesor"}
              </Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
