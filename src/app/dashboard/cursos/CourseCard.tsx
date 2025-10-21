'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Course } from '@/types/course';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Eye, Edit, EyeOff, Trash2, Tag, Users, Layers, BookOpen, FileText, Clock, Calendar } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from "next/navigation";



interface Props {
  course: Course;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onEdit: (course: Course) => void;
}

function getSafeImageUrl(url: string | undefined): string {
  if (!url) return "/images/default-course.jpg"; // 👈 tu imagen local por defecto
  try {
    const u = new URL(url);
    const allowedHosts = [
      "firebasestorage.googleapis.com",
      "images.unsplash.com",
      "www.pexels.com",
      "cdn.pixabay.com",
      "lh3.googleusercontent.com",
      "i.imgur.com",
    ];
    const isAllowed = allowedHosts.includes(u.hostname);
    const looksLikeImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(u.pathname);
    if (isAllowed && looksLikeImage) return url;
    return "/images/default-course.jpg"; // fallback si no es válida
  } catch {
    return "/images/default-course.jpg";
  }
}


export default function CourseCard({ course, onDelete, onToggleVisibility, onEdit }: Props) {
  const router = useRouter();
    console.log("🎬 VIDEO:", course.videoPresentacion || (course as any).videoPresentacion);

  return (
    
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition overflow-hidden border"
    >
      <div className="flex flex-col lg:flex-row">
        {/* Imagen o Video (funcional con embed directo y animado) */}
{/* Imagen o Video (funcional y visible siempre) */}
<div className="relative w-full lg:w-1/3 bg-gray-100 overflow-hidden rounded-l-xl">

  {course.videoPresentacion || (course as any).videoPresentacion ? (
    
    <motion.div
      key="video"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative w-full h-60 lg:h-full bg-black"
    >
      <iframe
        src={course.videoPresentacion || (course as any).videoPresentacion}
        title="Video de presentación"
        className="w-full h-full border-0"
        style={{ aspectRatio: "16/9" }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
      <div className="absolute bottom-3 left-3 bg-black/60 text-white text-sm px-3 py-1 rounded-full flex items-center gap-2 backdrop-blur-sm">
        🎥 Video presentación
      </div>
    </motion.div>
  ) : (
    <motion.div
      key="image"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative w-full h-60 lg:h-full"
    >
      <Image
        src={getSafeImageUrl(course.image || (course as any).urlImagen)}
        alt={course.title || (course as any).titulo || "Course thumbnail"}
        fill
        className="object-cover"
        sizes="(max-width: 1024px) 100vw, 33vw"
      />
    </motion.div>
  )}

  {/* Badge “Público” */}
  <div className="absolute top-3 left-3">
    <Badge className="bg-emerald-100 text-emerald-800">Público</Badge>
  </div>
</div>





        {/* Contenido */}
        <div className="flex-1 p-6 flex flex-col justify-between">
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
              <Badge variant="outline" className="bg-blue-50 text-blue-700">{course.category}</Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700">{course.level}</Badge>
              <Badge variant="outline" className="bg-pink-50 text-pink-700 flex items-center gap-1">
                <Tag size={14} /> {course.type}
              </Badge>
              <Badge variant="outline" className="bg-gray-50 text-gray-700 flex items-center gap-1">
                <Users size={14} /> {course.students} cursantes
              </Badge>
            </div>

            {/* Stats */}
            <div className="mt-5 grid grid-cols-3 sm:grid-cols-6 gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-1"><Layers size={16} /> {course.units} Unidades</div>
              <div className="flex items-center gap-1"><BookOpen size={16} /> {course.lessons} Lecciones</div>
              <div className="flex items-center gap-1"><FileText size={16} /> {course.pdfs} PDFs</div>
              <div className="flex items-center gap-1"><Clock size={16} /> {course.duration}</div>
              <div className="flex items-center gap-1"><Calendar size={16} /> {course.created}</div>
            </div>
          </div>

          {/* Precios y acciones */}
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center border-t pt-4">
            <div className="flex items-baseline gap-2">
              {/* <span className="text-gray-400 line-through text-sm">${course.oldPrice.toLocaleString()}</span> */}
              {/* <span className="text-green-600 font-bold text-xl">${course.price.toLocaleString()}</span> */}
            </div>

            <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
              <Button
                variant="outline"
                className="flex items-center gap-1"
                onClick={() => router.push(`/material-academico/${course.id}`)}
              >
                <Eye size={16} /> Ver detalles
              </Button>

              <Button
                onClick={() => onEdit(course)}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
              >
                <Edit size={16} /> Editar curso
              </Button>

              <Button
                variant="secondary"
                onClick={() => onToggleVisibility(course.id)}
                className="flex items-center gap-1 bg-gray-700 text-white hover:bg-gray-800"
              >
                {course.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                {course.visible ? 'Ocultar' : 'Mostrar'}
              </Button>

              <Button
                variant="destructive"
                onClick={() => onDelete(course.id)}
                className="flex items-center gap-1"
              >
                <Trash2 size={16} /> Eliminar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
