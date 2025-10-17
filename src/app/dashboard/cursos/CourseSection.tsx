// "use client";

// import { useEffect, useState } from "react";
// import { collection, onSnapshot } from "firebase/firestore";
// import { db } from "@/lib/firebase";
// import CourseCard from "@/components/CourseCard";
// import { Course } from "@/types/course";
// import { toast } from "sonner";
// import { Button } from "@/components/ui/button";
// import { Plus } from "lucide-react";

// export default function CourseSection() {
//   console.log("🎯 CourseSection montado");
//   const [courses, setCourses] = useState<Course[]>([]);
//   const [loading, setLoading] = useState(true);

//   // 🔥 Cargar cursos en tiempo real desde Firestore
//   useEffect(() => {
    
//   const unsubscribe = onSnapshot(collection(db, "cursos"), (snapshot) => {
//      console.log("🔥 onSnapshot triggered, docs:", snapshot.docs.length);
//     const data = snapshot.docs.map((doc) => {
//       const c = doc.data();
//       console.log("📦 DOC DATA:", doc.id, c); // 👈 AQUI el log

  
//   // Adaptar datos de Firestore al modelo de CourseCard
//   return {
//     id: doc.id,
//     title: c.titulo || "Sin título",
//     description: c.descripcion || "",
//     category: c.categoria || "Sin categoría",
//     level: c.nivel || "N/A",
//     image: c.urlImagen || "/images/default-course.jpg",
//     type: c.capstone ? "Project" : "Course",
//     students: Array.isArray(c.cursantes) ? c.cursantes.length : 0,
//     units: Array.isArray(c.unidades) ? c.unidades.length : 0,
//     lessons: Array.isArray(c.unidades)
//       ? c.unidades.reduce(
//           (acc: number, u: any) => acc + (u.lecciones?.length || 0),
//           0
//         )
//       : 0,
//     pdfs: Array.isArray(c.unidades)
//       ? c.unidades.reduce(
//           (acc: number, u: any) =>
//             acc +
//             (u.lecciones?.filter((l: any) => l.pdfUrl)?.length || 0),
//           0
//         )
//       : 0,
//     duration: Array.isArray(c.unidades)
//       ? `${c.unidades.reduce(
//           (acc: number, u: any) => acc + (u.duracion || 0),
//           0
//         )} min`
//       : "—",
//     created: c.creadoEn
//       ? new Date(c.creadoEn.seconds * 1000).toLocaleDateString()
//       : "N/A",
//     price: Number(c.precio?.monto || 0),
//     oldPrice: Number(
//       c.precio?.descuentoActivo && c.precio?.montoDescuento
//         ? c.precio.monto
//         : c.precio?.monto || 0
//     ),
//     featured: !!c.precio?.descuentoActivo,
//     visible: c.publico ?? true,

//     // 👇 ESTE ERA EL CAMPO FALTANTE
//     videoPresentacion: c.videoPresentacion || "",
//   };
// });

//       });

//       setCourses(data);
//       setLoading(false);
//     });

//     return () => unsubscribe();
//   }, []);

//   // Handlers (opcionales)
//   const handleDelete = (id: string) => {
//     toast.info(`Eliminar curso ${id} (por implementar)`);
//   };

//   const handleToggleVisibility = (id: string) => {
//     toast.info(`Cambiar visibilidad del curso ${id} (por implementar)`);
//   };

//   const handleEdit = (course: Course) => {
//     toast.info(`Editar curso: ${course.title}`);
//   };

//   // Estados de carga y vacío
//   if (loading) {
//     return (
//       <div className="flex justify-center items-center h-40 text-gray-500">
//         Cargando cursos...
//       </div>
//     );
//   }

//   if (!courses.length) {
//     return (
//       <div className="text-center text-gray-500 py-10">
//         No hay cursos disponibles todavía.
//       </div>
//     );
//   }

//   // Renderizado final
//   return (
//     <div className="p-6">
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-2xl font-bold text-gray-800">📚 Cursos disponibles</h1>

//         <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
//           <Plus size={16} /> Crear nuevo curso
//         </Button>
//       </div>

//       <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
//         {courses.map((course) => (
//           <CourseCard
//             key={course.id}
//             course={course}
//             onDelete={handleDelete}
//             onToggleVisibility={handleToggleVisibility}
//             onEdit={handleEdit}
//           />
//         ))}
//       </div>
//     </div>
//   );
// }
