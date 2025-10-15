// 'use client';

// import { useState } from 'react';
// import CourseCard from './CourseCard';
// import EditCourseForm from './edit/EditCourseForm';
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// export default function AdminCoursesPage() {
//   const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
//   const [isEditing, setIsEditing] = useState(false);

//   // 🔹 Ejemplo de cursos (luego reemplazas con tu fetch real)
//   const courses = [
//     {
//       id: '1',
//       title: 'Pitch Mastery',
//       description: 'Learn to pitch your ideas effectively.',
//       level: 'Intermediate',
//       category: 'Pitch',
//       type: 'Online',
//       students: 120,
//       units: 8,
//       lessons: 20,
//       exercises: 10,
//       pdfs: 5,
//       duration: '5h 30m',
//       created: '2025-01-15',
//       price: 60000,
//       oldPrice: 100000,
//       image: 'pitch.png',
//       visible: true,
//       featured: true,
//     },
//   ];

//   // ✅ Handlers
//   const handleEdit = (course: any) => {
//     setSelectedCourse(course);
//     setIsEditing(true);
//   };

//   const handleClose = () => {
//     setSelectedCourse(null);
//     setIsEditing(false);
//   };

//   const handleDelete = (id: string) => {
//     console.log('Eliminar curso', id);
//   };

//   const handleToggleVisibility = (id: string) => {
//     console.log('Togglear visibilidad', id);
//   };

//   return (
//     <div className="p-8 space-y-6">
//       <h1 className="text-3xl font-bold text-gray-800">Cursos</h1>

//       <div className="grid gap-6">
//         {courses.map((course) => (
//           <CourseCard
//             key={course.id}
//             course={course}
//             onDelete={handleDelete}
//             onToggleVisibility={handleToggleVisibility}
//             onEdit={handleEdit} // ✅ ESTA ES LA CLAVE
//           />
//         ))}
//       </div>

//       {/* ✅ Modal de edición */}
//       <Dialog open={isEditing} onOpenChange={handleClose}>
//         <DialogContent className="max-w-3xl">
//           <DialogHeader>
//             <DialogTitle>Editar curso</DialogTitle>
//           </DialogHeader>
//           {selectedCourse && <EditCourseForm course={selectedCourse} />}
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }
