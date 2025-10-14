'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Eye, Edit, EyeOff, Trash2, Tag, Users, Layers, BookOpen, FileText, Clock, Calendar } from 'lucide-react';
import Image from 'next/image';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState([
    {
      id: '1',
      title: 'Pitch Mastery',
      description:
        'Over the next 10 classes, you will transform the way you present your ideas. This course is designed to be practical and hands-on.',
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
      image: '/placeholder.jpg',
      visible: true,
      featured: true,
    },
  ]);

  const handleDelete = (id: string) => setCourses((prev) => prev.filter((c) => c.id !== id));
  const handleToggleVisibility = (id: string) =>
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
    );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Courses</h1>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">Crear curso</Button>
      </div>

      {/* Grid de cursos */}
      <div className="space-y-6">
        {courses.map((course) => (
          <motion.div
            key={course.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-md hover:shadow-lg transition overflow-hidden border"
          >
            <div className="flex flex-col lg:flex-row">
              {/* Imagen */}
              <div className="relative w-full lg:w-1/3 h-60 lg:h-auto">
                <Image
                  src="/images/imgej.png"
                  alt={course.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-3 left-3">
                  <Badge className="bg-emerald-100 text-emerald-800">Público</Badge>
                </div>
                <div className="absolute bottom-3 left-3 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                  🎥 Video presentación
                </div>
              </div>

              {/* Contenido */}
              <div className="flex-1 p-6 flex flex-col justify-between">
                {/* Título y descripción */}
                <div>
                  <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-bold text-gray-800">{course.title}</h2>
                    {course.featured && (
                      <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                        <Tag size={14} /> Oferta especial
                      </Badge>
                    )}
                  </div>

                  <p className="text-gray-600 mt-2">{course.description}</p>

                  {/* Categorías */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {course.category}
                    </Badge>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                      {course.level}
                    </Badge>
                    <Badge variant="outline" className="bg-pink-50 text-pink-700 flex items-center gap-1">
                      <Tag size={14} /> {course.type}
                    </Badge>
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 flex items-center gap-1">
                      <Users size={14} /> {course.students} cursantes
                    </Badge>
                  </div>

                  {/* Stats */}
                  <div className="mt-5 grid grid-cols-3 sm:grid-cols-6 gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Layers size={16} /> {course.units} Unidades
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen size={16} /> {course.lessons} Lecciones
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText size={16} /> {course.pdfs} PDFs
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={16} /> {course.duration}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={16} /> {course.created}
                    </div>
                  </div>
                </div>

                {/* Precios y acciones */}
                <div className="mt-6 flex flex-col sm:flex-row justify-between items-center border-t pt-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-gray-400 line-through text-sm">
                      ${course.oldPrice.toLocaleString()}
                    </span>
                    <span className="text-green-600 font-bold text-xl">
                      ${course.price.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
                    <Button variant="outline" className="flex items-center gap-1">
                      <Eye size={16} /> Ver detalles
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1">
                      <Edit size={16} /> Editar curso
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleToggleVisibility(course.id)}
                      className="flex items-center gap-1 bg-gray-700 text-white hover:bg-gray-800"
                    >
                      {course.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                      {course.visible ? 'Ocultar' : 'Mostrar'}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(course.id)}
                      className="flex items-center gap-1"
                    >
                      <Trash2 size={16} /> Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
