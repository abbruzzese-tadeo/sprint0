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
  const { user, role, authReady, loading: authLoading } = useAuth();

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

    // Cierre de unidad
    if (u.closing && (u.closing.examIntro || u.closing.examExercises?.length)) {
      lessons.push({
        key: buildKey(unitId, "closing"),
        id: "closing",
        unitId,
        title: "Cierre de la unidad",
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

  // 2️⃣ Examen final (si existe)
  if (curso.examenFinal?.introTexto || curso.examenFinal?.ejercicios?.length) {
    normalized.push({
      id: "final-exam",
      title: "🧠 Examen final",
      lessons: [
        {
          key: buildKey("final", "exam"),
          id: "exam",
          unitId: "final",
          title: "Examen Final del Curso",
          text: curso.examenFinal.introTexto || "",
          ejercicios: Array.isArray(curso.examenFinal.ejercicios)
            ? curso.examenFinal.ejercicios
            : [],
        },
      ],
    });
  }

  // 3️⃣ Capstone (si tiene instrucciones o video)
  if (
    curso.capstone &&
    (curso.capstone.instrucciones ||
      curso.capstone.videoUrl ||
      curso.capstone.checklist?.length)
  ) {
    normalized.push({
      id: "capstone",
      title: "💼 Proyecto Final (Capstone)",
      lessons: [
        {
          key: buildKey("capstone", "project"),
          id: "project",
          unitId: "capstone",
          title: "Entrega del Proyecto Final",
          text: curso.capstone.instrucciones || "",
          videoUrl: curso.capstone.videoUrl || "",
          ejercicios: [],
        },
      ],
    });
  }

  // 4️⃣ Cierre final del curso
  if (curso.textoFinalCurso || curso.textoFinalCursoVideoUrl) {
    normalized.push({
      id: "closing",
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

  console.log("✅ Unidades normalizadas:", normalized);
  setUnits(normalized);
  if (normalized.length > 0) setExpandedUnits({ 0: true });
}, [curso]);

/* =========================================================
   🔹 Cargar progreso desde Firestore (solo alumnos)
   ========================================================= */
useEffect(() => {
  async function loadProgress() {
    if (!firestore || !user?.email || !courseId) return;

    try {
      const ref = doc(firestore, "alumnos", user.email);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        const courseProgress =
          data?.progress?.[courseId]?.progress?.byLesson || {};
        setProgress(courseProgress);
        console.log("📊 Progreso cargado:", courseProgress);
      } else {
        console.log("📊 No hay progreso previo guardado.");
      }
    } catch (err) {
      console.error("❌ Error al cargar progreso:", err);
    }
  }

  loadProgress();
}, [firestore, user?.email, courseId]);





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

const goNextLesson = () => {
  const currentIdx = indexOfLesson(activeU, activeL);
  const currentLesson = flatLessons[currentIdx];
  if (currentLesson?.key) {
    saveProgressAdvanced(currentLesson.key, { videoEnded: true });
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
const saveProgressAdvanced = useCallback(
  async (lessonKey: string, data: any) => {
    if (!firestore || !user?.email || !courseId) return;
    try {
      const userRef = doc(firestore, "alumnos", user.email);

      // Estado actualizado
      const updated = {
        ...progress,
        [lessonKey]: {
          ...(progress[lessonKey] || {}),
          ...data,
          updatedAt: Date.now(),
        },
      };

      // Estructura resumida
      const structure = buildCourseStructure(units);
      const stats = computeStats(updated, totalLessons);

      const payload = {
        courseId,
        courseMeta: {
          id: curso?.id,
          title: curso?.titulo,
          totalUnits: units.length,
          totalLessons,
        },
        courseStructure: structure,
        progress: {
          byLesson: updated,
          lastActive: {
            unitId: units[activeU]?.id,
            lessonId: units[activeU]?.lessons?.[activeL]?.id,
          },
        },
        stats,
      };
        console.log("🚨 [DEBUG] Payload completo antes de guardar:", JSON.stringify(payload, null, 2));

function removeUndefined(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  } else if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, removeUndefined(v)])
    );
  }
  return obj;
}

const sanitizedPayload = removeUndefined(payload);

console.log("🚨 [DEBUG] Payload sanitizado:", sanitizedPayload);

      await setDoc(
  userRef,
  { progress: { [courseId]: sanitizedPayload } },
  { merge: true }
);

      setProgress(updated);
      console.log("✅ Progreso guardado:", payload);
    } catch (err) {
      console.error("❌ Error guardando progreso:", err);
    }
  },
  [
    firestore,
    user?.email,
    courseId,
    progress,
    curso,
    units,
    totalLessons,
    activeU,
    activeL,
  ]
);


