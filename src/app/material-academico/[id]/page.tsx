"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useContext,
} from "react";
import { FiMenu } from "react-icons/fi";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { toast } from "sonner";
import {
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiPlay,
  FiAlertTriangle,
  FiClock,
  FiMaximize,
  FiBookOpen,
} from "react-icons/fi";
import { useAuth } from "@/contexts/AuthContext";
import { db as firestore, storage } from "@/lib/firebase";




/* =========================================================
   📘 Tipos base (reutilizamos los tuyos, resumidos)
   ========================================================= */
interface Exercise {
  id: string;
  type: string;
  [key: string]: any;
}

interface Lesson {
  id: string;
  titulo: string;
  texto?: string;
  urlVideo?: string;
  pdfUrl?: string;
  ejercicios?: Exercise[];
}

interface Unit {
  id: string;
  titulo: string;
  descripcion?: string;
  lecciones?: Lesson[];
}

interface Curso {
  id: string;
  titulo: string;
  descripcion?: string;
  unidades?: Unit[];
  cursantes?: string[];
}

/* =========================================================
   🧮 Helpers
   ========================================================= */
function toEmbedPdfUrl(raw?: string): string {
  const href = String(raw || "").trim();
  if (!href) return "";

  try {
    const u = new URL(href);
    const host = u.hostname;
    if (host.includes("drive.google.com")) {
      const m = href.match(/\/file\/d\/([^/]+)\/(view|preview)/);
      if (m?.[1]) return `https://drive.google.com/file/d/${m[1]}/preview`;
      const gid = u.searchParams.get("id");
      if (gid) return `https://drive.google.com/file/d/${gid}/preview`;
      return href;
    }
    if (/\.(pdf)(\?|#|$)/i.test(href)) {
      return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(
        href
      )}`;
    }
    return href;
  } catch {
    return href;
  }
}

const buildKey = (unitId: string, lessonId: string) => `${unitId}::${lessonId}`;

function calcPercentage(completedMap: Record<string, boolean>, totalLessons: number) {
  if (!totalLessons) return 0;
  const done = Object.values(completedMap || {}).filter(Boolean).length;
  return Math.min(100, Math.round((done / totalLessons) * 100));
}

/* =========================================================
   🧠 Component: CoursePlayerPage (Parte 1 - base)
   ========================================================= */

export default function CoursePlayerPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.id?.toString?.() || "";
  const { user, role, authReady, loading: authLoading, userProfile, saveCourseProgress, getCourseProgress } = useAuth();



  // 🔸 Estados principales
  const [curso, setCurso] = useState<Curso | null>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUnits, setExpandedUnits] = useState<Record<number, boolean>>({});
  const [activeU, setActiveU] = useState(0);
  const [activeL, setActiveL] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);


  // 🔸 Progreso del usuario
  const [progress, setProgress] = useState<Record<string, any>>({});

  // 🔸 Control de medios
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  // 🔸 Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);

  /* =========================================================
     🔹 Cargar curso desde Firestore

     
     ========================================================= */
     
  useEffect(() => {
    async function fetchCourse() {
      if (!firestore || !courseId) return;
      try {
        const ref = doc(firestore, "cursos", courseId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as Curso;
          console.log("🔥 Datos crudos desde Firestore:", JSON.stringify(data, null, 2));
          setCurso({ ...data, id: snap.id,  });
          console.log("📚 Curso cargado:", data);
        } else {
          setCurso(null);
        }
      } catch (err) {
        console.error("Error al cargar curso:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCourse();
  }, [firestore, courseId]);

  /* =========================================================
     🔹 Normalizar unidades
     ========================================================= */
useEffect(() => {
  if (!curso) return;

  console.log("📦 Normalizando curso:", curso.unidades);

  const normalized: any[] = [];

  // 1️⃣ Unidades normales
  (curso.unidades || []).forEach((u: any, idxU: number) => {
    const unitId = u.id || `unit-${idxU + 1}`;
    const lessons = (u.lecciones || []).map((l: any, idxL: number) => {
      const lessonId = l.id || `lesson-${idxU + 1}-${idxL + 1}`;
      return {
        key: buildKey(unitId, lessonId),
        id: lessonId,
        unitId,
        title: l.titulo || `Lección ${idxL + 1}`,
        text: l.texto || "",
        videoUrl: l.urlVideo || "",
        ejercicios: Array.isArray(l.ejercicios) ? l.ejercicios : [],
      };
    });

    // 2️⃣ Cierre / examen final de la unidad (solo 1)
    if (u.closing && (u.closing.examIntro || u.closing.examExercises?.length)) {
      lessons.push({
        key: buildKey(unitId, "closing"),
        id: "closing",
        unitId,
        title: "🧠 Cierre de la unidad",
        text: u.closing.examIntro || "",
        ejercicios: Array.isArray(u.closing.examExercises)
          ? u.closing.examExercises
          : [],
      });
    }

    normalized.push({
      id: unitId,
      title: u.titulo || `Unidad ${idxU + 1}`,
      description: u.descripcion || "",
      lessons,
    });
  });

  // 3️⃣ Cierre final del curso (video + mensaje final)
  if (curso.textoFinalCurso || curso.textoFinalCursoVideoUrl) {
    normalized.push({
      id: "closing-course",
      title: "🎓 Cierre del Curso",
      lessons: [
        {
          key: buildKey("closing", "final"),
          id: "final",
          unitId: "closing",
          title: "Cierre del Curso",
          text: curso.textoFinalCurso || "",
          videoUrl: curso.textoFinalCursoVideoUrl || "",
          ejercicios: [],
        },
      ],
    });
  }

  console.log("✅ Unidades normalizadas (final):", normalized);
  setUnits(normalized);
  if (normalized.length > 0) setExpandedUnits({ 0: true });
}, [curso]);



/* =========================================================
   🔹 Cargar progreso del curso desde AuthContext
   ========================================================= */
useEffect(() => {
  async function loadProgress() {
    if (!user?.uid || !courseId || !getCourseProgress) return;

    console.log("📚 Cargando progreso del curso desde contexto...");
    const data = await getCourseProgress(user.uid, courseId);

    if (data?.byLesson) {
      setProgress(data.byLesson);
      console.log("📊 Progreso recuperado:", data.byLesson);
    } else {
      console.log("⚠️ No hay progreso previo guardado.");
      setProgress({});
    }
  }

  loadProgress();
}, [user?.uid, courseId, getCourseProgress]);







  useEffect(() => {
  if (!mobileNavOpen) return;
  const prev = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => {
    document.body.style.overflow = prev || "auto";
  };
}, [mobileNavOpen]);


 /* =========================================================
     🔹 Resolver video de Firebase o HTTP
     ========================================================= */
  const activeLesson = useMemo(
    () => units[activeU]?.lessons?.[activeL] || null,
    [units, activeU, activeL]
  );

useEffect(() => {
  if (!activeLesson?.videoUrl) {
    setResolvedVideoUrl(null);
    return;
  }
  const url = activeLesson.videoUrl;

  if (url.startsWith("http")) {
    setResolvedVideoUrl(url);
    return;
  }

  const load = async () => {
    try {
      const httpsURL = await getDownloadURL(ref(storage, url));
      setResolvedVideoUrl(httpsURL);
    } catch {
      toast.error("No se pudo cargar el video.");
      setResolvedVideoUrl(null);
    }
  };
  load();
}, [activeLesson?.videoUrl]);



/* =========================================================
     🔹 Manejar finalización del video
     ========================================================= */




  /* =========================================================
     🔹 Estados derivados
     ========================================================= */
  const totalLessons = useMemo(
    () => units.reduce((acc, u) => acc + (u.lessons?.length || 0), 0),
    [units]
  );

const progressPercent = useMemo(() => {
  const done = Object.values(progress || {}).filter(
    (v: any) => v?.videoEnded || v?.exSubmitted
  ).length;
  return totalLessons > 0
    ? Math.round((done / totalLessons) * 100)
    : 0;
}, [progress, totalLessons]);

const completedCount = useMemo(() => {
  return Object.values(progress || {}).filter(
    (v: any) => v?.videoEnded || v?.exSubmitted
  ).length;
}, [progress]);




  /* =========================================================
   ▶️ Navegación entre lecciones
   ========================================================= */
const flatLessons = useMemo(() => {
  const arr: any[] = [];
  units.forEach((u, uIdx) =>
    (u.lessons || []).forEach((l, lIdx) => arr.push({ uIdx, lIdx, key: l.key }))
  );
  return arr;
}, [units]);

const indexOfLesson = useCallback(
  (uIdx: number, lIdx: number) => {
    let idx = 0;
    for (let i = 0; i < units.length; i++) {
      const len = units[i]?.lessons?.length || 0;
      if (i === uIdx) return idx + lIdx;
      idx += len;
    }
    return 0;
  },
  [units]
);

const goNextLesson = async () => {
  const currentIdx = indexOfLesson(activeU, activeL);
  const currentLesson = flatLessons[currentIdx];

  if (currentLesson?.key && user?.uid && saveCourseProgress) {
    try {
      await saveCourseProgress(user.uid, courseId, {
        [currentLesson.key]: { videoEnded: true },
      });

      // actualizamos estado local (para que el check se marque sin recargar)
      setProgress((prev) => ({
        ...prev,
        [currentLesson.key]: {
          ...(prev[currentLesson.key] || {}),
          videoEnded: true,
        },
      }));

      console.log("✅ Progreso guardado para:", currentLesson.key);
    } catch (err) {
      console.error("❌ Error guardando progreso:", err);
    }
  }

  const nextIdx = currentIdx + 1;
  if (nextIdx < flatLessons.length) {
    const next = flatLessons[nextIdx];
    setActiveU(next.uIdx);
    setActiveL(next.lIdx);
    setExpandedUnits((p) => ({ ...p, [next.uIdx]: true }));
    toast.success("➡️ Avanzaste a la siguiente lección");
  } else {
    toast.success("🎉 ¡Curso completado!");
    router.push("/dashboard");
  }
};



  /* =========================================================
   🧱 Helpers de progreso y Firestore
   ========================================================= */
function buildCourseStructure(units: any[]) {
  return units.map((u) => ({
    id: u.id,
    title: u.title,
    lessons: (u.lessons || []).map((l: any) => ({
      key: l.key,
      unitId: l.unitId,
      lessonId: l.id,
      title: l.titulo,
      type: l.type || "video",
    })),
  }));
}

function computeStats(byLesson: any, totalLessons: number) {
  const entries = Object.entries(byLesson || {});
  const completed = entries.filter(([, v]: any) => v?.exSubmitted || v?.videoEnded).length;
  const passed = entries.filter(([, v]: any) => v?.exPassed).length;
  const percentage = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
  return { completedLessons: completed, passedLessons: passed, percentage };
}

/* =========================================================
   💾 Guardar progreso (reemplaza el setProgress actual)
   ========================================================= */



useEffect(() => {
  const el = videoRef.current;
  if (!el) return;

  const handleEnded = async () => {
    console.log("🎬 [DEBUG] handleEnded disparado");
    setVideoEnded(true);

    if (activeLesson?.key) {
      console.log("🔑 [DEBUG] activeLesson.key:", activeLesson.key);

      toast.success("🎬 Video completado");

      // Actualiza localmente
      setProgress((prev) => {
        const updated = {
          ...prev,
          [activeLesson.key]: {
            ...prev[activeLesson.key],
            videoEnded: true,
          },
        };
        console.log("💾 [DEBUG] Progreso local actualizado:", updated);
        return updated;
      });

      if (user?.uid && saveCourseProgress) {
  await saveCourseProgress(user.uid, courseId, {
    [activeLesson.key]: { videoEnded: true },
  });
}

    } else {
      console.warn("⚠️ [DEBUG] No hay activeLesson.key definido");
    }
  };

  el.addEventListener("ended", handleEnded);
  return () => el.removeEventListener("ended", handleEnded);
}, [activeLesson?.key, user?.uid, saveCourseProgress]);


/* =========================================================
   🧠 ExerciseRunner — versión avanzada completa (TSX)
   ========================================================= */
function ExerciseRunner({
  ejercicios,
  lessonKey,
  batchId,
  userKey,
  courseId,
  onSubmit,
}: {
  ejercicios: any[];
  lessonKey: string;
  batchId: string;
  userKey: string;
  courseId: string;
  onSubmit?: (result: { correct: number; total: number }) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null
  );
  const { user, saveCourseProgress } = useAuth();


  // Manejar respuesta individual
  const handleAnswer = (id: string, value: any) => {
    if (submitted) return; // ya respondió, no permitir más
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };
useEffect(() => {
  const prev = progress?.[lessonKey];
  if (prev?.exSubmitted) setSubmitted(true);
}, [lessonKey, progress]);

  const evalOne = (ex: any): boolean => {
    const a = answers[ex.id];
    switch (ex.type) {
      case "multiple_choice":
        return a === ex.correctIndex;
      case "true_false":
        return a === ex.answer;
      case "fill_blank":
        return (
          Array.isArray(a) &&
          Array.isArray(ex.answers) &&
          a.every(
            (v, i) =>
              v?.trim()?.toLowerCase() ===
              ex.answers[i]?.trim()?.toLowerCase()
          )
        );
      case "reorder":
        return (
          Array.isArray(a) &&
          JSON.stringify(a) === JSON.stringify(ex.correctOrder)
        );
      case "matching":
        return (
          Array.isArray(a) &&
          ex.pairs?.every(
            (p: any, i: number) =>
              p.left === a[i]?.left && p.right === a[i]?.right
          )
        );
      case "text":
        return true; // no se evalúa automáticamente
      default:
        return false;
    }
  };

  const evaluate = async (lessonKeyParam = lessonKey) => {

    if (submitted) return; // no permitir reintento

    const total = ejercicios.length;
    let correct = 0;
    const details: Record<string, any> = {};

    ejercicios.forEach((ex) => {
      const isOk = evalOne(ex);
      if (isOk) correct++;
      details[ex.id] = {
        correct: isOk,
        answer: answers[ex.id],
        timestamp: Date.now(),
      };
    });

    const passed = correct === total;
    setSubmitted(true);
    setFeedback({
      ok: passed,
      msg: passed
        ? "✅ ¡Correcto! ¡Ejercicio completado!"
        : "❌ Incorrecto. Se registró tu intento.",
    });

    try {
      if (!userProfile?.batchId || !userProfile?.userKey) {
  console.error("❌ No hay batchId o userKey en userProfile");
  return;
}

if (user?.uid && saveCourseProgress) {
  await saveCourseProgress(user.uid, courseId, {
    [lessonKeyParam]: {
      exSubmitted: true,
      exPassed: passed,
      score: { correct, total },
    },
  });
}


    } catch (err) {
      console.error("🔥 Error guardando resultado:", err);
    }

    onSubmit?.({ correct, total });
  };

  const renderSolution = (ex: any) => {
    if (feedback?.ok) return null; // si aprobó, no mostrar
    switch (ex.type) {
      case "multiple_choice":
        return (
          <div className="text-xs text-slate-400">
            Correcta: <b>{ex.options?.[ex.correctIndex]}</b>
          </div>
        );
      case "true_false":
        return (
          <div className="text-xs text-slate-400">
            La respuesta correcta es:{" "}
            <b>{ex.answer ? "Verdadero" : "Falso"}</b>
          </div>
        );
      case "fill_blank":
        return (
          <div className="text-xs text-slate-400">
            Respuestas: {ex.answers?.join(", ")}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-lg mt-6 space-y-6">
      <h3 className="text-lg font-bold text-yellow-400">Ejercicios</h3>

      {ejercicios.map((ex) => (
        <div
          key={ex.id}
          className={`border rounded-lg p-3 space-y-2 ${
            submitted && !feedback?.ok ? "opacity-70" : ""
          }`}
        >
          <p className="font-semibold text-white mb-2">
            {ex.question || ex.prompt || ex.statement}
          </p>

          {/* OPCIÓN MÚLTIPLE */}
          {ex.type === "multiple_choice" && (
            <div className="space-y-1">
              {ex.options.map((opt: string, idx: number) => (
                <label
                  key={idx}
                  className="flex items-center gap-2 text-sm text-slate-300"
                >
                  <input
                    type="radio"
                    name={ex.id}
                    disabled={submitted}
                    checked={answers[ex.id] === idx}
                    onChange={() => handleAnswer(ex.id, idx)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}

          {/* TRUE/FALSE */}
          {ex.type === "true_false" && (
            <div className="flex gap-4">
              {["Verdadero", "Falso"].map((label, idx) => {
                const val = idx === 0;
                return (
                  <label
                    key={label}
                    className="flex items-center gap-2 text-sm text-slate-300"
                  >
                    <input
                      type="radio"
                      name={ex.id}
                      disabled={submitted}
                      checked={answers[ex.id] === val}
                      onChange={() => handleAnswer(ex.id, val)}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          )}

          {/* RELLENAR ESPACIOS */}
          {ex.type === "fill_blank" && (
            <div className="flex flex-col gap-2">
              {ex.answers.map((_: any, idx: number) => (
                <input
                  key={idx}
                  type="text"
                  disabled={submitted}
                  placeholder={`Respuesta ${idx + 1}`}
                  className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-sm"
                  value={answers[ex.id]?.[idx] || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const current = Array.isArray(answers[ex.id])
                      ? [...answers[ex.id]]
                      : [];
                    current[idx] = val;
                    handleAnswer(ex.id, current);
                  }}
                />
              ))}
            </div>
          )}

          {/* Mostrar solución si falló */}
          {submitted && !feedback?.ok && renderSolution(ex)}
        </div>
      ))}

      {/* BOTÓN DE ENVÍO */}
      <button
        disabled={submitted}
        onClick={evaluate}
        className={`px-4 py-2 font-semibold rounded ${
          submitted
            ? "bg-slate-700 text-gray-400 cursor-not-allowed"
            : "bg-yellow-400 text-black hover:bg-yellow-300"
        }`}
      >
        {submitted ? "Intento registrado" : "Comprobar respuestas"}
      </button>

      {feedback && (
        <div
          className={`text-sm ${
            feedback.ok ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {feedback.msg}
        </div>
      )}
    </div>
  );

  
}




