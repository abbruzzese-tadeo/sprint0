'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogOverlay
} from '@/components/ui/dialog';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

import CourseCard from '../../../components/cursos/CourseCard';
import CreateCourse from '../../../components/cursos/crear/CreateCourse';
import EditCourseForm from '../../../components/cursos/edit/EditCourseForm'
import { doc, deleteDoc } from "firebase/firestore";



export default function AdminCoursesPage() {
  console.log("AdminCoursesPage montado correctamente");

  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
  const unsubscribe = onSnapshot(collection(db, "cursos"), (snapshot) => {
    const data = snapshot.docs.map((doc) => {
      const c = doc.data();

      return {
        id: doc.id,
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
      };
    });

    setCourses(data);
    setLoading(false);
  });

  return () => unsubscribe();
}, []);

  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);


 const handleEdit = (course: any) => {
  const mappedCourse = {
    id: course.id,
    titulo: course.title,
    descripcion: course.description,
    nivel: course.level,
    categoria: course.category,
    publico: course.visible,
    urlImagen: course.image,
    precio: { monto: course.price, montoDescuento: course.oldPrice },
    unidades: course.unidades || [],
    cursantes: course.students || [],
    capstone: course.type === "Proyecto Capstone",
    creadoEn: course.created,
  };

  console.log("🧩 Curso seleccionado para editar:", mappedCourse);
  setSelectedCourse(mappedCourse);
  setIsModalOpen(true);
};

 const handleSave = () => {
  toast.success("Cambios guardados correctamente");
  setIsModalOpen(false);
};


 const handleDelete = async (id: string) => {
  try {
    const confirmDelete = confirm("¿Estás seguro de que quieres eliminar este curso?");
    if (!confirmDelete) return;

    // 🔥 Eliminar de Firestore
    await deleteDoc(doc(db, "cursos", id));

    // 🧹 Remover del estado local para reflejar el cambio
    setCourses((prev) => prev.filter((c) => c.id !== id));

    toast.success("Curso eliminado correctamente");
  } catch (error) {
    console.error("❌ Error eliminando curso:", error);
    toast.error("Error al eliminar el curso");
  }
};


  const handleToggleVisibility = (id: string) =>
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
    );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Cursos</h1>
          <Button
            onClick={() => {
            console.log("CLICK en crear curso");
            setIsCreateModalOpen(true);
          }}
        className="bg-blue-600 hover:bg-blue-700 text-white"
>
  Crear curso
</Button>

      </div>

      {/* ✅ Modal para crear curso */}
<Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
  <DialogOverlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
  <DialogContent
    className="!max-w-none !w-[95vw] !h-[90vh] !p-0 overflow-hidden bg-transparent shadow-none border-none"
  >
    <VisuallyHidden>
      <DialogTitle>Crear Curso</DialogTitle>
    </VisuallyHidden>

   {isCreateModalOpen && (
  <CreateCourse
    onClose={() => setIsCreateModalOpen(false)}
    onCreated={(newCourse) => {
      setCourses((prev) => [...prev, newCourse]);
      setIsCreateModalOpen(false);
    }}
  />
)}
  </DialogContent>
</Dialog>

      {loading ? (
  <div className="text-center text-gray-500 py-10">Cargando cursos...</div>
) : courses.length === 0 ? (
  <div className="text-center text-gray-500 py-10">No hay cursos disponibles.</div>
) : (
  <div className="space-y-6">
    {courses.map((course) => (
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

      {/* ✅ Modal con el formulario */}
     <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
  {/* Overlay controlado por Radix */}
  <DialogOverlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

  {/* Contenido del modal */}
  <DialogContent
    className="!max-w-none !w-[95vw] !h-[90vh] !p-0 overflow-hidden bg-transparent shadow-none border-none"
  >
    {/* Título oculto para accesibilidad */}
    <VisuallyHidden>
      <DialogTitle>Editar Curso</DialogTitle>
    </VisuallyHidden>

    
      {selectedCourse && (
  <EditCourseForm
    courseId={selectedCourse.id} // 👈 solo le pasás el ID
    onClose={() => setIsModalOpen(false)}
  />
)}

    
  </DialogContent>
</Dialog>
    </div>
  );
}
