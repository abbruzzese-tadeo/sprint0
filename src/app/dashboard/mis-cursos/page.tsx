// "use client";

// import { useAuth } from "@/contexts/AuthContext";
// import CursoCardAlumno from "./CursoCardAlumno";

// export default function MisCursosPage() {
//   const { user, cursosAlumno, loading } = useAuth();

//   if (loading) {
//     return <div className="p-8 text-slate-400 text-center">Cargando tus cursos...</div>;
//   }

//   return (
//     <div className="p-8">
//       <div className="flex items-center justify-between mb-6">
//         <h1 className="text-3xl font-bold text-gray-800">🎓 Mis cursos</h1>
//         <span className="text-sm text-gray-500">{user?.email || ""}</span>
//       </div>

//       {!cursosAlumno || cursosAlumno.length === 0 ? (
//         <p className="text-slate-500">Aún no estás inscripto en ningún curso.</p>
//       ) : (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
//           {cursosAlumno.map((curso: any) =>
//             curso ? <CursoCardAlumno key={curso.id} curso={curso} /> : null
//           )}
//         </div>
//       )}
//     </div>
//   );
// }