useEffect(() => {
  const el = videoRef.current;
  if (!el) return;

  const handleEnded = () => {
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

      // Persiste en Firestore
      saveProgressAdvanced(activeLesson.key, {
        videoEnded: true,
      });
    } else {
      console.warn("⚠️ [DEBUG] No hay activeLesson.key definido");
    }
  };

  el.addEventListener("ended", handleEnded);
  return () => el.removeEventListener("ended", handleEnded);
}, [activeLesson?.key, saveProgressAdvanced]);

/* =========================================================
   🧠 ExerciseRunner — versión avanzada completa (TSX)
   ========================================================= */
function ExerciseRunner({
  ejercicios = [],
  onSubmit,
}: {
  ejercicios: any[];
  onSubmit?: (result: { correct: number; total: number }) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number }>({
    correct: 0,
    total: 0,
  });

  const handleAnswer = (id: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const evaluate = () => {
    let correct = 0;
    ejercicios.forEach((ex) => {
      const a = answers[ex.id];
      switch (ex.type) {
        case "multiple_choice":
          if (a === ex.correctIndex) correct++;
          break;

        case "true_false":
          if (a === ex.answer) correct++;
          break;

        case "fill_blank":
          if (
            Array.isArray(a) &&
            Array.isArray(ex.answers) &&
            a.every(
              (v, i) =>
                v?.trim()?.toLowerCase() ===
                ex.answers[i]?.trim()?.toLowerCase()
            )
          )
            correct++;
          break;

        case "reorder":
          if (
            Array.isArray(a) &&
            JSON.stringify(a) === JSON.stringify(ex.correctOrder)
          )
            correct++;
          break;

        case "matching":
          if (
            Array.isArray(a) &&
            ex.pairs.every(
              (pair: any, i: number) =>
                pair.right === a[i]?.right && pair.left === a[i]?.left
            )
          )
            correct++;
          break;

        case "text":
          // Los ejercicios de texto no se corrigen automáticamente
          correct += 0;
          break;
      }
    });

    const total = ejercicios.length;
    const result = { correct, total };
    setScore(result);
    setSubmitted(true);
    onSubmit?.(result);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-lg mt-6 space-y-6">
      <h3 className="text-lg font-bold text-yellow-400">Ejercicios</h3>

      {ejercicios.map((ex: any) => (
        <div
          key={ex.id}
          className="border border-slate-700 rounded-lg p-3 space-y-2"
        >
          <p className="font-semibold text-white mb-2">
            {ex.question || ex.prompt || ex.statement}
          </p>

          {/* MULTIPLE CHOICE */}
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
                    checked={answers[ex.id] === idx}
                    onChange={() => handleAnswer(ex.id, idx)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}

          {/* TRUE / FALSE */}
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
                      checked={answers[ex.id] === val}
                      onChange={() => handleAnswer(ex.id, val)}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          )}

          {/* FILL BLANK */}
          {ex.type === "fill_blank" && (
            <div className="flex flex-col gap-2">
              {ex.answers.map((_: any, idx: number) => (
                <input
                  key={idx}
                  type="text"
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

          {/* REORDER */}
          {ex.type === "reorder" && (
            <div className="flex flex-col gap-2 text-sm text-slate-300">
              <p className="text-xs text-slate-400 mb-1">
                Ordená los elementos en el orden correcto:
              </p>
              {ex.items.map((item: string, idx: number) => (
                <div
                  key={idx}
                  className="px-3 py-2 bg-slate-800 rounded border border-slate-700"
                >
                  {idx + 1}. {item}
                </div>
              ))}
              <p className="text-xs text-slate-500 mt-2">
                (Funcionalidad drag-and-drop pendiente)
              </p>
            </div>
          )}

          {/* MATCHING */}
          {ex.type === "matching" && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {ex.pairs.map((pair: any, idx: number) => (
                <div
                  key={idx}
                  className="flex justify-between bg-slate-800 border border-slate-700 rounded px-3 py-2"
                >
                  <span>{pair.left}</span>
                  <span className="text-slate-400">↔</span>
                  <span>{pair.right}</span>
                </div>
              ))}
              <p className="col-span-2 text-xs text-slate-500 mt-2">
                (Emparejamiento manual pendiente)
              </p>
            </div>
          )}

          {/* TEXTO LIBRE */}
          {ex.type === "text" && (
            <textarea
              rows={4}
              maxLength={ex.maxLength || 500}
              placeholder="Escribe tu respuesta aquí..."
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
              value={answers[ex.id] || ""}
              onChange={(e) => handleAnswer(ex.id, e.target.value)}
            />
          )}
        </div>
      ))}

      <button
        onClick={evaluate}
        disabled={submitted}
        className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded hover:bg-yellow-300"
      >
        {submitted ? "Enviado" : "Enviar respuestas"}
      </button>

      {submitted && (
        <div className="mt-2 text-sm text-slate-300">
          Puntuación:{" "}
          <span className="text-yellow-400 font-bold">{score.correct}</span> /{" "}
          {score.total}
        </div>
      )}
    </div>
  );
}

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
  lessonKey,
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
    <div className="min-h-screen bg-[#0B1220] text-slate-200 flex">
      {/* Sidebar izquierda */}
      <aside className="w-72 shrink-0 border-r border-slate-800 bg-[#0F172A] overflow-y-auto">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-yellow-400"
          >
            <FiChevronLeft className="text-yellow-400" />
            Volver al inicio
          </button>
        </div>
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-lg font-bold text-white line-clamp-1">
            {curso.titulo}
          </h1>
          <p className="text-xs text-slate-400 line-clamp-2">
            {curso.descripcion}
          </p>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-400">Progreso</span>
            <span className="text-sm font-semibold text-yellow-400">
              {progressPercent}%
            </span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* === HEADER / NAV SUPERIOR === */}
<header className="sticky top-0 z-40 bg-[#0F172A]/95 backdrop-blur border-b border-slate-800 px-3 sm:px-4 py-2.5 mb-6 flex items-center justify-between">
  {/* Botón “Volver” (izquierda) */}
  <button
    onClick={() => router.push("/dashboard")}
    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800"
  >
    <FiChevronLeft />
    <span className="text-sm">Volver</span>
  </button>

  {/* Título curso (centro) */}
  <h1 className="text-sm sm:text-lg font-semibold text-white truncate">
    {curso?.titulo || "Curso"}
  </h1>

  {/* Botón de menú (derecha, visible solo en mobile) */}
  <button
    type="button"
    className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800"
    onClick={() => setMobileNavOpen(true)}
  >
    <FiMenu size={18} />
  </button>
</header>


        <h2 className="text-xl font-bold text-white mb-3">
          {units[activeU]?.title || "Unidad"}
        </h2>

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="text-lg font-semibold text-yellow-400 mb-3">
            {activeLesson?.title || "Lección actual"}
          </h3>

          {/* Video principal */}
         {resolvedVideoUrl && (
  <iframe
    src={resolvedVideoUrl}
    title="Video del curso"
    className="w-full aspect-video rounded-lg bg-black mb-4"
    allow="autoplay; fullscreen"
    allowFullScreen
  />
)}




          {/* Texto */}
          {activeLesson?.text && (
  <div className="text-slate-300 whitespace-pre-line">
    {activeLesson.text}
  </div>
)}

          {/* === EJERCICIOS === */}
{Array.isArray(activeLesson?.ejercicios) && activeLesson.ejercicios.length > 0 && (
  <div className="mt-6">
    <ExerciseRunner
      ejercicios={activeLesson.ejercicios}
      onSubmit={(result: { correct: number; total: number }) => {
        const passed = result.correct === result.total;
        saveProgressAdvanced(activeLesson.key, {
          exSubmitted: true,
          exPassed: passed,
          score: result,
        });
        toast[passed ? "success" : "info"](
          passed ? "✅ ¡Ejercicio aprobado!" : "⚠️ Algunas respuestas incorrectas"
        );
      }}
    />
  </div>
)}

{/* === BOTÓN SIGUIENTE === */}
<div className="mt-6 flex justify-end">
  <button
    onClick={goNextLesson}
    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold shadow bg-yellow-400 text-slate-900 hover:bg-yellow-300"
  >
    Siguiente lección
    <FiChevronRight />
  </button>
</div>

{/* === TEXTO DE CIERRE DE UNIDAD SIN EXAMEN === */}
{activeLesson?.type === "text" &&
  !Array.isArray(unidad?.closing?.examExercises) && (
    <div className="mt-8 bg-slate-900/70 border border-slate-800 rounded-xl p-6">
      <h3 className="text-lg font-bold text-yellow-400 mb-2">
        Cierre de la unidad
      </h3>
      {typeof unidad?.closing?.texto === "string" && (
        <p className="text-slate-300 whitespace-pre-line">
          {unidad.closing.texto}
        </p>
      )}
    </div>
  )}

{/* === EXAMEN FINAL DE LA UNIDAD === */}
{activeLesson?.type === "text" &&
  Array.isArray(unidad?.closing?.examExercises) &&
  unidad.closing.examExercises.length > 0 && (
    <div className="mt-10 bg-slate-900/70 border border-slate-800 rounded-xl p-6">
      <h3 className="text-xl font-bold text-yellow-400 mb-3">
        🧠 Examen final de la unidad
      </h3>

      {/* Texto introductorio */}
      {unidad?.closing?.examIntro && (
        <p className="text-slate-300 mb-6 whitespace-pre-line">
          {unidad.closing.examIntro}
        </p>
      )}

      {/* Ejercicios del examen */}
      <ExerciseRunner
        ejercicios={unidad.closing.examExercises}
        onSubmit={(result: { correct: number; total: number }) => {
          const passed = result.correct === result.total;
          saveProgressAdvanced(activeLesson.key, {
            exSubmitted: true,
            exPassed: passed,
            score: result,
          });
          toast[passed ? "success" : "info"](
            passed
              ? "✅ ¡Examen aprobado!"
              : "⚠️ Algunas respuestas incorrectas"
          );

          // marcar cierre de unidad
          saveProgressAdvanced(`closing-${unidad.id}`, {
            exSubmitted: true,
            exPassed: passed,
            videoEnded: true,
          });

          // pasar a la siguiente unidad
          const nextUnit = curso?.unidades?.[unidadIndex + 1];
          if (nextUnit) {
            toast.success("Avanzando a la siguiente unidad...");
            setUnidadIndex(unidadIndex + 1);
            setLeccionIndex(0);
          } else {
            toast.success("🎓 ¡Completaste todas las unidades!");
          }
        }}
      />
    </div>
  )}


{/* === CAPSTONE FINAL === */}
{activeLesson?.type === "capstone" && (
  <div className="mt-10 border border-slate-800 bg-slate-900/70 rounded-xl p-6">
    <h3 className="text-xl font-bold text-yellow-400 mb-4">
      🧩 Proyecto final del curso
    </h3>
    <p className="text-slate-300 mb-4">
      Subí el enlace a tu entrega (por ejemplo, un documento o presentación en Google Drive).
    </p>
    <CapstoneForm
      courseId={courseId}
      lessonKey={activeLesson.key}
      onSubmit={(link) => {
        saveProgressAdvanced(activeLesson.key, {
          exSubmitted: true,
          exPassed: !!link,
          answers: { link },
        });
        toast.success("✅ Entrega subida correctamente");
      }}
    />
  </div>
)}

{/* === CIERRE FINAL DEL CURSO === */}
{activeLesson?.type === "closing" && (
  <div className="mt-12 bg-slate-900/70 border border-slate-800 p-8 rounded-xl text-center">
    <h3 className="text-2xl font-bold text-yellow-400 mb-3">
      🎓 ¡Felicitaciones, completaste el curso!
    </h3>
    <p className="text-slate-300 mb-6">
      Has finalizado todas las unidades y entregas. Tu progreso quedará
      registrado y podrás revisar tus resultados desde el panel principal.
    </p>
    <button
      onClick={() => {
        toast.success("Curso completado ✅");
        saveProgressAdvanced(activeLesson.key, {
          exSubmitted: true,
          exPassed: true,
          finishedCourse: true,
        });
        setTimeout(() => router.push("/dashboard"), 1500);
      }}
      className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300"
    >
      Volver al panel
    </button>
  </div>
)}




{/* === PDF fullscreen modal === */}
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
        src={toEmbedPdfUrl(activeLesson?.pdfUrl)}
        title="PDF Viewer"
        className="w-full h-full"
      />
    </div>
  </div>
)}


        </div>
      </main>

      {/* === SIDEBAR DERECHO: RESUMEN DEL CURSO === */}
