"use client";

import {
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Script from "next/script";
import Image from "next/image";
import { toast } from "sonner";
import { doc, setDoc, getDoc, serverTimestamp, type Timestamp } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import {
  FiCheckCircle,
  FiChevronRight,
  FiChevronDown,
  FiClock,
  FiBookOpen,
  FiAlertTriangle,
  FiArrowUp,
  FiArrowDown,
  FiLock,
  FiPlay,
  FiMaximize,
  FiMenu,
  FiX,
  FiChevronLeft,
} from "react-icons/fi";

// Asumo la existencia de este contexto, pero lo tipamos
interface ContextGeneralValue {
  firestore: any; // Debería ser Firestore
  storage: any; // Debería ser FirebaseStorage
  usuario?: {
    email?: string;
    cursosAdquiridos?: string[];
    // Puedes añadir más propiedades de usuario aquí
  } | null;
  cursos?: RawCourse[];
  verificarLogin?: () => void;
}
// Asumimos que ContextGeneral es un contexto React con el valor de arriba
import ContextGeneral from "@/contexts/contextGeneral";

/* =========================
   Type Definitions
   ========================= */

// --- 1. Exercises Types ---
type ExerciseType =
  | "multiple_choice"
  | "true_false"
  | "text"
  | "fill_blank"
  | "reorder"
  | "matching";

interface BaseExercise {
  id: string;
  type: ExerciseType;
  title?: string;
  question?: string;
  statement?: string;
  prompt?: string;
}

interface MultipleChoiceExercise extends BaseExercise {
  type: "multiple_choice";
  options: string[];
  correctIndex: number;
}

interface TrueFalseExercise extends BaseExercise {
  type: "true_false";
  answer: boolean; // La respuesta correcta
}

interface TextExercise extends BaseExercise {
  type: "text";
  answer?: string; // Respuesta sugerida (opcional)
}

interface FillBlankExercise extends BaseExercise {
  type: "fill_blank";
  sentence: string; // Frase con '***'
  answers: string[]; // Respuestas correctas
  hintWords?: string; // Banco de palabras (string separado por comas)
}

interface ReorderExercise extends BaseExercise {
  type: "reorder";
  items: string[];
  correctOrder: number[]; // Array de índices [0, 1, 2, ...]
}

interface MatchingPair {
  left: string;
  right: string;
}
interface MatchingExercise extends BaseExercise {
  type: "matching";
  pairs: MatchingPair[];
}

type Exercise =
  | MultipleChoiceExercise
  | TrueFalseExercise
  | TextExercise
  | FillBlankExercise
  | ReorderExercise
  | MatchingExercise;


// --- 2. Lesson & Unit Types ---

type LessonType = "video" | "text" | "exam" | "capstone";

interface BaseLesson {
  key: string;
  unitId: string;
  lessonId: string;
  id: string;
  title: string;
  type: LessonType;
  videoUrl: string;
  pdfUrl: string;
  exercises: Exercise[];
  forceExercises: boolean; // permite "Submit" sin video/pdf
  text: string;
  duration?: number | null;
  thumbUrl?: string;
}

interface VideoLesson extends BaseLesson {
  type: "video";
  finalMessage?: string;
}

interface TextLesson extends BaseLesson {
  type: "text";
}

interface ExamLesson extends BaseLesson {
  type: "exam";
}

interface CapstoneLesson extends BaseLesson {
  type: "capstone";
  checklist: string[];
}

type Lesson = VideoLesson | TextLesson | ExamLesson | CapstoneLesson;

interface Unit {
  id: string;
  title: string;
  lessons: Lesson[];
}

// Minimal structure for persistence
interface CourseStructureLesson {
  key: string;
  unitId: string;
  lessonId: string;
  title: string;
  duration: number | null;
  type: LessonType;
}

interface CourseStructureUnit {
  id: string;
  title: string;
  lessons: CourseStructureLesson[];
}

// --- 3. Raw Course Structure (Firebase/API) ---
interface RawUnit {
  id?: string;
  titulo?: string;
  descripcion?: string;
  textoCierre?: string;
  duracion?: number | null;
  urlVideo?: string;
  urlImagen?: string;
  lecciones?: RawLesson[];
}

interface RawLesson {
  id?: string;
  titulo?: string;
  duracion?: number | null;
  urlVideo?: string;
  urlImagen?: string;
  texto?: string;
  pdfUrl?: string;
  ejercicios?: any[]; // raw, untyped exercises from DB
  finalMessage?: string;
}

interface RawCourse {
  id: string;
  cursantes: string[];
  unidades?: RawUnit[];
  examenFinal?: {
    introTexto?: string;
    ejercicios?: any[];
    videoUrl?: string;
  };
  capstone?: {
    videoUrl?: string;
    instrucciones?: string;
    checklist?: string[];
  };
  textoFinalCurso?: string;
  textoFinalCursoVideoUrl?: string;
  // ... otros campos
}

// --- 4. Progress State Types ---
interface ExerciseSnapshot {
  answers: Record<string, any>;
  order: Record<string, number[]>;
  matching: Record<string, Record<number, number | undefined>>; // { leftIdx: rightIdx }
}

interface EvaluationResult {
  allGood: boolean;
  correct: number;
  total: number;
}

interface LessonProgress {
  videoEnded?: boolean;
  exSubmitted?: boolean;
  exPassed?: boolean;
  score?: EvaluationResult | null;
  snapshot?: ExerciseSnapshot | null;
  timestamp?: Timestamp; // Firestore Timestamp
}

interface ProgressState {
  byLesson: Record<string, LessonProgress>;
  lastActive: {
    unitId: string | null;
    lessonId: string | null;
  };
}


/* =========================
   Helpers
   ========================= */

/** Build stable lesson key from unit + lesson IDs */
const buildKey = (unitId: string, lessonId: string): string =>
  `${unitId}::${lessonId}`;

/** Normalize course units -> lessons with safe defaults */
function normalizeUnits(course: RawCourse): Unit[] {
  const rawUnits: RawUnit[] = Array.isArray(course?.unidades)
    ? course.unidades
    : [];
  const units: Unit[] = rawUnits.map((u, idxU) => {
    const unitId = u?.id || `unit-${idxU + 1}`;
    const lessons: Lesson[] = [];

    // 1) Intro de unidad (si hay descripción)
    if (typeof u?.descripcion === "string" && u.descripcion.trim()) {
      const lessonId = `${unitId}-intro`;
      lessons.push({
        key: buildKey(unitId, lessonId),
        unitId,
        lessonId,
        id: lessonId,
        title: "Unit overview",
        type: "text", // se renderiza con el bloque de texto existente
        text: u.descripcion,
        videoUrl: "",
        pdfUrl: "",
        exercises: [],
        forceExercises: true, // permite “Submit” sin video/pdf
      } as TextLesson); // Type assertion for specific lesson type
    }

    // 2) Lecciones reales (como estaban)
    const rawLessons: RawLesson[] = Array.isArray(u?.lecciones)
      ? u.lecciones
      : [];
    rawLessons.forEach((l, idxL) => {
      const lessonId = l?.id || `lesson-${idxU + 1}-${idxL + 1}`;
      lessons.push({
        key: buildKey(unitId, lessonId),
        unitId,
        lessonId,
        id: lessonId,
        title: l?.titulo || `Lesson ${idxL + 1}`,
        type: "video",
        duration: u?.duracion || l?.duracion || null,
        videoUrl: l?.urlVideo || u?.urlVideo || "",
        thumbUrl: l?.urlImagen || u?.urlImagen || "",
        text: l?.texto || "",
        pdfUrl: l?.pdfUrl || "",
        exercises: Array.isArray(l?.ejercicios)
          ? (l.ejercicios.map((ex, k) => ({
              id: ex.id || `${lessonId}-ex-${k}`,
              ...ex,
            })) as Exercise[]) // Assuming exercise validation happens elsewhere
          : [],
        finalMessage: l?.finalMessage || "",
        forceExercises: false, // Default for video lessons
      } as VideoLesson);
    });

    // 3) Cierre de unidad (si hay textoCierre)
    if (typeof u?.textoCierre === "string" && u.textoCierre.trim()) {
      const lessonId = `${unitId}-closing`;
      lessons.push({
        key: buildKey(unitId, lessonId),
        unitId,
        lessonId,
        id: lessonId,
        title: "Unit closing",
        type: "text",
        text: u.textoCierre,
        videoUrl: "",
        pdfUrl: "",
        exercises: [],
        forceExercises: true,
      } as TextLesson);
    }

    return { id: unitId, title: u?.titulo || `Unit ${idxU + 1}`, lessons };
  });

  // ====== 4) Final Exam (si existe en el curso) ======
  const finalExam = course?.examenFinal;
  if (
    finalExam &&
    (finalExam.introTexto ||
      Array.isArray(finalExam.ejercicios) ||
      finalExam.videoUrl)
  ) {
    const unitId = "__finalExam";
    const lessonId = "__finalExam-lesson";
    units.push({
      id: unitId,
      title: "Final Exam",
      lessons: [
        {
          key: buildKey(unitId, lessonId),
          unitId,
          lessonId,
          id: lessonId,
          title: "Final Exam",
          type: "exam", // texto + ejercicios (video opcional)
          text: finalExam.introTexto || "",
          videoUrl: finalExam.videoUrl || "", // ✅ ahora soporta video opcional del examen
          pdfUrl: "",
          exercises: Array.isArray(finalExam.ejercicios)
            ? (finalExam.ejercicios.map((ex, k) => ({
                id: ex.id || `${lessonId}-ex-${k}`,
                ...ex,
              })) as Exercise[])
            : [],
          forceExercises: true, // el video es opcional; no bloquea ejercicios
        } as ExamLesson,
      ],
    });
  }

  // ====== 5) Capstone (si existe en el curso) ======
  const cap = course?.capstone;
  if (
    cap &&
    (cap.videoUrl || cap.instrucciones || Array.isArray(cap.checklist))
  ) {
    const unitId = "__capstone";
    const lessonId = "__capstone-lesson";
    units.push({
      id: unitId,
      title: "Capstone Project",
      lessons: [
        {
          key: buildKey(unitId, lessonId),
          unitId,
          lessonId,
          id: lessonId,
          title: "Capstone: video, instructions & submission",
          type: "capstone", // render especial
          videoUrl: cap.videoUrl || "",
          text: cap.instrucciones || "",
          checklist: Array.isArray(cap.checklist) ? cap.checklist : [],
          pdfUrl: "",
          exercises: [], // manejamos UI propia, no ExerciseRunner
          forceExercises: true, // muestra panel de acción sin requerir video
        } as CapstoneLesson,
      ],
    });
  }

  // ====== 6) Cierre final de curso ======
  if (
    typeof course?.textoFinalCurso === "string" ||
    course?.textoFinalCursoVideoUrl
  ) {
    const unitId = "__courseWrap";
    const lessonId = "__courseWrap-lesson";
    units.push({
      id: unitId,
      title: "Course Wrap-up",
      lessons: [
        {
          key: buildKey(unitId, lessonId),
          unitId,
          lessonId,
          id: lessonId,
          title: "Final course message",
          type: "text",
          text: course.textoFinalCurso || "",
          videoUrl: course.textoFinalCursoVideoUrl || "", // ✅ ahora puede traer video
          pdfUrl: "",
          exercises: [],
          forceExercises: true, // el cierre no bloquea avance
        } as TextLesson,
      ],
    });
  }

  return units;
}

/** Calculate completion percentage from a boolean map */
function calcPercentage(
  completedMap: Record<string, boolean>,
  totalLessons: number
): number {
  if (!totalLessons) return 0;
  const done = Object.values(completedMap || {}).filter(Boolean).length;
  return Math.min(100, Math.round((done / totalLessons) * 100));
}

/** Minimal structure for persistence */
const buildCourseStructure = (units: Unit[]): CourseStructureUnit[] =>
  units.map((u) => ({
    id: u.id,
    title: u.title,
    lessons: (u.lessons || []).map((l) => ({
      key: l.key,
      unitId: l.unitId,
      lessonId: l.lessonId,
      title: l.title,
      duration: l.duration || null,
      type: l.type || "video",
    })),
  }));

/** Stats derived from byLesson (PDF-friendly) */
const computeStats = (
  byLesson: Record<string, LessonProgress>,
  totalLessons: number,
  pdfKeySet: Set<string> = new Set()
) => {
  const entries = Object.entries(byLesson || {});
  const completed = entries.filter(
    ([k, v]) => v?.exSubmitted && (v?.videoEnded || pdfKeySet.has(k))
  ).length;
  const passed = entries.filter(([, v]) => v?.exPassed).length;
  const percentage =
    totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
  return { completedLessons: completed, passedLessons: passed, percentage };
};

/** Vimeo helpers */
function getVimeoId(input: string = ""): string | null {
  if (!input) return null;
  const s = String(input).trim();
  if (/^\d+$/.test(s)) return s;
  let m = s.match(/player\.vimeo\.com\/video\/(\d+)/);
  if (m?.[1]) return m[1];
  m = s.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
  if (m?.[1]) return m[1];
  return null;
}
function buildVimeoEmbedSrc(id: string): string {
  const params = new URLSearchParams({
    autopause: "1",
    title: "0",
    byline: "0",
    portrait: "0",
    controls: "1",
    keyboard: "0",
    pip: "0",
    dnt: "1",
    playsinline: "1",
    quality: "auto",
    app_id: "academy_player",
  });
  return `https://player.vimeo.com/video/${id}?${params.toString()}`;
}

/* ---------- PDF helpers (non-invasive) ---------- */

/** Quick http/https check */
function isHttpUrl(s: string | null | undefined): boolean {
  try {
    const u = new URL(String(s || ""));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Convert any PDF URL to an embeddable URL */
function toEmbedPdfUrl(raw: string | null | undefined): string {
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

/* =========================
   Exercise Runner (exposes snapshot())
   ========================= */

interface ExerciseRunnerProps {
  items: Exercise[];
  showCorrections: boolean;
  initialSnapshot: ExerciseSnapshot | null;
}

interface ExerciseRunnerRef {
  evaluate: () => EvaluationResult;
  snapshot: () => ExerciseSnapshot;
}

const ExerciseRunner = forwardRef<ExerciseRunnerRef, ExerciseRunnerProps>(
  function ExerciseRunner(
    { items = [], showCorrections = false, initialSnapshot = null },
    ref
  ) {
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [order, setOrder] = useState<Record<string, number[]>>({});
    const [matching, setMatching] = useState<
      Record<string, Record<number, number | undefined>>
    >({});

    // Cargar respuestas guardadas
    useEffect(() => {
      if (!initialSnapshot) return;
      setAnswers(initialSnapshot.answers || {});
      setOrder(initialSnapshot.order || {});
      setMatching(initialSnapshot.matching || {});
    }, [initialSnapshot]);

    /** Evaluate exercises -> { allGood, correct, total } */
    const evaluate = useCallback((): EvaluationResult => {
      const total = Array.isArray(items) ? items.length : 0;
      if (!total) return { allGood: true, correct: 0, total: 0 };

      let allGood = true;
      let correct = 0;

      for (const ex of items) {
        let ok = true;
        switch (ex.type) {
          case "multiple_choice": {
            const mcEx = ex as MultipleChoiceExercise;
            const v = answers[mcEx.id];
            ok = typeof v === "number" && v === mcEx.correctIndex;
            break;
          }
          case "true_false": {
            const tfEx = ex as TrueFalseExercise;
            const v = answers[tfEx.id];
            ok = typeof v === "boolean" && v === !!tfEx.answer;
            break;
          }
          case "text": {
            const v = (answers[ex.id] ?? "").toString().trim();
            ok = v.length > 0; // sin verificación de correcto a menos que proveas ex.answer
            break;
          }
          case "fill_blank": {
            const fbEx = ex as FillBlankExercise;
            const arr: string[] = Array.isArray(answers[fbEx.id])
              ? answers[fbEx.id]
              : [];
            const want = Array.isArray(fbEx.answers) ? fbEx.answers : [];
            ok =
              arr.length === want.length &&
              want.every(
                (w, i) =>
                  (arr[i] || "").trim().toLowerCase() ===
                  String(w || "")
                    .trim()
                    .toLowerCase()
              );
            break;
          }
          case "reorder": {
            const roEx = ex as ReorderExercise;
            const ord: number[] = Array.isArray(order[roEx.id])
              ? order[roEx.id]
              : roEx.items?.map((_, idx) => idx) || [];
            const want = Array.isArray(roEx.correctOrder)
              ? roEx.correctOrder
              : [];
            ok =
              ord.length === want.length &&
              ord.every((n, i) => n === want[i]);
            break;
          }
          case "matching": {
            const mEx = ex as MatchingExercise;
            const map = matching[mEx.id] || {};
            ok = (mEx.pairs || []).every((p, i) => {
              const rightIdx = map[i];
              if (rightIdx == null) return false;
              const right = (mEx.pairs || [])[rightIdx]?.right;
              return (right || "").trim() === (p.right || "").trim();
            });
            break;
          }
          default:
            ok = true;
        }
        if (ok) correct += 1;
        else allGood = false;
      }
      return { allGood, correct, total };
    }, [items, answers, order, matching]);

    /** Snapshot user answers for persistence */
    const snapshot = useCallback((): ExerciseSnapshot => {
      const snap: ExerciseSnapshot = { answers, order, matching };
      return snap;
    }, [answers, order, matching]);

    // Expose evaluate() and snapshot() to parent
    useImperativeHandle(ref, () => ({ evaluate, snapshot }), [
      evaluate,
      snapshot,
    ]);

    const ReviewRow: React.FC<{ label: string; children: ReactNode }> = ({
      label,
      children,
    }) => (
      <div className="text-xs text-slate-300 flex gap-2">
        <span className="min-w-[110px] text-slate-400">{label}</span>
        <div className="flex-1">{children}</div>
      </div>
    );

    return (
      <div className="space-y-4">
        <>
        {items.length === 0 && (
          <div className="text-slate-400 text-sm">
            This lesson has no exercises.
          </div>
        )}
        {items.map((ex, idx) => {
  const userVal = answers[ex.id];
  const baseCard = "p-4 rounded-lg border border-slate-800 bg-slate-900";

  return (
    <div key={ex.id} className={baseCard}>
      <div className="text-slate-200 font-semibold mb-2">
        {idx + 1}. {ex.title || ex.question || ex.statement || ex.prompt || "Exercise"}
      </div>

      {/* Multiple choice */}
      {ex.type === "multiple_choice" && (() => {
        const mcEx = ex as MultipleChoiceExercise;
        return (
          <>
            <div className="space-y-2">
              {mcEx.options?.map((opt, i) => {
                const selected = userVal === i;
                const isCorrect = showCorrections && i === mcEx.correctIndex;
                const isWrongSel = showCorrections && selected && i !== mcEx.correctIndex;
                const base = "w-full text-left px-3 py-2 rounded border transition";
                const cls = isCorrect
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                  : isWrongSel
                  ? "border-red-500 bg-red-500/10 text-red-300"
                  : selected
                  ? "border-yellow-400 bg-yellow-400/10 text-yellow-300"
                  : "border-slate-700 hover:bg-slate-800";
                return (
                  <button
                    key={i}
                    onClick={() =>
                      !showCorrections && setAnswers((a) => ({ ...a, [mcEx.id]: i }))
                    }
                    className={`${base} ${cls}`}
                    disabled={showCorrections}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {showCorrections && (
              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                <div className="font-semibold text-slate-200 mb-2">Answer review</div>
                <ReviewRow label="Your answer:">
                  <span
                    className={
                      userVal === mcEx.correctIndex ? "text-emerald-300" : "text-red-300"
                    }
                  >
                    {Number.isInteger(userVal)
                      ? mcEx.options?.[userVal] ?? "—"
                      : "—"}
                  </span>
                </ReviewRow>
                <ReviewRow label="Correct answer:">
                  <span className="text-emerald-300">
                    {Number.isInteger(mcEx.correctIndex)
                      ? mcEx.options?.[mcEx.correctIndex] ?? "—"
                      : "—"}
                  </span>
                </ReviewRow>
              </div>
            )}
          </>
        );
      })()}

      {/* True/False */}
      {ex.type === "true_false" && (() => {
        const tfEx = ex as TrueFalseExercise;
        return (
          <>
            <div className="flex gap-2">
              {[true, false].map((val) => {
                const selected = userVal === val;
                const isCorrect = showCorrections && val === !!tfEx.answer;
                const isWrongSel = showCorrections && selected && val !== !!tfEx.answer;
                const base = "px-3 py-2 rounded border transition";
                const cls = isCorrect
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                  : isWrongSel
                  ? "border-red-500 bg-red-500/10 text-red-300"
                  : selected
                  ? "border-yellow-400 bg-yellow-400/10 text-yellow-300"
                  : "border-slate-700 hover:bg-slate-800";
                return (
                  <button
                    key={String(val)}
                    onClick={() =>
                      !showCorrections && setAnswers((a) => ({ ...a, [tfEx.id]: val }))
                    }
                    className={`${base} ${cls}`}
                    disabled={showCorrections}
                  >
                    {val ? "True" : "False"}
                  </button>
                );
              })}
            </div>

            {showCorrections && (
              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                <div className="font-semibold text-slate-200 mb-2">Answer review</div>
                <ReviewRow label="Your answer:">
                  <span
                    className={
                      userVal === !!tfEx.answer ? "text-emerald-300" : "text-red-300"
                    }
                  >
                    {typeof userVal === "boolean"
                      ? userVal
                        ? "True"
                        : "False"
                      : "—"}
                  </span>
                </ReviewRow>
                <ReviewRow label="Correct answer:">
                  <span className="text-emerald-300">
                    {!!tfEx.answer ? "True" : "False"}
                  </span>
                </ReviewRow>
              </div>
            )}
          </>
        );
      })()}

      {/* Long text */}
      {ex.type === "text" && (() => {
        const textEx = ex as TextExercise;
        return (
          <>
            <textarea
              rows={4}
              placeholder="Type your answer..."
              className={`w-full rounded bg-slate-800 border p-3 outline-none ${
                showCorrections
                  ? "border-slate-700"
                  : "border-slate-700 focus:border-yellow-400"
              }`}
              value={answers[textEx.id] || ""}
              onChange={(e) =>
                !showCorrections &&
                setAnswers((a) => ({ ...a, [textEx.id]: e.target.value }))
              }
              disabled={showCorrections}
            />
            {showCorrections && (
              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                <div className="font-semibold text-slate-200 mb-2">Answer review</div>
                <ReviewRow label="Your answer:">
                  <div className="whitespace-pre-wrap">
                    {(answers[textEx.id] || "").toString() || "—"}
                  </div>
                </ReviewRow>
                {textEx.answer != null && (
                  <ReviewRow label="Correct answer:">
                    <div className="whitespace-pre-wrap text-emerald-300">
                      {String(textEx.answer)}
                    </div>
                  </ReviewRow>
                )}
              </div>
            )}
          </>
        );
      })()}

      {/* Fill in the blanks */}
      {ex.type === "fill_blank" && (() => {
        const fbEx = ex as FillBlankExercise;
        const showHeader = !!(fbEx.title || fbEx.hintWords);
        return (
          <>
            {showHeader && (
              <div className="mb-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                {fbEx.title && (
                  <div className="text-sm font-semibold text-slate-200 mb-2">
                    {fbEx.title}
                  </div>
                )}
                {fbEx.hintWords && String(fbEx.hintWords).trim() && (
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Word bank</div>
                    <div className="flex flex-wrap gap-1.5">
                      {String(fbEx.hintWords)
                        .split(",")
                        .map((w) => w.trim())
                        .filter(Boolean)
                        .map((w, i) => (
                          <span
                            key={`${fbEx.id}-hint-${i}`}
                            className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800/80 text-slate-200 text-[11px]"
                          >
                            {w}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Frase con inputs embebidos y compactos */}
            <div className="space-y-2">
              {(() => {
                const parts = String(fbEx.sentence || "").split("***");
                const blanks = (fbEx.sentence?.match(/\*\*\*/g) || []).length;
                const current: string[] = Array.isArray(answers[fbEx.id])
                  ? answers[fbEx.id].slice()
                  : Array.from({ length: blanks }).map(() => "");

                const setAt = (idx: number, v: string) => {
                  if (showCorrections) return;
                  const arr: string[] = Array.isArray(answers[fbEx.id])
                    ? answers[fbEx.id].slice()
                    : Array.from({ length: blanks }).map(() => "");
                  arr[idx] = v;
                  setAnswers((a) => ({ ...a, [fbEx.id]: arr }));
                };

                const want = Array.isArray(fbEx.answers) ? fbEx.answers : [];

                return (
                  <>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-slate-200 leading-7">
                      {parts.map((chunk, i) => {
                        const isLast = i === parts.length - 1;
                        const basis = ((current[i] ?? want[i] ?? "") as string)
                          .toString()
                          .trim();
                        const size = Math.max(4, Math.min(16, basis.length + 1));
                        return (
                          <span key={`${fbEx.id}-chunk-${i}`}>
                            {chunk}
                            {!isLast && (
                              <input
                                aria-label={`Blank #${i + 1}`}
                                placeholder={`#${i + 1}`}
                                size={size}
                                className={`align-baseline inline-block h-8 px-2 py-0.5 text-sm rounded-md bg-slate-800/90 border outline-none transition ${
                                  showCorrections
                                    ? "border-slate-700"
                                    : "border-slate-700 focus:border-yellow-400"
                                }`}
                                value={current[i] || ""}
                                onChange={(e) => setAt(i, e.target.value)}
                                disabled={showCorrections}
                              />
                            )}
                          </span>
                        );
                      })}
                    </div>

                    {showCorrections && blanks > 0 && (
                      <div className="mt-2 space-y-1">
                        {Array.from({ length: blanks }).map((_, i) => {
                          const val = (answers[fbEx.id] || [])[i] ?? "";
                          const target = String(want[i] || "");
                          const ok =
                            val.toString().trim().toLowerCase() ===
                            target.trim().toLowerCase();
                          return (
                            <div key={`${fbEx.id}-rev-${i}`} className="text-xs">
                              <span className="text-slate-400 mr-2">
                                Blank #{i + 1}
                              </span>
                              <span
                                className={ok ? "text-emerald-300" : "text-red-300"}
                              >
                                {val || "—"}
                              </span>
                              <span className="text-slate-400 mx-2">/</span>
                              <span className="text-emerald-300">{target}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </>
        );
      })()}

      {/* Reorder */}
      {ex.type === "reorder" && (() => {
        const roEx = ex as ReorderExercise;
        return (
          <>
            <div className="space-y-2">
              {(() => {
                const current: number[] = Array.isArray(order[roEx.id])
                  ? order[roEx.id]
                  : roEx.items?.map((_, idx) => idx) || [];
                const setCurrent = (next: number[]) =>
                  setOrder((o) => ({ ...o, [roEx.id]: next }));
                const moveLocal = (
                  arr: number[],
                  from: number,
                  to: number
                ): number[] => {
                  const copy = arr.slice();
                  const item = copy.splice(from, 1)[0];
                  copy.splice(to, 0, item);
                  return copy;
                };
                return (
                  <ul className="space-y-2">
                    {current.map((idxItem, pos) => (
                      <li
                        key={`${roEx.id}-${idxItem}`}
                        className="flex items-center gap-2"
                      >
                        <div className="flex-1 px-3 py-2 rounded border bg-slate-800 border-slate-700">
                          {roEx.items?.[idxItem]}
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            aria-label="Move up"
                            onClick={() =>
                              !showCorrections &&
                              pos > 0 &&
                              setCurrent(
                                moveLocal(current, pos, pos - 1)
                              )
                            }
                            className="p-2 rounded border border-slate-700 hover:bg-slate-800 disabled:opacity-50"
                            disabled={showCorrections}
                          >
                            <FiArrowUp />
                          </button>
                          <button
                            aria-label="Move down"
                            onClick={() =>
                              !showCorrections &&
                              pos < current.length - 1 &&
                              setCurrent(
                                moveLocal(current, pos, pos + 1)
                              )
                            }
                            className="p-2 rounded border border-slate-700 hover:bg-slate-800 disabled:opacity-50"
                            disabled={showCorrections}
                          >
                            <FiArrowDown />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>

            {showCorrections && (
              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                <div className="font-semibold text-slate-200 mb-2">
                  Answer review
                </div>
                {(() => {
                  const yourIdxs: number[] = Array.isArray(
                    order[roEx.id]
                  )
                    ? order[roEx.id]
                    : roEx.items?.map((_, i) => i) || [];
                  const correctIdxs: number[] = Array.isArray(
                    roEx.correctOrder
                  )
                    ? roEx.correctOrder
                    : [];
                  const your: (string | undefined)[] = yourIdxs.map(
                    (i) => roEx.items?.[i]
                  );
                  const correct: (string | undefined)[] =
                    correctIdxs.map((i) => roEx.items?.[i]);
                  const ok =
                    yourIdxs.length === correctIdxs.length &&
                    yourIdxs.every((n, i) => n === correctIdxs[i]);

                  return (
                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-slate-400 mb-1">
                          Your order
                        </div>
                        <ol className="list-decimal list-inside space-y-1">
                          {your.map((t, i) => (
                            <li
                              key={i}
                              className={
                                ok
                                  ? "text-emerald-300"
                                  : "text-slate-200"
                              }
                            >
                              {t}
                            </li>
                          ))}
                        </ol>
                      </div>
                      <div>
                        <div className="text-slate-400 mb-1">
                          Correct order
                        </div>
                        <ol className="list-decimal list-inside space-y-1">
                          {correct.map((t, i) => (
                            <li key={i} className="text-emerald-300">
                              {t}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        );
      })()}

      {/* Matching */}
      {ex.type === "matching" && (() => {
        const mEx = ex as MatchingExercise;
        return (
          <>
            <div className="space-y-3">
              {(mEx.pairs || []).map((p, leftIdx) => {
                const rights = (mEx.pairs || []).map((q, i) => ({
                  label: q.right,
                  value: i,
                }));
                const selected: number | string =
                  (matching[mEx.id] || {})[leftIdx] ?? "";
                const isCorrect =
                  showCorrections &&
                  Number.isInteger(selected) &&
                  (
                    mEx.pairs?.[selected as number]?.right || ""
                  ).trim() === (p.right || "").trim();
                return (
                  <div
                    key={leftIdx}
                    className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center"
                  >
                    <div
                      className={`text-sm rounded px-3 py-2 border ${
                        isCorrect
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-300"
                          : "bg-slate-800 border-slate-700"
                      }`}
                    >
                      {p.left}
                    </div>
                    <select
                      className={`rounded px-3 py-2 outline-none border ${
                        showCorrections
                          ? "bg-slate-800 border-slate-700"
                          : "bg-slate-800 border-slate-700 focus:border-yellow-400"
                      }`}
                      value={selected}
                      onChange={(e) => {
                        if (showCorrections) return;
                        const next = { ...(matching[mEx.id] || {}) };
                        next[leftIdx] =
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value);
                        setMatching((m) => ({ ...m, [mEx.id]: next }));
                      }}
                      disabled={showCorrections}
                    >
                      <option value="">Select a match</option>
                      {rights.map((r) => (
                        <option
                          key={r.value}
                          value={r.value}
                          disabled={
                            showCorrections // Deshabilitar si se está revisando (aunque el select ya está deshabilitado, esto es un extra)
                          }
                        >
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            {showCorrections && (
              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                <div className="font-semibold text-slate-200 mb-2">
                  Answer review
                </div>
                <div className="text-xs space-y-1">
                  {(mEx.pairs || []).map((p, i) => {
                    const selIdx =
                      (matching[mEx.id] || {})[i] ?? undefined;
                    const yourRight = Number.isInteger(selIdx)
                      ? mEx.pairs?.[selIdx as number]?.right
                      : "";
                    const ok =
                      (yourRight || "").trim() === (p.right || "").trim();
                    return (
                      <div key={i} className="flex flex-wrap gap-2">
                        <span className="text-slate-400">{p.left}</span>
                        <span
                          className={
                            ok ? "text-emerald-300" : "text-red-300"
                          }
                        >
                          {yourRight || "—"}
                        </span>
                        <span className="text-slate-400">/</span>
                        <span className="text-emerald-300">
                          {p.right}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );

      
      
      })}
    </>
  </div>
);
});

        
  

        




              

/* =========================
   Unit Accordion
   ========================= */

interface UnitAccordionProps {
  unit: Unit;
  unitIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  activeU: number;
  activeL: number;
  completedLessons: Record<string, boolean>;
  onLessonClick: (unitIndex: number, lIdx: number, isLocked: boolean) => void;
  isLocked: (uIdx: number, lIdx: number) => boolean;
  lessonNumberMap: Record<string, string>;
}

const UnitAccordion: React.FC<UnitAccordionProps> = ({
  unit,
  unitIndex,
  isExpanded,
  onToggle,
  activeU,
  activeL,
  completedLessons,
  onLessonClick,
  isLocked,
  lessonNumberMap, // <-- nuevo: mapa "U.L" por lección
}) => {
  // progreso por unidad (no cambia)
  const completedInUnit = unit.lessons.filter(
    (l) => completedLessons[l.key]
  ).length;
  const totalInUnit = unit.lessons.length;
  const unitProgress =
    totalInUnit > 0 ? Math.round((completedInUnit / totalInUnit) * 100) : 0;

  return (
    <div className="mb-2">
      {/* Header de unidad con badge U# */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-3 text-left rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Badge de unidad: "U1", "U2", ... */}
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-300">
            U{unitIndex + 1}
          </span>

          {/* Chevron + título */}
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <FiChevronDown size={16} />
            ) : (
              <FiChevronRight size={16} />
            )}
            <span className="font-semibold text-slate-200">{unit.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {completedInUnit}/{totalInUnit}
          </span>
          <div className="w-12 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400 rounded-full transition-all"
              style={{ width: `${unitProgress}%` }}
            />
          </div>
        </div>
      </button>

      {/* Lista de lecciones */}
      {isExpanded && (
        <div className="mt-2 ml-4 space-y-1">
          {unit.lessons.map((lesson, lIdx) => {
            const isActive = unitIndex === activeU && lIdx === activeL;
            const isDone = !!completedLessons[lesson.key];
            const locked = isLocked(unitIndex, lIdx);

            // Número "U.L" solo si es lección contable (type === "video")
            const numLabel = lessonNumberMap?.[lesson.key] || null;

            return (
              <button
                key={lesson.key}
                onClick={() => onLessonClick(unitIndex, lIdx, locked)}
                disabled={locked}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                  isActive
                    ? "bg-yellow-400/10 text-yellow-300 border border-yellow-400/30"
                    : locked
                    ? "text-slate-500 cursor-not-allowed bg-slate-800/30"
                    : "hover:bg-slate-800/60 text-slate-300"
                }`}
                title={
                  locked
                    ? "Locked until the previous lesson is completed."
                    : ""
                }
              >
                {/* Columna fija para numeración: ocupa lugar aunque no haya número, para alinear */}
                <span
                  className={`w-10 shrink-0 text-[11px] font-semibold text-center rounded ${
                    numLabel
                      ? "text-slate-200 bg-slate-800 border border-slate-700"
                      : "text-slate-600"
                  }`}
                >
                  {numLabel || ""}
                </span>
                {/* Estado (done/lock/active) */}
                <span
                  className={`grid place-items-center w-5 h-5 rounded-full border ${
                    isDone
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : locked
                      ? "border-slate-700 text-slate-600"
                      : isActive
                      ? "border-yellow-400 text-yellow-400"
                      : "border-slate-600 text-slate-500"
                  }`}
                >
                  {isDone ? (
                    <FiCheckCircle size={12} />
                  ) : locked ? (
                    <FiLock size={12} />
                  ) : isActive ? (
                    <FiPlay size={10} />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  )}
                </span>
                {/* Título */}
                <span className="flex-1 min-w-0 text-sm font-medium line-clamp-1">
                  {lesson.title}
                </span>
                {/* Duración si existe */}
                {lesson.duration && (
                  <span className="text-xs text-slate-400 inline-flex items-center gap-1">
                    <FiClock size={12} /> {lesson.duration}m
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ========================= Page ========================= */
export default function CoursePlayerPage() {
  const params = useParams();
  const courseId = params?.id?.toString?.() || "";
  const router = useRouter();
  const { firestore, storage, usuario, cursos, verificarLogin } =
    useContext(ContextGeneral); // Type is inferred or defined above

  const [loading, setLoading] = useState(() => usuario === undefined);
  const [course, setCourse] = useState<RawCourse | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [activeU, setActiveU] = useState(0);
  const [activeL, setActiveL] = useState(0);
  const [expandedUnits, setExpandedUnits] = useState<Record<number, boolean>>(
    {}
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Single progress + answers local state
  const [progressState, setProgressState] = useState<ProgressState>({
    byLesson: {},
    lastActive: { unitId: null, lessonId: null },
  });
  const [initialProgressReady, setInitialProgressReady] = useState(false);
  const initialProgressRef = useRef<ProgressState | null>(null);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState("");
  const [vimeoApiReady, setVimeoApiReady] = useState(false);
  const [capChecklist, setCapChecklist] = useState<Record<string, boolean>>({});
  const [capDriveLink, setCapDriveLink] = useState("");
  const [showDriveHelp, setShowDriveHelp] = useState(false); // popup de ayuda

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const vimeoPlayerRef = useRef<any | null>(null); // Vimeo Player object is complex, using any/null
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const appliedInitialPosRef = useRef(false);
  const maxReachedRef = useRef(0);
  const progressRef = useRef<ProgressState | null>(null);
  progressRef.current = progressState;

  // PDF modal open/close state
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  /**
   * If the Vimeo script was already loaded elsewhere (first visit),
   * Next.js won't call onLoad again on this route. Detect it and mark ready.
   */
  useEffect(() => {
    // Check synchronously on mount
    if (
      typeof window !== "undefined" &&
      (window as any)?.Vimeo?.Player // Type assertion for window.Vimeo
    ) {
      setVimeoApiReady(true);
    }
  }, []);

  // Close on ESC and lock scroll while modal is open
  useEffect(() => {
    if (!pdfModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPdfModalOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev || "auto";
    };
  }, [pdfModalOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "auto";
    };
  }, [mobileNavOpen]);

  // UI flags (derived)
  const [videoEnded, setVideoEnded] = useState(false);
  const [exSubmitted, setExSubmitted] = useState(false);
  const [exPassed, setExPassed] = useState(false);
  const [lastScore, setLastScore] = useState<EvaluationResult | null>(null);
  const exerciseRef = useRef<ExerciseRunnerRef | null>(null);

  // Ensure auth context is loaded/check session
  useEffect(() => {
    // Solo verifico si el contexto aún no resolvió al usuario.
    if (usuario === undefined) {
      verificarLogin?.();
    }
  }, [usuario, verificarLogin]);

  // Find selected course from context list
  const foundCourse: RawCourse | null = useMemo(() => {
    if (!Array.isArray(cursos)) return null;
    return cursos.find((c) => c?.id === courseId) || null;
  }, [cursos, courseId]);

  // Ownership guard (email must be in course.cursantes and courseId in user acquisitions)
  const ownership = useMemo(() => {
    const email = usuario?.email;
    const adquiridos = usuario?.cursosAdquiridos || [];
    const idOk = !!courseId && adquiridos.includes(courseId);
    const emailOk =
      !!email &&
      Array.isArray(foundCourse?.cursantes) &&
      foundCourse.cursantes.includes(email);
    return { idOk, emailOk };
  }, [usuario, foundCourse, courseId]);

  /* ========================= Load initial progress ========================= */
  const loadInitialProgress = useCallback(async () => {
    if (!firestore || !usuario?.email || !courseId) return;
    try {
      // 1) Read from main user doc map field
      const userRef = doc(firestore, "alumnos", usuario.email);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        const entry = data?.progress?.[courseId];
        if (entry?.progress?.byLesson) {
          const loaded: ProgressState = {
            byLesson: entry.progress.byLesson || {},
            lastActive: entry.progress.lastActive || {
              unitId: null,
              lessonId: null,
            },
          };
          setProgressState(loaded);
          initialProgressRef.current = loaded;
          setInitialProgressReady(true);
          return;
        }
      }

      // 2) Legacy fallback
      const legacyRef = doc(
        firestore,
        "alumnos",
        usuario.email,
        "progress",
        courseId
      );
      const legacySnap = await getDoc(legacyRef);
      if (legacySnap.exists()) {
        const legacy = legacySnap.data();
        if (legacy?.progress?.byLesson) {
          const loaded: ProgressState = {
            byLesson: legacy.progress.byLesson || {},
            lastActive: legacy.progress.lastActive || {
              unitId: null,
              lessonId: null,
            },
          };
          setProgressState(loaded);
          initialProgressRef.current = loaded;
          setInitialProgressReady(true);
          return;
        }
      }
    } catch (e) {
      console.error("Error loading progress:", e);
    } finally {
      if (!initialProgressRef.current) {
        const empty: ProgressState = {
          byLesson: {},
          lastActive: { unitId: null, lessonId: null },
        };
        setProgressState(empty);
        initialProgressRef.current = empty;
        setInitialProgressReady(true);
      }
    }
  }, [firestore, usuario?.email, courseId]);

  // Boot sequence: guards + load
  useEffect(() => {
    if (!courseId) return;
    if (usuario === undefined) return;
    if (!usuario?.email) {
      toast.error("Sign in to access the course.");
      router.push("/");
      return;
    }
    if (!foundCourse) {
      toast.error("Course not found.");
      setLoading(false);
      return;
    }
    if (!ownership.idOk || !ownership.emailOk) {
      toast.error("You don't have access to this course.");
      setLoading(false);
      return;
    }
    setCourse(foundCourse);
    const normalizedUnits = normalizeUnits(foundCourse);
    setUnits(normalizedUnits);
    if (normalizedUnits.length > 0) setExpandedUnits({ 0: true });
    (async () => {
      await loadInitialProgress();
      setLoading(false);
    })();
  }, [usuario, foundCourse, ownership, router, courseId, loadInitialProgress]);

  /* ---------- Flatten helpers ---------- */
  const flatLessons: {
    uIdx: number;
    lIdx: number;
    key: string;
    unitId: string;
    lessonId: string;
  }[] = useMemo(() => {
    const arr: {
      uIdx: number;
      lIdx: number;
      key: string;
      unitId: string;
      lessonId: string;
    }[] = [];
    units.forEach((u, uIdx) =>
      (u.lessons || []).forEach((l, lIdx) =>
        arr.push({ uIdx, lIdx, key: l.key, unitId: u.id, lessonId: l.lessonId })
      )
    );
    return arr;
  }, [units]);

  // --- Countable lesson helper: only "real" lessons (video) are numbered ---
  const isCountableLesson = (l: Lesson): boolean => l && l.type === "video";

  // --- Build { [lesson.key]: "U.L" } map like "1.3" ---
  const lessonNumberMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    units.forEach((u, ui) => {
      let counter = 1;
      (u.lessons || []).forEach((l) => {
        if (isCountableLesson(l)) {
          map[l.key] = `${ui + 1}.${counter}`; // e.g., "1.1"
          counter += 1;
        }
      });
    });
    return map;
  }, [units]);

  const pdfKeySet: Set<string> = useMemo(() => {
    const set = new Set<string>();
    units.forEach((u) =>
      (u.lessons || []).forEach((l) => {
        if (isHttpUrl(l?.pdfUrl || "")) set.add(l.key);
      })
    );
    return set;
  }, [units]);

  const indexOfLesson = useCallback(
    (uIdx: number, lIdx: number): number => {
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

  // Derived: map of completed lessons from progress state
  const completedLessons: Record<string, boolean> = useMemo(() => {
    const map: Record<string, boolean> = {};
    Object.entries(progressState.byLesson || {}).forEach(([k, v]) => {
      map[k] = !!(v?.exSubmitted && (v?.videoEnded || pdfKeySet.has(k)));
    });
    return map;
  }, [progressState.byLesson, pdfKeySet]);

  // Sequential locking based on previous completions
  const isLocked = useCallback(
    (uIdx: number, lIdx: number): boolean => {
      const targetIdx = indexOfLesson(uIdx, lIdx);
      if (targetIdx === 0) return false;
      for (let k = 0; k < targetIdx; k++) {
        const prev = flatLessons[k];
        if (!prev || !completedLessons[prev.key]) return true;
      }
      return false;
    },
    [flatLessons, indexOfLesson, completedLessons]
  );

  // Find first playable (not completed) lesson index
  const firstPlayableIndex: number = useMemo(() => {
    for (let i = 0; i < flatLessons.length; i++) {
      const l = flatLessons[i];
      if (!completedLessons[l.key]) return i;
    }
    return flatLessons.length ? flatLessons.length - 1 : 0;
  }, [flatLessons, completedLessons]);

  // Restore lastActive pointer if valid; otherwise go to first playable
  const findIndicesByIds = useCallback(
    (unitId: string | null, lessonId: string | null): { uIdx: number; lIdx: number } => {
      const uIdx = units.findIndex((u) => u.id === unitId);
      if (uIdx < 0) return { uIdx: -1, lIdx: -1 };
      const lIdx = (units[uIdx]?.lessons || []).findIndex(
        (l) => l.lessonId === lessonId
      );
      return { uIdx, lIdx };
    },
    [units]
  );

  useEffect(() => {
    if (appliedInitialPosRef.current) return;
    if (!units.length) return;
    if (!initialProgressReady) return;

    // Siempre ir a la ÚLTIMA lección disponible (la más lejana desbloqueada)
    const i = firstPlayableIndex;
    const entry = flatLessons[i] || flatLessons[flatLessons.length - 1] || null;

    if (entry) {
      setActiveU(entry.uIdx);
      setActiveL(entry.lIdx);
      setExpandedUnits((prev) => ({ ...prev, [entry.uIdx]: true }));
    } else {
      setActiveU(0);
      setActiveL(0);
      setExpandedUnits((prev) => ({ ...prev, 0: true }));
    }
    appliedInitialPosRef.current = true;
  }, [units, initialProgressReady, firstPlayableIndex, flatLessons]);

  /* ---------- Active lesson ---------- */
  const activeLesson: Lesson | null = useMemo(
    () => units[activeU]?.lessons?.[activeL] || null,
    [units, activeU, activeL]
  );

  // Sync UI flags from progress state when active lesson changes
  useEffect(() => {
    const key = activeLesson?.key || "";
    setVideoEnded(!!progressRef.current?.byLesson?.[key]?.videoEnded);
    const s = progressRef.current?.byLesson?.[key];
    setExSubmitted(!!s?.exSubmitted);
    setExPassed(!!s?.exPassed);
    setLastScore(s?.score || null);
    maxReachedRef.current = 0;
  }, [activeLesson?.key, progressState.byLesson]);

  // ... (Previous code ends here, before the Save Progress section)

  /* ========================= Save Progress ========================= */

  // Save the full state to Firestore
  const saveProgress = useCallback(
    async (
      lessonKey: string,
      update: Partial<LessonProgress>,
      snapshot: ExerciseSnapshot | null = null
    ) => {
      if (!firestore || !usuario?.email || !courseId) {
        toast.error("Cannot save progress: session or Firestore missing.");
        return;
      }
      const now = serverTimestamp();
      const currentProgress = progressRef.current?.byLesson?.[lessonKey] || {};

      // 1. Merge the new update with existing progress
      const nextProgress: LessonProgress = {
        ...currentProgress,
        ...update,
        timestamp: now as unknown as Timestamp, // El objeto Timestamp se tipa así en React/TS
      };

      // If a snapshot is provided, override the existing one
      if (snapshot) {
        nextProgress.snapshot = snapshot;
      }

      const nextByLesson = {
        ...(progressRef.current?.byLesson || {}),
        [lessonKey]: nextProgress,
      };

      const { unitId, lessonId } = activeLesson || {};
      const nextState: ProgressState = {
        byLesson: nextByLesson,
        lastActive: { unitId: unitId || null, lessonId: lessonId || null },
      };

      // 2. Compute overall stats for certificate/display
      // Solo contamos lecciones "contables" (type: "video") para el progreso.
      const totalLessons = flatLessons.filter((l) => isCountableLesson(units[l.uIdx].lessons[l.lIdx])).length;

      const { completedLessons, passedLessons, percentage } = computeStats(
        nextByLesson,
        totalLessons,
        pdfKeySet
      );

      // 3. Build minimal course structure for persistence metadata
      const courseStructure = buildCourseStructure(units);

      // 4. Update local state immediately
      setProgressState(nextState);

      // 5. Write to Firestore (main user doc)
      const userRef = doc(firestore, "alumnos", usuario.email);
      const data = {
        progress: {
          [courseId]: {
            lastUpdate: now,
            progress: nextState,
            stats: { completedLessons, passedLessons, percentage, totalLessons },
            courseStructure: courseStructure,
            courseTitle: course?.title || 'Unknown Course',
          },
        },
      };

      try {
        await setDoc(userRef, data, { merge: true });
      } catch (e) {
        console.error("Error saving progress:", e);
        toast.error("Failed to save progress. Please try again.");
      }
    },
    [firestore, usuario?.email, courseId, activeLesson, flatLessons, units, course?.title, pdfKeySet]
  );

  /* ========================= Navigation ========================= */

  // Navigates to a specific lesson, updating UI state
  const goToLesson = useCallback(
    (uIdx: number, lIdx: number) => {
      if (uIdx < 0 || lIdx < 0 || uIdx >= units.length) return;
      const lesson = units[uIdx]?.lessons?.[lIdx];
      if (!lesson) return;

      setActiveU(uIdx);
      setActiveL(lIdx);
      setMobileNavOpen(false); // Close mobile menu

      // Ensure the target unit is expanded
      setExpandedUnits((prev) => ({ ...prev, [uIdx]: true }));

      // Reset PDF modal state
      setPdfModalOpen(false);

      // On navigation, check if the current lesson had an unsaved snapshot (answers in exercises)
      const currentKey = activeLesson?.key;
      const currentLessonProgress = progressRef.current?.byLesson?.[currentKey];

      // Only save snapshot if it was text/video and exercises were NOT submitted
      if (currentKey && exerciseRef.current && !currentLessonProgress?.exSubmitted) {
        const snapshot = exerciseRef.current.snapshot();
        // Check if there are any answers to save
        const hasAnswers = Object.keys(snapshot.answers).length > 0 || Object.keys(snapshot.order).length > 0 || Object.keys(snapshot.matching).length > 0;
        if (hasAnswers) {
          saveProgress(currentKey, {}, snapshot);
        }
      }
    },
    [units, activeLesson, saveProgress]
  );

  // Navigates to the next lesson in the sequence
  const goToNextLesson = useCallback(() => {
    const nextIdx = indexOfLesson(activeU, activeL) + 1;
    const nextLesson = flatLessons[nextIdx];
    if (nextLesson) {
      goToLesson(nextLesson.uIdx, nextLesson.lIdx);
    } else {
      toast.info("You have completed all lessons in this course! 🎉");
      // Optional: Redirect to a certificate page or dashboard
      // router.push(`/course-complete/${courseId}`);
    }
  }, [activeU, activeL, indexOfLesson, flatLessons, goToLesson]);

  /* ========================= Lesson Handlers ========================= */

  // Handler for when the Vimeo player sends the 'ended' event
  const handleVimeoEnded = useCallback(() => {
    if (!activeLesson) return;
    setVideoEnded(true); // Update UI
    saveProgress(activeLesson.key, { videoEnded: true }); // Persist state
    toast.success("Video completed! You can now submit the exercises.");
  }, [activeLesson, saveProgress]);

  // Handler for video time update (to prevent fast-forwarding)
  const handleVideoTimeUpdate = useCallback(
    (time: number) => {
      if (!activeLesson || (!vimeoPlayerRef.current && !videoRef.current)) return;

      // Only apply fast-forward block to video lessons without forceExercises
      if (activeLesson.type === "video" && !activeLesson.forceExercises) {
        if (time > maxReachedRef.current + 5 && maxReachedRef.current > 10) {
          // If jump is more than 5 seconds from the max point reached, seek back
          if (vimeoPlayerRef.current) {
             vimeoPlayerRef.current.setCurrentTime(maxReachedRef.current);
          } else if (videoRef.current) {
             videoRef.current.currentTime = maxReachedRef.current;
          }

          toast.warning("Fast-forwarding is disabled.");
        } else {
          maxReachedRef.current = Math.max(maxReachedRef.current, time);
        }
      }
    },
    [activeLesson]
  );

  // Handler for submitting exercises (main action button)
  const handleSubmitExercises = useCallback(() => {
    if (!activeLesson || !exerciseRef.current) return;
    const key = activeLesson.key;

    // Check pre-requisites
    if (!videoEnded && !pdfKeySet.has(key) && !activeLesson.forceExercises) {
      toast.error("Please complete the video/read the PDF before submitting.");
      return;
    }

    // 1. Evaluate user answers
    const score = exerciseRef.current.evaluate();
    const snapshot = exerciseRef.current.snapshot();

    // 2. Update UI states
    setExSubmitted(true);
    setLastScore(score);
    setExPassed(score.allGood);

    // 3. Persist state
    saveProgress(
      key,
      { exSubmitted: true, exPassed: score.allGood, score: score },
      snapshot
    );

    if (score.allGood) {
      toast.success(
        `Great job! ${score.correct}/${score.total} exercises correct.`
      );
      // goToNextLesson(); // Opcional: auto-avanzar si 100% correcto (descomentar si se desea)
    } else {
      toast.info(
        `Review required. ${score.correct}/${score.total} exercises correct. Review the corrections and resubmit.`
      );
    }
  }, [activeLesson, videoEnded, pdfKeySet, saveProgress]);

  // Handler for Capstone submission (special case)
  const handleCapSubmit = useCallback(async () => {
    if (activeLesson?.type !== "capstone" || !usuario?.email) return;

    if (!capDriveLink.trim() || !capDriveLink.includes("drive.google.com")) {
      toast.error("Please provide a valid Google Drive link to your Capstone project.");
      return;
    }

    const key = activeLesson.key;
    const submissionData = {
      timestamp: serverTimestamp(),
      checklist: capChecklist,
      driveLink: capDriveLink.trim(),
    };

    try {
      // Save submission data to a dedicated collection
      const capRef = doc(firestore, "capstone_submissions", `${courseId}::${usuario.email}`);
      await setDoc(capRef, submissionData, { merge: true });

      // Update local progress and save main progress
      const score: EvaluationResult = { allGood: true, correct: 1, total: 1 };
      setExSubmitted(true);
      setLastScore(score);
      setExPassed(true);

      // Guardamos videoEnded: true para marcarlo como completado en el progreso
      saveProgress(
        key,
        { exSubmitted: true, exPassed: true, score: score, videoEnded: true },
        null
      );

      toast.success("Capstone submitted successfully! Awaiting review.");
    } catch (e) {
      console.error("Capstone submission error:", e);
      toast.error("Failed to submit Capstone. Please try again.");
    }
  }, [activeLesson, usuario?.email, courseId, capDriveLink, capChecklist, firestore, saveProgress]);


  /* ========================= Media Resolution & Player Setup ========================= */

  // 1. Resolve Firebase Storage URLs for video and PDF (if needed)
  useEffect(() => {
    if (!activeLesson || !storage) {
      setResolvedVideoUrl(activeLesson?.videoUrl || "");
      return;
    }

    const videoPath = activeLesson.videoUrl || "";
    // Solo resolvemos si parece una referencia gs:// o una ruta interna
    if (
      videoPath.startsWith("gs://") ||
      (videoPath.startsWith("courses/") && !videoPath.includes("vimeo"))
    ) {
      (async () => {
        try {
          const fileRef = ref(storage, videoPath);
          const url = await getDownloadURL(fileRef);
          setResolvedVideoUrl(url);
        } catch (e) {
          console.error("Error resolving video URL:", e);
          setResolvedVideoUrl("");
          toast.error("Error loading video content.");
        }
      })();
    } else {
      // URL directa (Vimeo, YouTube, etc.)
      setResolvedVideoUrl(videoPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLesson?.key, storage]); // Solo se ejecuta cuando cambia activeLesson

  // 2. Vimeo Player Initialization (Script + Iframe)
  useEffect(() => {
    if (!resolvedVideoUrl || !vimeoApiReady) return;

    const vimeoId = getVimeoId(resolvedVideoUrl);
    if (!vimeoId || !iframeRef.current) return;

    const player = new (window as any).Vimeo.Player(iframeRef.current, {
      id: vimeoId,
      width: "100%",
      height: "100%",
      dnt: true,
      keyboard: false, // Prevents keyboard seeking
    });

    vimeoPlayerRef.current = player;
    maxReachedRef.current = 0; // Reset max position for new video

    // Event listeners
    player.on("ended", handleVimeoEnded);
    player.on("timeupdate", (data: { seconds: number; percent: number }) => {
      handleVideoTimeUpdate(data.seconds);
    });

    // Cleanup on unmount or lesson change
    return () => {
      if (player) {
        player.off("ended", handleVimeoEnded);
        player.off("timeupdate", handleVideoTimeUpdate);
        player.destroy().catch(() => {});
      }
    };
  }, [resolvedVideoUrl, vimeoApiReady, handleVimeoEnded, handleVideoTimeUpdate]);

  // 3. HTML5 Player for direct video URL (fallback or other formats)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedVideoUrl || getVimeoId(resolvedVideoUrl)) return;

    // Reuse the time update handler for fast-forward blocking
    const handler = () => {
      handleVideoTimeUpdate(video.currentTime);
    };

    const endedHandler = () => handleVimeoEnded(); // Reuse ended handler
    video.addEventListener("timeupdate", handler);
    video.addEventListener("ended", endedHandler);

    return () => {
      video.removeEventListener("timeupdate", handler);
      video.removeEventListener("ended", endedHandler);
    };
  }, [resolvedVideoUrl, handleVimeoEnded, handleVideoTimeUpdate]);


  /* ========================= Render ========================= */

  // Loading state and error guards
  if (loading || !usuario || !course) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-900 text-slate-400">
        {loading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
        ) : (
          <p>
            Loading course or authentication failed. Redirecting...
          </p>
        )}
      </div>
    );
  }

  // Pre-render derived state for active lesson
  const videoId = getVimeoId(resolvedVideoUrl);
  const vimeoEmbedSrc = videoId ? buildVimeoEmbedSrc(videoId) : null;
  const showVideoPlayer = !!videoId || isHttpUrl(resolvedVideoUrl);
  const showExercises =
    (activeLesson?.exercises?.length || 0) > 0 ||
    activeLesson?.type === "capstone" ||
    activeLesson?.type === "exam"; // Mostrar ejercicios también para el examen
  const contentIsComplete = videoEnded || activeLesson?.forceExercises || pdfKeySet.has(activeLesson?.key || "");
  const showContent = !!activeLesson?.text || !!activeLesson?.pdfUrl;
  const showPdfButton = !!activeLesson?.pdfUrl;
  const embedPdfUrl = toEmbedPdfUrl(activeLesson?.pdfUrl);
  const totalCountableLessons = flatLessons.filter((l) => isCountableLesson(units[l.uIdx].lessons[l.lIdx])).length;
  const overallStats = computeStats(progressState.byLesson, totalCountableLessons, pdfKeySet);

  return (
    // 1. Vimeo API script load
    <Script
      src="https://player.vimeo.com/api/player.js"
      onLoad={() => setVimeoApiReady(true)}
      onError={() => console.error("Failed to load Vimeo Player API")}
    />,

    // 2. Main structure
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col">
      {/* Mobile Header (Title + Menu button) */}
      <header className="h-16 px-4 flex items-center justify-between border-b border-slate-800 lg:hidden sticky top-0 z-20 bg-slate-900/95 backdrop-blur-sm">
        <button
          onClick={() => router.push("/")}
          className="text-yellow-400 flex items-center gap-1 text-sm font-semibold"
        >
          <FiChevronLeft size={16} /> Dashboard
        </button>
        <button
          onClick={() => setMobileNavOpen(true)}
          className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
          aria-label="Open course navigation"
        >
          <FiMenu size={20} />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Course Navigation (Sidebar) */}
        <aside
          className={`fixed inset-y-0 right-0 z-30 w-full max-w-sm lg:relative lg:translate-x-0 lg:w-80 lg:shrink-0 bg-slate-950 border-l border-slate-800 p-4 overflow-y-auto transition-transform duration-300 ${
            mobileNavOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <h2 className="text-lg font-bold text-slate-200 line-clamp-1">
              {course.title}
            </h2>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
              aria-label="Close course navigation"
            >
              <FiX size={20} />
            </button>
          </div>

          <div className="mb-4 hidden lg:block">
            <h2 className="text-xl font-bold text-slate-200 line-clamp-2">
              {course.title}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Progress: {overallStats.percentage}% ({overallStats.completedLessons} / {overallStats.totalLessons})
            </p>
            <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                style={{ width: `${overallStats.percentage}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => router.push("/")}
            className="hidden lg:flex items-center gap-1 text-sm font-semibold text-yellow-400 mb-4 hover:text-yellow-300 transition"
          >
            <FiChevronLeft size={16} /> Back to Dashboard
          </button>

          {units.map((unit, uIdx) => (
            <UnitAccordion
              key={unit.id}
              unit={unit}
              unitIndex={uIdx}
              isExpanded={!!expandedUnits[uIdx]}
              onToggle={() =>
                setExpandedUnits((prev) => ({
                  ...prev,
                  [uIdx]: !prev[uIdx],
                }))
              }
              activeU={activeU}
              activeL={activeL}
              completedLessons={completedLessons}
              onLessonClick={(u, l, locked) => !locked && goToLesson(u, l)}
              isLocked={isLocked}
              lessonNumberMap={lessonNumberMap}
            />
          ))}
        </aside>

        {/* Main Content Area (Player + Exercises) */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-900">
          {activeLesson ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Lesson Header */}
              <h1 className="text-2xl font-extrabold text-slate-100 border-b border-slate-800 pb-3">
                {lessonNumberMap[activeLesson.key] && (
                  <span className="text-lg font-mono text-yellow-400 mr-3">
                    {lessonNumberMap[activeLesson.key]}
                  </span>
                )}
                {activeLesson.title}
              </h1>

              {/* Video Player */}
              {showVideoPlayer && (
                <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative">
                  {vimeoEmbedSrc ? (
                    <iframe
                      ref={iframeRef}
                      title={activeLesson.title}
                      src={vimeoEmbedSrc}
                      frameBorder="0"
                      allow="autoplay; fullscreen; picture-in-picture"
                      className="w-full h-full"
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      src={resolvedVideoUrl}
                      controls
                      autoPlay
                      controlsList="nodownload"
                      className="w-full h-full object-cover"
                      onEnded={handleVimeoEnded}
                    />
                  )}
                  {/* Overlay to block fast-forward visually if player doesn't have exercises */}
                  {!videoEnded && !contentIsComplete && activeLesson.type !== "text" && (
                    <div className="absolute inset-0 bg-black/50 grid place-items-center opacity-0 hover:opacity-100 transition duration-300">
                      <p className="text-white text-lg font-semibold bg-black/50 p-2 rounded">
                        Watch the full video to unlock exercises
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Lesson Content: Text/PDF */}
              {(showContent || activeLesson.finalMessage) && (
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70">
                  {showPdfButton && (
                    <div className="mb-4">
                      <button
                        onClick={() => setPdfModalOpen(true)}
                        className="px-4 py-2 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-500 transition flex items-center gap-2"
                      >
                        <FiBookOpen size={18} /> Open Lesson PDF
                        <FiMaximize size={18} />
                      </button>
                    </div>
                  )}
                  {/* Lesson Text (HTML/Markdown rendered) */}
                  {activeLesson.text && (
                    <div
                      className="prose prose-invert prose-sm text-slate-300 max-w-none space-y-4"
                      dangerouslySetInnerHTML={{
                        __html: activeLesson.text.replace(/\n/g, "<br/>"),
                      }}
                    />
                  )}
                  {/* Final Message (for Video Lessons) */}
                  {activeLesson.type === "video" &&
                    videoEnded &&
                    activeLesson.finalMessage && (
                      <div className="mt-4 p-4 rounded-lg bg-blue-900/30 border border-blue-800 text-blue-300">
                        {activeLesson.finalMessage}
                      </div>
                    )}
                </div>
              )}

              {/* Exercises / Exam / Capstone */}
              {showExercises && (
                <div className="py-4 border-t border-slate-800">
                  <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                    {activeLesson.type === "exam"
                      ? "Final Exam"
                      : activeLesson.type === "capstone"
                      ? "Capstone Project Submission"
                      : "Practice Exercises"}
                    {activeLesson.type === "exam" && (
                      <FiAlertTriangle className="text-red-400" />
                    )}
                  </h2>

                  {/* Capstone UI (Special Case) */}
                  {activeLesson.type === "capstone" && (() => {
                    const capstoneLesson = activeLesson as CapstoneLesson;
                    const alreadySubmitted = exSubmitted;
                    return (
                      <div className="space-y-4">
                        <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                          <h3 className="text-lg font-semibold text-slate-200 mb-3">
                            Checklist
                          </h3>
                          <ul className="space-y-2 text-slate-300">
                            {capstoneLesson.checklist.map((item, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-3 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  id={`cap-check-${i}`}
                                  checked={!!capChecklist[i]}
                                  onChange={(e) =>
                                    setCapChecklist((prev) => ({
                                      ...prev,
                                      [i]: e.target.checked,
                                    }))
                                  }
                                  disabled={alreadySubmitted}
                                  className="mt-1 form-checkbox h-4 w-4 text-yellow-400 bg-slate-700 border-slate-600 rounded"
                                />
                                <label
                                  htmlFor={`cap-check-${i}`}
                                  className="flex-1"
                                >
                                  {item}
                                </label>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Submission Link Input */}
                        <div className="space-y-2">
                          <label
                            htmlFor="cap-link"
                            className="block text-sm font-medium text-slate-400"
                          >
                            Google Drive Link to your Project:
                          </label>
                          <input
                            type="url"
                            id="cap-link"
                            placeholder="e.g., https://drive.google.com/file/d/..."
                            value={capDriveLink}
                            onChange={(e) => setCapDriveLink(e.target.value)}
                            disabled={alreadySubmitted}
                            className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-slate-200 focus:ring-yellow-400 focus:border-yellow-400"
                          />
                          <button
                            onClick={() => setShowDriveHelp(!showDriveHelp)}
                            className="text-xs text-yellow-400 hover:text-yellow-300"
                          >
                            What kind of link should I use?
                          </button>
                          {showDriveHelp && (
                            <div className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300">
                              <p className="font-semibold mb-1">
                                Important: Ensure the sharing settings are set to
                                "Anyone with the link can view".
                              </p>
                              <p>
                                We need a direct link to the file/folder that
                                contains your Capstone project files.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Submission Button */}
                        <button
                          onClick={handleCapSubmit}
                          disabled={
                            alreadySubmitted || capstoneLesson.checklist.some((_, i) => !capChecklist[i]) || !capDriveLink.trim()
                          }
                          className="w-full px-4 py-3 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
                        >
                          {alreadySubmitted ? "Submitted (Awaiting Review)" : "Submit Capstone Project"}
                        </button>
                      </div>
                    );
                  })()}

                  {/* General Exercise Runner */}
                  {activeLesson.type !== "capstone" && (
                    <>
                      <ExerciseRunner
                        ref={exerciseRef}
                        items={activeLesson.exercises}
                        showCorrections={exSubmitted && !exPassed}
                        initialSnapshot={
                          progressState.byLesson[activeLesson.key]?.snapshot ||
                          null
                        }
                      />

                      {/* Score Display (after submission) */}
                      {exSubmitted && lastScore && (
                        <div
                          className={`mt-4 p-4 rounded-lg border ${
                            exPassed
                              ? "border-emerald-500 bg-emerald-900/30 text-emerald-300"
                              : "border-red-500 bg-red-900/30 text-red-300"
                          }`}
                        >
                          <div className="flex items-center gap-2 font-bold">
                            {exPassed ? (
                              <FiCheckCircle size={20} />
                            ) : (
                              <FiAlertTriangle size={20} />
                            )}
                            {exPassed ? "Passed!" : "Review Required"}
                          </div>
                          <p className="text-sm mt-1">
                            You scored {lastScore.correct} out of{" "}
                            {lastScore.total} correct.
                            {exPassed
                              ? " You can now continue to the next lesson."
                              : " Please review the incorrect answers above and try again."}
                          </p>
                        </div>
                      )}

                      {/* Action Button */}
                      <div className="mt-6 flex gap-4">
                        <button
                          onClick={handleSubmitExercises}
                          disabled={
                            !contentIsComplete || (exSubmitted && exPassed) // Disable if not complete or already passed and submitted
                          }
                          className="flex-1 px-6 py-3 rounded-lg bg-yellow-400 text-slate-900 font-bold hover:bg-yellow-500 transition disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
                        >
                          {exPassed
                            ? "Completed"
                            : exSubmitted
                            ? "Re-submit Exercises"
                            : "Submit Exercises"}
                        </button>
                        <button
                          onClick={goToNextLesson}
                          disabled={!exPassed} // Only allow next if exercises are passed
                          className="px-4 py-3 rounded-lg bg-slate-800 text-slate-400 font-bold border border-slate-700 hover:bg-slate-700/50 transition disabled:opacity-50"
                        >
                          Next Lesson
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {/* Final Wrap-up message (If no exercises but completed) */}
              {!showExercises && contentIsComplete && (
                 <div className="mt-4 p-4 rounded-lg border border-emerald-500 bg-emerald-900/30 text-emerald-300">
                  <div className="flex items-center gap-2 font-bold">
                    <FiCheckCircle size={20} /> Lesson Complete!
                  </div>
                  <p className="text-sm mt-1">
                    This lesson is complete.
                  </p>
                  <div className="mt-3">
                    <button
                      onClick={goToNextLesson}
                      className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-20 text-slate-400">
              <p>Select a lesson from the menu to start the course.</p>
            </div>
          )}
        </main>
      </div>

      {/* PDF Fullscreen Modal */}
      {pdfModalOpen && (
        <div
          className="fixed inset-0 z-[999] bg-black/80"
          onClick={() => setPdfModalOpen(false)}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-4 md:inset-10 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
          >
            <div className="h-12 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-800">
              <div className="text-slate-200 text-sm font-medium">
                PDF Viewer
              </div>
              <button
                onClick={() => setPdfModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-200 border border-slate-600 hover:bg-slate-700"
                type="button"
              >
                Close (Esc)
              </button>
            </div>
            <div className="w-full h-[calc(100%-3rem)] bg-slate-900">
              <iframe
                src={embedPdfUrl}
                title="Lesson PDF Document"
                className="w-full h-full"
                frameBorder="0"
                loading="lazy"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}