// Estado para navegación dentro de ejercicios
const [currentExercise, setCurrentExercise] = useState(0);

const nextExercise = () => {
  if (activeLesson?.ejercicios && currentExercise < activeLesson.ejercicios.length - 1) {
    setCurrentExercise((prev) => prev + 1);
  }
};

const prevExercise = () => {
  if (currentExercise > 0) setCurrentExercise((prev) => prev - 1);
};

  /* =========================================================
     🔹 Guards de acceso
     ========================================================= */
  if (!authReady || authLoading || loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-slate-300">
        Cargando curso...
      </div>
    );
  }

  const canAccess =
    role === "admin" ||
    role === "profesor" ||
    (user?.email && (curso?.cursantes || []).includes(user.email));

  if (!curso || !canAccess) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-6 bg-[#0B1220]">
        <div className="max-w-md bg-slate-800 rounded-2xl border border-slate-700 p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-yellow-400/20 text-yellow-400 grid place-items-center">
            <FiAlertTriangle />
          </div>
          <h2 className="mt-3 text-lg font-bold text-white">
            No tienes acceso
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Iniciá sesión con la cuenta correcta o contactá al administrador.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }






/* =========================================================
   🧩 CapstoneForm — entrega final (Drive link)
   ========================================================= */
function CapstoneForm({
  courseId,
  lessonkey,
  onSubmit,
}: {
  courseId: string;
  lessonKey: string;
  onSubmit: (link: string) => void;
}) {
  const [link, setLink] = useState("");
  return (
    <div className="space-y-3">
      <input
        type="url"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="https://drive.google.com/..."
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
      />
      <button
        onClick={() => {
          if (!link.trim()) return toast.error("Por favor, ingresa un enlace válido.");
          onSubmit(link);
        }}
        className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded hover:bg-yellow-300"
      >
        Enviar entrega
      </button>
    </div>
  );
}


  /* =========================================================
     🔹 UI inicial (básica)
     ========================================================= */
  return (
  <div className="flex min-h-screen bg-[#0B1220] text-slate-200">
    {/* ======================= SIDEBAR IZQUIERDA ======================= */}
    <aside className="w-72 shrink-0 border-r border-slate-800 bg-[#0F172A] overflow-y-auto">
      <div className="p-4 border-b border-slate-800">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-sm text-slate-300 hover:text-yellow-400"
        >
          <FiChevronLeft className="text-yellow-400" />
          Volver al inicio
        </button>
      </div>

      <div className="p-4 border-b border-slate-800">
        <h1 className="text-lg font-bold text-white line-clamp-1">{curso.titulo}</h1>
        <p className="text-xs text-slate-400 line-clamp-2">{curso.descripcion}</p>
        <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-400 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <nav className="p-3 space-y-2">
        {units.map((u, uIdx) => {
  // Si es el cierre global del curso, NO lo tratamos como "Unit"
  if (u.id === "closing-course") {
    const l = u.lessons?.[0]; // siempre 1
    const done = l && (progress[l.key]?.videoEnded || progress[l.key]?.exSubmitted);
    const active = activeU === uIdx && activeL === 0;

    return (
      <div key={u.id} className="mt-4 pt-3 border-t border-slate-800">
        <div className="px-3 py-2 font-semibold text-slate-200">
          🎓 Cierre del curso
        </div>

        <button
          onClick={() => {
            setActiveU(uIdx);
            setActiveL(0);
          }}
          className={`block w-full text-left px-5 py-1.5 rounded-md text-sm transition ${
            active
              ? "bg-yellow-400/10 text-yellow-300 border border-yellow-400/30"
              : done
              ? "text-emerald-400 hover:bg-slate-800"
              : "text-slate-300 hover:bg-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="truncate">{l?.title || "Cierre del Curso"}</span>
            {done && <FiCheckCircle size={12} className="text-emerald-400" />}
          </div>
        </button>
      </div>
    );
  }

  // Para las unidades normales, calculamos el número real (ignora closing-course)
  const unitNumber =
    units.slice(0, uIdx).filter((x) => x.id !== "closing-course").length + 1;

  return (
    <div key={u.id}>
      <button
        onClick={() =>
          setExpandedUnits((prev) => ({ ...prev, [uIdx]: !prev[uIdx] }))
        }
        className={`w-full text-left px-3 py-2 font-semibold flex justify-between items-center ${
          expandedUnits[uIdx]
            ? "bg-yellow-400/20 text-yellow-300"
            : "hover:bg-slate-800 text-slate-300"
        }`}
      >
        <span>Unit {unitNumber}: {u.title}</span>
        <FiChevronRight
          className={`transition-transform ${
            expandedUnits[uIdx] ? "rotate-90" : ""
          }`}
        />
      </button>

      {expandedUnits[uIdx] && (
        <div className="mt-1 space-y-1">
          {u.lessons.map((l, lIdx) => {
            const done =
              progress[l.key]?.videoEnded || progress[l.key]?.exSubmitted;
            const active = activeU === uIdx && activeL === lIdx;
            return (
              <button
                key={l.key}
                onClick={() => {
                  setActiveU(uIdx);
                  setActiveL(lIdx);
                }}
                className={`block w-full text-left px-5 py-1.5 rounded-md text-sm transition ${
                  active
                    ? "bg-yellow-400/10 text-yellow-300 border border-yellow-400/30"
                    : done
                    ? "text-emerald-400 hover:bg-slate-800"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{l.title}</span>
                  {done && <FiCheckCircle size={12} className="text-emerald-400" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
})}

      </nav>
    </aside>

    {/* ======================= CONTENIDO PRINCIPAL ======================= */}
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-white">
          {activeLesson?.title || "Lección actual"}
        </h1>

        {resolvedVideoUrl && (
          <div className="aspect-video rounded-xl overflow-hidden bg-black">
            <iframe
              src={resolvedVideoUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {activeLesson?.text && (
          <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800">
            <p className="text-slate-300 whitespace-pre-line">{activeLesson.text}</p>
          </div>
        )}

        {activeLesson?.pdfUrl && (
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
            <a
              href={activeLesson.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-400 hover:underline flex items-center gap-2"
            >
              📄 Ver PDF adjunto
            </a>
          </div>
        )}

        {/* ======= EJERCICIOS (con navegación) ======= */}
        {Array.isArray(activeLesson?.ejercicios) &&
          activeLesson.ejercicios.length > 0 && (
            <div className="bg-slate-900/70 p-6 rounded-xl border border-slate-800">
              <h2 className="text-xl font-semibold mb-4 text-yellow-400">
                🧠 Ejercicios ({activeLesson.ejercicios.length})
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-200 mb-3">
                    {activeLesson.ejercicios[currentExercise].question ||
                      activeLesson.ejercicios[currentExercise].prompt ||
                      "Ejercicio"}
                  </h3>

                  <ExerciseRunner
  ejercicios={[activeLesson.ejercicios[currentExercise]]}
  lessonKey={activeLesson.key}
  batchId={userProfile?.batchId}
  userKey={userProfile?.userKey}
  courseId={courseId}
  onSubmit={async ({ correct, total }) => {
  const passed = correct === total;

  if (!user?.uid) {
    toast.error("Inicia sesión para guardar tu progreso");
    return;
  }
  if (!activeLesson?.key) {
    console.error("No hay activeLesson.key");
    return;
  }

  try {
    await saveCourseProgress(user.uid, courseId, {
      [activeLesson.key]: {
        exSubmitted: true,
        exPassed: passed,
        score: { correct, total },
      },
    });

    setProgress((prev) => ({
      ...prev,
      [activeLesson.key]: {
        ...(prev[activeLesson.key] || {}),
        exSubmitted: true,
        exPassed: passed,
        score: { correct, total },
      },
    }));

    toast[passed ? "success" : "info"](
      passed ? "🎉 ¡Ejercicio aprobado!" : "❌ Fallaste. Tu intento quedó guardado."
    );
  } catch (error) {
    console.error("🔥 Error guardando progreso:", error);
    toast.error("No se pudo guardar tu progreso");
  }
}}

/>

                </div>

                {/* Navegación entre ejercicios */}
                <div className="flex justify-between">
                  <button
                    onClick={prevExercise}
                    disabled={currentExercise === 0}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-200 disabled:opacity-50"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={nextExercise}
                    disabled={
                      currentExercise >= activeLesson.ejercicios.length - 1
                    }
                    className="px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-semibold"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* ======= MENSAJE FINAL DE LECCIÓN ======= */}
        {activeLesson?.finalMessage && (
          <div className="bg-green-900/40 border border-green-800 rounded-xl p-6 text-green-300">
            {activeLesson.finalMessage}
          </div>
        )}

        {/* ======= BOTÓN SIGUIENTE LECCIÓN ======= */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={goNextLesson}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold shadow bg-yellow-400 text-slate-900 hover:bg-yellow-300"
          >
            Siguiente lección
            <FiChevronRight />
          </button>
        </div>
      </div>
    </main>

    {/* ======================= SIDEBAR DERECHA ======================= */}
    <aside className="hidden xl:block xl:w-80 xl:shrink-0 bg-[#0F172A] border-l border-slate-800 p-6">
      <h3 className="text-lg font-semibold text-slate-200 mb-2">
        Resumen del curso
      </h3>
      <p className="text-sm text-slate-400 mb-4">
        {curso?.descripcion || "Sin descripción disponible"}
      </p>

      <div className="space-y-2 mb-6">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Progreso total</span>
          <span className="font-semibold text-white">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-400 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="text-xs text-slate-400">
          {completedCount} de {totalLessons} lecciones completadas
        </div>
      </div>

      <div className="border-t border-slate-800 pt-4 space-y-1 text-sm">
        <p className="text-slate-400">Lección actual</p>
        <p className="font-semibold text-yellow-400">
          {activeLesson?.title || "—"}
        </p>
        <p className="text-xs text-slate-500">
          Unidad: {units[activeU]?.title || "—"}
        </p>
      </div>
    </aside>
  </div>
);

}