<aside className="hidden xl:block xl:w-80 xl:shrink-0 bg-[#0F172A] border-l border-slate-800 p-5 overflow-y-auto">
  <div className="flex items-center gap-2 text-slate-200 font-semibold mb-4">
    <FiBookOpen className="text-yellow-400" />
    <span>Resumen del curso</span>
  </div>

  <p className="text-sm text-slate-400 mb-4">
    {String(curso?.descripcion || "Sin descripción disponible")}
  </p>

  {/* Progreso general */}
  <div className="space-y-2 mb-6">
    <div className="flex items-center justify-between text-xs text-slate-400">
      <span>Progreso total</span>
      <span className="font-semibold text-white">{progressPercent}%</span>
    </div>
    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full transition-all duration-500"
        style={{ width: `${progressPercent}%` }}
      />
    </div>
    <div className="text-xs text-slate-400">
      {completedCount} de {totalLessons} lecciones completadas
    </div>
  </div>

  {/* Datos actuales */}
  <div className="space-y-3 text-sm border-t border-slate-800 pt-4">
    <div className="flex items-center justify-between">
      <span className="text-slate-300">Lección actual</span>
      <span className="font-bold text-yellow-400">
        {indexOfLesson(activeU, activeL) + 1}/{totalLessons}
      </span>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-slate-300">Unidad</span>
      <span className="font-semibold text-white">
        {units[activeU]?.title || "—"}
      </span>
    </div>
  </div>

  {/* Próxima lección */}
  {(() => {
    const currentIdx = indexOfLesson(activeU, activeL);
    const nextIdx = currentIdx + 1;
    const nextLesson = flatLessons[nextIdx];
    if (nextLesson) {
      const nextUnit = units[nextLesson.uIdx];
      const nextLessonData = nextUnit?.lessons?.[nextLesson.lIdx];
      return (
        <div className="mt-6 pt-4 border-t border-slate-800">
          <div className="text-sm font-semibold text-slate-200 mb-2">
            Próxima lección
          </div>
          <div className="text-xs text-slate-400">
            <div className="font-medium text-slate-300 line-clamp-1">
              {nextLessonData?.title}
            </div>
            <div className="text-slate-500 text-[12px]">
              {nextUnit?.title}
            </div>
          </div>
        </div>
      );
    }
    if (currentIdx + 1 >= totalLessons) {
      return (
        <div className="mt-6 pt-4 border-t border-slate-800">
          <div className="text-sm font-semibold text-emerald-400 mb-2">
            🎉 Curso completado
          </div>
          <p className="text-xs text-slate-400">
            Finalizaste todas las lecciones.
          </p>
        </div>
      );
    }
    return null;
  })()}

  {/* Footer */}
  <div className="mt-10 text-xs text-slate-500 border-t border-slate-800 pt-4">
    © {new Date().getFullYear()} Further Academy
  </div>
</aside>
    </div>
  );
}
