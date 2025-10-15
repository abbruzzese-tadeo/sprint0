'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import CourseCard from './cursos/CourseCard';
import EditCourseForm from './cursos/edit/EditCourseForm';
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogOverlay
} from '@/components/ui/dialog';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState([
    {
      id: '1',
      title: 'Pitch Mastery',
      description: 'Over the next 10 classes, you will transform the way you present your ideas.',
      level: 'Intermedio',
      category: 'Pitch',
      type: 'Proyecto Capstone',
      students: 5,
      units: 9,
      lessons: 28,
      exercises: 87,
      pdfs: 14,
      duration: '4h 7min',
      created: '12 ago 2025',
      price: 60000,
      oldPrice: 100000,
      image: 'imgej.png',
      visible: true,
      featured: true,
    },
  ]);

  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEdit = (course: any) => {
    setSelectedCourse(course);
    setIsModalOpen(true);
  };

  const handleSave = (updatedCourse: any) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === updatedCourse.id ? updatedCourse : c))
    );
  };

  const handleDelete = (id: string) =>
    setCourses((prev) => prev.filter((c) => c.id !== id));

  const handleToggleVisibility = (id: string) =>
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
    );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Cursos</h1>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">Crear curso</Button>
      </div>

      <div className="space-y-6">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            onDelete={handleDelete}
            onToggleVisibility={handleToggleVisibility}
            onEdit={handleEdit} // ✅ Pasa la función correcta
          />
        ))}
      </div>

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
          course={selectedCourse}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    
  </DialogContent>
</Dialog>
    </div>
  );
}
