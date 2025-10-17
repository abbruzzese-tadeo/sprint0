"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { toast } from "sonner";
import { FiPlay, FiCheckCircle, FiChevronLeft  } from "react-icons/fi";
import { useContext } from "react";
import ContextGeneral from "@/contexts/contextGeneral";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";




interface Lesson {
  id: string;
  titulo: string;
  texto?: string;
  urlVideo?: string;
  pdfUrl?: string;
  ejercicios?: any[];
}

interface Unit {
  id: string;
  titulo: string;
  lecciones: Lesson[];
}

interface Curso {
  id: string;
  titulo: string;
  descripcion?: string;
  unidades?: Unit[];
}
// 🔹 Convierte URLs de PDF (Drive o externos) a un formato embebible seguro
function toEmbedPdfUrl(raw?: string): string {
  const href = String(raw || "").trim();
  if (!href) return "";

  try {
    const u = new URL(href);
    const host = u.hostname;

    // Archivos de Google Drive
    if (host.includes("drive.google.com")) {
      const m = href.match(/\/file\/d\/([^/]+)\/(view|preview)/);
      if (m?.[1]) return `https://drive.google.com/file/d/${m[1]}/preview`;
      const gid = u.searchParams.get("id");
      if (gid) return `https://drive.google.com/file/d/${gid}/preview`;
      return href;
    }

    // PDFs directos (usa Google Docs Viewer)
    if (/\.(pdf)(\?|#|$)/i.test(href)) {
      return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(href)}`;
    }

    return href;
  } catch {
    return href;
  }
}

export default function CoursePlayerPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.id?.toString?.() || "";
  const { firestore, storage, cursos } = useContext(ContextGeneral);
  const { user, role, authReady, loading: authLoading } = useAuth();


  const [curso, setCurso] = useState<Curso | null>(null);
  const [loading, setLoading] = useState(true);
  const [unidadIndex, setUnidadIndex] = useState(0);
  const [leccionIndex, setLeccionIndex] = useState(0);
  const [resolvedVideo, setResolvedVideo] = useState<string | null>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [exSubmitted, setExSubmitted] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);


  const unidad = curso?.unidades?.[unidadIndex];
  const leccion = unidad?.lecciones?.[leccionIndex];


  // 🔹 Estado y helpers de progreso (Firestore)
interface LessonProgress {
  videoEnded?: boolean;
  exSubmitted?: boolean;
  updatedAt?: number;
}

const [progress, setProgress] = useState<Record<string, LessonProgress>>({});

// Cargar progreso inicial desde alumnos/{email}.progress[courseId]
useEffect(() => {
  async function loadProgress() {
    if (!firestore || !user?.email || !courseId) return;
    try {
      if (!user?.email) {
  console.warn("No hay email de usuario; abortando operación de Firestore.");
  return;
}
const userRef = doc(firestore, "alumnos", user.email);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        const courseProgress = data?.progress?.[courseId]?.progress?.byLesson || {};
        setProgress(courseProgress);
      }
    } catch (err) {
      console.error("Error al cargar progreso:", err);
    }
  }
  loadProgress();
}, [firestore, user?.email, courseId]);

// Guardar progreso en Firestore
const saveProgress = useCallback(async (lessonId: string, data: LessonProgress) => {
  if (!firestore || !user?.email || !courseId) return;
  try {
    const userRef = doc(firestore, "alumnos", user.email);
    const updated = {
      ...progress,
      [lessonId]: { ...(progress[lessonId] || {}), ...data, updatedAt: Date.now() },
    };

    const payload = {
      courseId,
      progress: {
        byLesson: updated,
        lastActive: {
          unitId: unidad?.id,
          lessonId: leccion?.id,
        },
      },
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, { progress: { [courseId]: payload } }, { merge: true });
    setProgress(updated);
    console.log("Progreso guardado", updated);
  } catch (err) {
    console.error("Error al guardar progreso:", err);
  }
}, [firestore, user?.email, courseId, progress, unidad?.id, leccion?.id]);

// 🔹 Restaurar la última lección vista (al cargar el progreso)
useEffect(() => {
  if (!curso || Object.keys(progress).length === 0) return;
  async function restoreLastLesson() {
    try {
      const userRef = doc(firestore, "alumnos", user?.email || "");
      const snap = await getDoc(userRef);
      const lastActive = snap.data()?.progress?.[courseId]?.progress?.lastActive;
      if (!lastActive?.unitId || !lastActive?.lessonId) return;

      const unitIdx = curso.unidades?.findIndex((u) => u.id === lastActive.unitId) ?? 0;
      const lessonIdx =
        curso.unidades?.[unitIdx]?.lecciones?.findIndex((l) => l.id === lastActive.lessonId) ?? 0;

      if (unitIdx >= 0 && lessonIdx >= 0) {
        setUnidadIndex(unitIdx);
        setLeccionIndex(lessonIdx);
        console.log(`Restaurando posición: unidad ${unitIdx}, lección ${lessonIdx}`);
      }
    } catch (err) {
      console.error("Error restaurando última lección:", err);
    }
  }
  restoreLastLesson();
}, [curso, progress, firestore, user?.email, courseId]);


// 🔹 Calcular porcentaje de progreso global
const totalLessons = useMemo(() => {
  return curso?.unidades?.reduce((acc, u) => acc + (u.lecciones?.length || 0), 0) || 0;
}, [curso]);

const completedLessons = useMemo(() => {
  return Object.values(progress).filter(
    (p) => p?.videoEnded || p?.exSubmitted
  ).length;
}, [progress]);

const progressPercent = useMemo(() => {
  if (!totalLessons) return 0;
  return Math.round((completedLessons / totalLessons) * 100);
}, [completedLessons, totalLessons]);




  // 🔹 Carga el curso desde el contexto (o desde Firestore si no está)
  useEffect(() => {
    async function fetchCourse() {
      if (!firestore || !courseId) return;
      try {
        const docRef = doc(firestore, "cursos", courseId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setCurso({ id: snap.id, ...snap.data() } as Curso);
        } else {
          toast.error("Curso no encontrado");
        }
      } catch (e) {
        console.error(e);
        toast.error("Error cargando el curso");
      } finally {
        setLoading(false);
      }
    }

    // si ya lo tenés en contexto:
    const found = cursos?.find((c: any) => c.id === courseId);
    if (found) {
      setCurso(found);
      setLoading(false);
    } else {
      fetchCourse();
    }
  }, [firestore, cursos, courseId]);

  // 🔹 Resolver URL de video (si es gs:// en Firebase)
  useEffect(() => {
    if (!storage || !leccion?.urlVideo) return;
    const url = leccion.urlVideo;
    if (url.startsWith("http")) {
      setResolvedVideo(url);
      return;
    }
    const getURL = async () => {
      try {
        const httpsURL = await getDownloadURL(ref(storage, url));
        setResolvedVideo(httpsURL);
      } catch {
        toast.error("No se pudo cargar el video");
      }
    };
    getURL();
  }, [storage, leccion?.urlVideo]);

// 🔹 Guarda automáticamente cuando el video termina
useEffect(() => {
  if (!resolvedVideo) return;
  const videoEl = document.querySelector("video");
  if (!videoEl) return;

  const handleEnded = () => {
    if (!leccion?.id) return;
    setVideoEnded(true);
    saveProgress(leccion.id, { videoEnded: true });
    toast.success("Video completado 🎬 Progreso guardado");
  };

  videoEl.addEventListener("ended", handleEnded);
  return () => videoEl.removeEventListener("ended", handleEnded);
}, [resolvedVideo, leccion?.id, saveProgress]);


 // 🚫 Si no hay usuario o no tiene email, no seguimos
if (!user?.email) {
  return (
    <div className="min-h-[60vh] grid place-items-center text-slate-400">
      No hay usuario autenticado o no se pudo cargar el perfil.
    </div>
  );
}

if (loading) {
  return (
    <div className="min-h-[60vh] grid place-items-center text-slate-300">
      Cargando curso...
    </div>
  );
}

  return (
  <div className="min-h-screen bg-[#0B1220] text-slate-200 flex">
    {/* 🔹 Sidebar izquierda: navegación */}
    <aside className="w-72 shrink-0 border-r border-slate-800 bg-[#0F172A] overflow-y-auto">
      {/* Botón volver al inicio */}
<div className="p-3 border-b border-slate-800 flex items-center justify-between">
  <button
    onClick={() => router.push("/dashboard")}
    className="flex items-center gap-2 text-sm text-slate-300 hover:text-yellow-400 transition"
  >
    <FiChevronLeft className="text-yellow-400" size={18} />
    Volver al inicio
  </button>
</div>

      <div className="p-4 border-b border-slate-800">
        <h1 className="text-lg font-bold text-white line-clamp-1">{curso.titulo}</h1>
        <p className="text-xs text-slate-400 line-clamp-2">{curso.descripcion}</p>
      </div>

      {/* Unidades */}
      <nav className="p-3 space-y-2">
        {curso.unidades?.map((unidadItem, uIdx) => (
          <div key={unidadItem.id} className="border border-slate-800 rounded-lg">
            {/* Header de unidad */}
            <button
              onClick={() => setUnidadIndex(uIdx)}
              className={`w-full text-left px-3 py-2 font-semibold rounded-t-lg ${
                unidadIndex === uIdx
                  ? "bg-yellow-400/20 text-yellow-300"
                  : "hover:bg-slate-800 text-slate-300"
              }`}
            >
              {unidadItem.titulo}
            </button>

            {/* Lecciones de la unidad */}
            <div className="space-y-1 p-2 border-t border-slate-800">
              {unidadItem.lecciones.map((leccionItem, lIdx) => {
                const prog = progress[leccionItem.id];
                const done = !!prog?.exSubmitted || !!prog?.videoEnded;
                const isActive =
                  unidadIndex === uIdx && leccionIndex === lIdx;
                return (
                  <button
                    key={leccionItem.id}
                    onClick={() => {
                      setUnidadIndex(uIdx);
                      setLeccionIndex(lIdx);
                      setVideoEnded(!!prog?.videoEnded);
                      setExSubmitted(!!prog?.exSubmitted);
                    }}
                    className={`block w-full text-left px-3 py-1.5 rounded-md text-sm transition ${
                      isActive
                        ? "bg-yellow-400/10 text-yellow-300 border border-yellow-400/30"
                        : done
                        ? "text-emerald-400 hover:bg-slate-800"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{leccionItem.titulo}</span>
                      {done && <FiCheckCircle size={12} className="text-emerald-400 shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto p-4 text-xs text-slate-500 border-t border-slate-800">
        © {new Date().getFullYear()} Further Academy
      </div>
    </aside>

    {/* 🔹 Contenido principal */}
    <main className="flex-1 p-6 overflow-y-auto">
      {/* 🔹 Barra de progreso global */}
<div className="mb-6">
  <div className="flex items-center justify-between mb-1">
    <span className="text-sm text-slate-400">Progreso del curso</span>
    <span className="text-sm font-semibold text-yellow-400">{progressPercent}%</span>
  </div>
  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
    <div
      className="h-full bg-yellow-400 transition-all duration-500 rounded-full"
      style={{ width: `${progressPercent}%` }}
    />
  </div>
  <div className="mt-1 text-xs text-slate-500">
    {completedLessons} de {totalLessons} lecciones completadas
  </div>
</div>
      <h2 className="text-xl font-bold text-white mb-2">{unidad?.titulo}</h2>
      <h3 className="text-base text-yellow-400 mb-4">{leccion?.titulo}</h3>

      {/* VIDEO */}
      {leccion ?.urlVideo && (
  <>
    {leccion .urlVideo.includes("youtube.com") ||
    leccion .urlVideo.includes("youtu.be") ? (
      <iframe
        src={leccion .urlVideo}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full aspect-video rounded-lg"
      />
    ) : leccion .urlVideo.includes("vimeo.com") ? (
      <iframe
        src={leccion .urlVideo}
        title="Vimeo player"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="w-full aspect-video rounded-lg"
      />
    ) : (
      <video
        controls
        className="w-full aspect-video rounded-lg bg-black"
        src={leccion .urlVideo}
      />
    )}
  </>
)}

      {/* TEXTO */}
      {leccion?.texto && (
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded mb-4">
          <p className="whitespace-pre-line">{leccion.texto}</p>
        </div>
      )}

      {/* BOTONES DE CONTROL */}
<div className="flex gap-3 mt-4 flex-wrap">
  <button
    onClick={() => {
      if (!leccion?.id) return;
      setExSubmitted(true);

      // 🔹 actualiza localmente para refrescar el progreso sin esperar a Firestore
      setProgress((prev) => ({
        ...prev,
        [leccion.id]: {
          ...(prev[leccion.id] || {}),
          exSubmitted: true,
          videoEnded,
          updatedAt: Date.now(),
        },
      }));

      saveProgress(leccion.id, { exSubmitted: true, videoEnded });
      toast.success("Progreso guardado correctamente");
    }}
    disabled={exSubmitted}
    className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded hover:bg-yellow-300 disabled:opacity-50"
  >
    {exSubmitted ? "Completada ✅" : "Marcar como completa"}
  </button>

  <button
    onClick={() => {
      if (leccionIndex < (unidad?.lecciones?.length ?? 0) - 1) {
        setLeccionIndex(leccionIndex + 1);
        setExSubmitted(false);
        setVideoEnded(false);
      } else if (unidad?.closing) {
        // 🔹 Si la unidad tiene examen final, mostrarlo
        toast.info("Pasando al examen final de la unidad 🎓");
        setLeccionIndex(-1); // valor especial para mostrar closing
      } else if (unidadIndex < (curso.unidades?.length ?? 0) - 1) {
        setUnidadIndex(unidadIndex + 1);
        setLeccionIndex(0);
        setExSubmitted(false);
        setVideoEnded(false);
      } else {
        toast.success("🎉 Curso completado");
      }
    }}
    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 flex items-center gap-2"
  >
    <FiCheckCircle size={16} />
    Siguiente
  </button>
</div>

{/* 🔹 Renderiza examen de cierre si corresponde */}
{leccionIndex === -1 && unidad?.closing && (
  <div className="mt-6 bg-slate-900/60 border border-slate-800 p-6 rounded-xl">
    <h3 className="text-lg font-bold text-yellow-400 mb-3">
      Examen final de la unidad
    </h3>
    {unidad.closing.videoUrl && (
      <iframe
        src={unidad.closing.videoUrl}
        title="Examen final"
        allow="autoplay; fullscreen"
        allowFullScreen
        className="w-full aspect-video rounded-lg mb-4"
      />
    )}
    {unidad.closing.texto && (
      <p className="text-slate-300 whitespace-pre-line mb-4">
        {unidad.closing.texto}
      </p>
    )}

    <button
      onClick={() => {
        setProgress((prev) => ({
          ...prev,
          [`closing-${unidad.id}`]: { exSubmitted: true, videoEnded: true },
        }));
        saveProgress(`closing-${unidad.id}`, { exSubmitted: true, videoEnded: true });
        toast.success("Examen de la unidad completado 🎉");

        // Pasar a la siguiente unidad o finalizar curso
        if (unidadIndex < (curso.unidades?.length ?? 0) - 1) {
          setUnidadIndex(unidadIndex + 1);
          setLeccionIndex(0);
        } else {
          toast.success("🎓 Curso completado por completo");
        }
      }}
      className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded hover:bg-yellow-300"
    >
      Marcar examen como completado
    </button>
  </div>
)}

    </main>
    {/* PDF fullscreen modal */}
{pdfModalOpen && (
  <div
    className="fixed inset-0 z-50 bg-black/80 flex flex-col"
    onClick={() => setPdfModalOpen(false)}
  >
    <div
      className="h-12 px-4 flex items-center justify-between bg-[#0F172A] border-b border-slate-800"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="text-sm font-medium text-slate-200">Visualizando PDF</span>
      <button
        onClick={() => setPdfModalOpen(false)}
        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
      >
        Cerrar (Esc)
      </button>
    </div>
    <div
      className="flex-1 bg-slate-900"
      onClick={(e) => e.stopPropagation()}
    >
      <iframe
        src={toEmbedPdfUrl(leccion?.pdfUrl)}
        title="PDF Viewer"
        className="w-full h-full"
      />
    </div>
  </div>
)}

  </div>
  
);

}
