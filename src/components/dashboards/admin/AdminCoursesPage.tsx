"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogOverlay,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import CourseCard from "@/app/dashboard/cursos/CourseCard";
import CreateCourse from "@/app/dashboard/cursos/crear/CreateCourse";
import EditCourseForm from "@/app/dashboard/cursos/edit/EditCourseForm";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =========================================================
   🔸 AdminCoursesPage — 100% data desde AuthContext
   ========================================================= */
export default function AdminCoursesPage() {
  const {
    allCursos,          // ✅ todos los cursos del contexto
    loadingAllCursos,   // ✅ estado de carga
    reloadData,
  } = useAuth();

  // UI states
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Local display formatting
  const [localCourses, setLocalCourses] = useState<any[]>([]);

  /* =========================================================
     🔹 Sincronizar datos globales con visual
     ========================================================= */
  useEffect(() => {
    if (Array.isArray(allCursos)) {
      setLocalCourses(
        allCursos.map((c: any) => ({
          id: c.id ?? c.docId ?? (() => {
  console.warn("⚠️ Curso sin id detectado:", c);
  return "";
})(),

          title: c.titulo || "Sin título",
          description: c.descripcion || "",
          level: c.nivel || "N/A",
          category: c.categoria || "Sin categoría",
          type: c.capstone ? "Proyecto Capstone" : "Curso",
          students: Array.isArray(c.cursantes) ? c.cursantes.length : 0,
          units: Array.isArray(c.unidades) ? c.unidades.length : 0,
          lessons: Array.isArray(c.unidades)
            ? c.unidades.reduce(
                (acc: number, u: any) => acc + (u.lecciones?.length || 0),
                0
              )
            : 0,
          pdfs: Array.isArray(c.unidades)
            ? c.unidades.reduce(
                (acc: number, u: any) =>
                  acc +
                  (u.lecciones?.filter((l: any) => l.pdfUrl)?.length || 0),
                0
              )
            : 0,
          duration: Array.isArray(c.unidades)
            ? `${c.unidades.reduce(
                (acc: number, u: any) => acc + (u.duracion || 0),
                0
              )} min`
            : "—",
          created: c.creadoEn
            ? new Date(c.creadoEn.seconds * 1000).toLocaleDateString()
            : "N/A",
          price: Number(c.precio?.monto || 0),
          oldPrice: Number(
            c.precio?.descuentoActivo && c.precio?.montoDescuento
              ? c.precio.monto
              : c.precio?.monto || 0
          ),
          image: c.urlImagen || "/images/default-course.jpg",
          featured: !!c.precio?.descuentoActivo,
          visible: c.publico ?? true,
          videoPresentacion: c.videoPresentacion || "",
        }))
      );
    }
  }, [allCursos]);

  /* =========================================================
     🔹 CRUD actions
     ========================================================= */

  // 🟢 Crear curso
  const handleCourseCreated = async () => {
    setIsCreateModalOpen(false);
    toast.success("Curso creado correctamente");
    await reloadData();
  };

  // 🟡 Editar curso
  const handleEdit = (course: any) => {
    setSelectedCourse(course);
    setIsModalOpen(true);
  };

  // 🔴 Eliminar curso
  const handleDelete = async (id: string) => {
    try {
      const confirmDelete = confirm("¿Seguro que deseas eliminar este curso?");
      if (!confirmDelete) return;

      await deleteDoc(doc(db, "cursos", id));
      toast.success("Curso eliminado correctamente");
      await reloadData();
    } catch (err) {
      console.error("❌ Error eliminando curso:", err);
      toast.error("Error al eliminar el curso");
    }
  };

  // 👁️ Toggle visibilidad (solo UI)
  const handleToggleVisibility = (id: string) =>
    setLocalCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
    );

  /* =========================================================
     🔹 Render
     ========================================================= */
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Cursos</h1>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Crear curso
        </Button>
      </div>

      {/* Estado de carga */}
      {loadingAllCursos ? (
        <div className="text-center text-gray-500 py-10">
          Cargando cursos...
        </div>
      ) : localCourses.length === 0 ? (
        <div className="text-center text-gray-500 py-10">
          No hay cursos disponibles.
        </div>
      ) : (
        <div className="space-y-6">
          {localCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onDelete={handleDelete}
              onToggleVisibility={handleToggleVisibility}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* ✅ Modal Crear Curso */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogOverlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
        <DialogContent className="!max-w-none !w-[95vw] !h-[90vh] !p-0 overflow-hidden bg-transparent shadow-none border-none">
          <VisuallyHidden>
            <DialogTitle>Crear Curso</DialogTitle>
          </VisuallyHidden>
          {isCreateModalOpen && (
            <CreateCourse
              onClose={() => setIsCreateModalOpen(false)}
              onCreated={handleCourseCreated}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ✅ Modal Editar Curso */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogOverlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
        <DialogContent className="!max-w-none !w-[95vw] !h-[90vh] !p-0 overflow-hidden bg-transparent shadow-none border-none">
          <VisuallyHidden>
            <DialogTitle>Editar Curso</DialogTitle>
          </VisuallyHidden>
          {selectedCourse && (
            <EditCourseForm
              courseId={selectedCourse.id}
              onClose={() => setIsModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
