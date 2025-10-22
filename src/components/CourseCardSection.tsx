// "use client";

// import { useEffect, useState } from "react";
// import { collection, getDocs, onSnapshot } from "firebase/firestore";
// import { db } from "@/lib/firebase";
// import CourseCard from "@/components/CourseCard";
// import { Course } from "@/types/course";
// import { toast } from "sonner";

// export default function CourseCardSection() {
//   const [courses, setCourses] = useState<Course[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     // 🔥 Escucha en tiempo real los cursos (realtime)
//     const unsubscribe = onSnapshot(collection(db, "cursos"), (snapshot) => {
//       const fetchedCourses = snapshot.docs.map((doc) => {
//         const c = doc.data();

//         // Adaptar campos a la interfaz CourseCard
//         return {
//           id: doc.id,
//           title: c.titulo || "Sin título",
//           description: c.descripcion || "",
//           category: c.categoria || "Sin categoría",
//           level: c.nivel || "N/A",
//           image: c.urlImagen || "/images/default-course.jpg",
//           type: c.capstone ? "Project" : "Course",
//           students: Array.isArray(c.cursantes) ? c.cursantes.length : 0,
//           units: Array.isArray(c.unidades) ? c.unidades.length : 0,
//           lessons: Array.isArray(c.unidades)
//             ? c.unidades.reduce(
//                 (acc: number, u: any) => acc + (u.lecciones?.length || 0),
//                 0
//               )
//             : 0,
//           pdfs: Array.isArray(c.unidades)
//             ? c.unidades.reduce(
//                 (acc: number, u: any) =>
//                   acc +
//                   (u.lecciones?.filter((l: any) => l.pdfUrl)?.length || 0),
//                 0
//               )
//             : 0,
//           duration: Array.isArray(c.unidades)
//             ? `${c.unidades.reduce(
//                 (acc: number, u: any) => acc + (u.duracion || 0),
//                 0
//               )} min`
//             : "—",
//           created: c.creadoEn
//             ? new Date(c.creadoEn.seconds * 1000).toLocaleDateString()
//             : "N/A",
//           price: Number(c.precio?.monto || 0),
//           oldPrice: Number(
//             c.precio?.descuentoActivo && c.precio?.montoDescuento
//               ? c.precio.monto
//               : c.precio?.monto || 0
//           ),
//           featured: !!c.precio?.descuentoActivo,
//           visible: c.publico ?? true,
//         };
//       });

//       setCourses(fetchedCourses);
//       setLoading(false);
//     });

//     return () => unsubscribe();
//   }, []);

//   const handleDelete = (id: string) => {
//     toast.info(`Eliminar curso ${id} (por implementar)`);
//   };

//   const handleToggleVisibility = (id: string) => {
//     toast.info(`Togglear visibilidad de ${id} (por implementar)`);
//   };

//   const handleEdit = (course: Course) => {
//     toast.info(`Editar curso: ${course.title}`);
//   };

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

//   return (
//     <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
//       {courses.map((course) => (
//         <CourseCard
//           key={course.id}
//           course={course}
//           onDelete={handleDelete}
//           onToggleVisibility={handleToggleVisibility}
//           onEdit={handleEdit}
//         />
//       ))}
//     </div>
//   );
// }
