// "use client";

// /**
//  * Course Dashboard Player (Video -> Exercises -> Next)
//  * - Linear gating by IDs (unitId + lessonId)
//  * - No fast-forward video (Vimeo/HTML5)
//  * - Exercises ONLY after finishing the video
//  * - "Submit exercises" evaluates, stores answers, and persists progress snapshot
//  * - Completion is derived from state; not auto-marked on navigation
//  * - Persistence: setDoc({ courseMeta, courseStructure, progress, stats }) on submit
//  * - UI: dark with units menu
//  */

// import {
//   useContext,
//   useEffect,
//   useMemo,
//   useState,
//   useCallback,
//   useRef,
//   forwardRef,
//   useImperativeHandle,
// } from "react";
// import { useParams, useRouter } from "next/navigation";
// import Script from "next/script";
// import Image from "next/image";
// import { toast } from "sonner";
// import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
// import { getDownloadURL, ref } from "firebase/storage";
// import {
//   FiCheckCircle,
//   FiChevronRight,
//   FiChevronDown,
//   FiClock,
//   FiBookOpen,
//   FiAlertTriangle,
//   FiArrowUp,
//   FiArrowDown,
//   FiLock,
//   FiPlay,
//   FiMaximize,
//   FiMenu, // <-- nuevo
//   FiX, // <-- nuevo
//   FiChevronLeft,
// } from "react-icons/fi";
// import ContextGeneral from "@/services/contextGeneral";

// /* =========================
//    Helpers
//    ========================= */

// /** Build stable lesson key from unit + lesson IDs */
// const buildKey = (unitId, lessonId) => `${unitId}::${lessonId}`;

// /** Normalize course units -> lessons with safe defaults */
// function normalizeUnits(course) {
//   const rawUnits = Array.isArray(course?.unidades) ? course.unidades : [];
//   const units = rawUnits.map((u, idxU) => {
//     const unitId = u?.id || `unit-${idxU + 1}`;
//     const lessons = [];

//     // 1) Intro de unidad (si hay descripción)
//     if (typeof u?.descripcion === "string" && u.descripcion.trim()) {
//       const lessonId = `${unitId}-intro`;
//       lessons.push({
//         key: buildKey(unitId, lessonId),
//         unitId,
//         lessonId,
//         id: lessonId,
//         title: "Unit overview",
//         type: "text", // se renderiza con el bloque de texto existente
//         text: u.descripcion,
//         videoUrl: "",
//         pdfUrl: "",
//         exercises: [],
//         forceExercises: true, // permite “Submit” sin video/pdf
//       });
//     }

//     // 2) Lecciones reales (como estaban)
//     const rawLessons = Array.isArray(u?.lecciones) ? u.lecciones : [];
//     rawLessons.forEach((l, idxL) => {
//       const lessonId = l?.id || `lesson-${idxU + 1}-${idxL + 1}`;
//       lessons.push({
//         key: buildKey(unitId, lessonId),
//         unitId,
//         lessonId,
//         id: lessonId,
//         title: l?.titulo || `Lesson ${idxL + 1}`,
//         type: "video",
//         duration: u?.duracion || l?.duracion || null,
//         videoUrl: l?.urlVideo || u?.urlVideo || "",
//         thumbUrl: l?.urlImagen || u?.urlImagen || "",
//         text: l?.texto || "",
//         pdfUrl: l?.pdfUrl || "",
//         exercises: Array.isArray(l?.ejercicios)
//           ? l.ejercicios.map((ex, k) => ({
//               id: ex.id || `${lessonId}-ex-${k}`,
//               ...ex,
//             }))
//           : [],
//         finalMessage: l?.finalMessage || "",
//       });
//     });

//     // 3) Cierre de unidad (si hay textoCierre)
//     if (typeof u?.textoCierre === "string" && u.textoCierre.trim()) {
//       const lessonId = `${unitId}-closing`;
//       lessons.push({
//         key: buildKey(unitId, lessonId),
//         unitId,
//         lessonId,
//         id: lessonId,
//         title: "Unit closing",
//         type: "text",
//         text: u.textoCierre,
//         videoUrl: "",
//         pdfUrl: "",
//         exercises: [],
//         forceExercises: true,
//       });
//     }

//     return { id: unitId, title: u?.titulo || `Unit ${idxU + 1}`, lessons };
//   });

//   // ====== 4) Final Exam (si existe en el curso) ======
//   const finalExam = course?.examenFinal;
//   if (
//     finalExam &&
//     (finalExam.introTexto ||
//       Array.isArray(finalExam.ejercicios) ||
//       finalExam.videoUrl)
//   ) {
//     const unitId = "__finalExam";
//     const lessonId = "__finalExam-lesson";
//     units.push({
//       id: unitId,
//       title: "Final Exam",
//       lessons: [
//         {
//           key: buildKey(unitId, lessonId),
//           unitId,
//           lessonId,
//           id: lessonId,
//           title: "Final Exam",
//           type: "exam", // texto + ejercicios (video opcional)
//           text: finalExam.introTexto || "",
//           videoUrl: finalExam.videoUrl || "", // ✅ ahora soporta video opcional del examen
//           pdfUrl: "",
//           exercises: Array.isArray(finalExam.ejercicios)
//             ? finalExam.ejercicios.map((ex, k) => ({
//                 id: ex.id || `${lessonId}-ex-${k}`,
//                 ...ex,
//               }))
//             : [],
//           forceExercises: true, // el video es opcional; no bloquea ejercicios
//         },
//       ],
//     });
//   }

//   // ====== 5) Capstone (si existe en el curso) ======
//   const cap = course?.capstone;
//   if (
//     cap &&
//     (cap.videoUrl || cap.instrucciones || Array.isArray(cap.checklist))
//   ) {
//     const unitId = "__capstone";
//     const lessonId = "__capstone-lesson";
//     units.push({
//       id: unitId,
//       title: "Capstone Project",
//       lessons: [
//         {
//           key: buildKey(unitId, lessonId),
//           unitId,
//           lessonId,
//           id: lessonId,
//           title: "Capstone: video, instructions & submission",
//           type: "capstone", // render especial
//           videoUrl: cap.videoUrl || "",
//           text: cap.instrucciones || "",
//           checklist: Array.isArray(cap.checklist) ? cap.checklist : [],
//           pdfUrl: "",
//           exercises: [], // manejamos UI propia, no ExerciseRunner
//           forceExercises: true, // muestra panel de acción sin requerir video
//         },
//       ],
//     });
//   }

//   // ====== 6) Cierre final de curso ======
//   if (
//     typeof course?.textoFinalCurso === "string" ||
//     course?.textoFinalCursoVideoUrl
//   ) {
//     const unitId = "__courseWrap";
//     const lessonId = "__courseWrap-lesson";
//     units.push({
//       id: unitId,
//       title: "Course Wrap-up",
//       lessons: [
//         {
//           key: buildKey(unitId, lessonId),
//           unitId,
//           lessonId,
//           id: lessonId,
//           title: "Final course message",
//           type: "text",
//           text: course.textoFinalCurso || "",
//           videoUrl: course.textoFinalCursoVideoUrl || "", // ✅ ahora puede traer video
//           pdfUrl: "",
//           exercises: [],
//           forceExercises: true, // el cierre no bloquea avance
//         },
//       ],
//     });
//   }

//   return units;
// }

// /** Calculate completion percentage from a boolean map */
// function calcPercentage(completedMap, totalLessons) {
//   if (!totalLessons) return 0;
//   const done = Object.values(completedMap || {}).filter(Boolean).length;
//   return Math.min(100, Math.round((done / totalLessons) * 100));
// }

// /** Minimal structure for persistence */
// const buildCourseStructure = (units) =>
//   units.map((u) => ({
//     id: u.id,
//     title: u.title,
//     lessons: (u.lessons || []).map((l) => ({
//       key: l.key,
//       unitId: l.unitId,
//       lessonId: l.lessonId,
//       title: l.title,
//       duration: l.duration || null,
//       type: l.type || "video",
//     })),
//   }));

// /** Stats derived from byLesson (PDF-friendly) */
// const computeStats = (byLesson, totalLessons, pdfKeySet = new Set()) => {
//   const entries = Object.entries(byLesson || {});
//   const completed = entries.filter(
//     ([k, v]) => v?.exSubmitted && (v?.videoEnded || pdfKeySet.has(k))
//   ).length;
//   const passed = entries.filter(([, v]) => v?.exPassed).length;
//   const percentage =
//     totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
//   return { completedLessons: completed, passedLessons: passed, percentage };
// };

// /** Vimeo helpers */
// function getVimeoId(input = "") {
//   if (!input) return null;
//   const s = String(input).trim();
//   if (/^\d+$/.test(s)) return s;
//   let m = s.match(/player\.vimeo\.com\/video\/(\d+)/);
//   if (m?.[1]) return m[1];
//   m = s.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
//   if (m?.[1]) return m[1];
//   return null;
// }
// function buildVimeoEmbedSrc(id) {
//   const params = new URLSearchParams({
//     autopause: "1",
//     title: "0",
//     byline: "0",
//     portrait: "0",
//     controls: "1",
//     keyboard: "0",
//     pip: "0",
//     dnt: "1",
//     playsinline: "1",
//     quality: "auto",
//     app_id: "academy_player",
//   });
//   return `https://player.vimeo.com/video/${id}?${params.toString()}`;
// }

// /* ---------- PDF helpers (non-invasive) ---------- */

// /** Quick http/https check */
// function isHttpUrl(s) {
//   try {
//     const u = new URL(String(s || ""));
//     return u.protocol === "http:" || u.protocol === "https:";
//   } catch {
//     return false;
//   }
// }

// /** Convert any PDF URL to an embeddable URL
//  * - Google Drive: /file/d/:id/preview
//  * - Other hosts: try Google Docs Viewer as a safer embed fallback
//  */
// function toEmbedPdfUrl(raw) {
//   const href = String(raw || "").trim();
//   if (!href) return "";

//   try {
//     const u = new URL(href);
//     const host = u.hostname;

//     if (host.includes("drive.google.com")) {
//       // Pattern: /file/d/:id/view -> /file/d/:id/preview
//       const m = href.match(/\/file\/d\/([^/]+)\/(view|preview)/);
//       if (m?.[1]) return `https://drive.google.com/file/d/${m[1]}/preview`;

//       // Pattern: /open?id=:id or /uc?id=:id -> /file/d/:id/preview
//       const gid = u.searchParams.get("id");
//       if (gid) return `https://drive.google.com/file/d/${gid}/preview`;

//       // Fallback: return original
//       return href;
//     }

//     // If looks like a direct PDF, use Google Docs viewer to avoid X-Frame-Options issues
//     if (/\.(pdf)(\?|#|$)/i.test(href)) {
//       return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(
//         href
//       )}`;
//     }

//     // Default: return original
//     return href;
//   } catch {
//     return href;
//   }
// }

// /* =========================
//    Exercise Runner (exposes snapshot())
//    ========================= */

// const ExerciseRunner = forwardRef(function ExerciseRunner(
//   { items = [], showCorrections = false, initialSnapshot = null },
//   ref
// ) {
//   const [answers, setAnswers] = useState({});
//   const [order, setOrder] = useState({});
//   const [matching, setMatching] = useState({});

//   // Cargar respuestas guardadas cuando se pidan correcciones o exista snapshot
//   useEffect(() => {
//     if (!initialSnapshot) return;
//     setAnswers(initialSnapshot.answers || {});
//     setOrder(initialSnapshot.order || {});
//     setMatching(initialSnapshot.matching || {});
//   }, [initialSnapshot]);

//   /** Evaluate exercises -> { allGood, correct, total } */
//   const evaluate = useCallback(() => {
//     const total = Array.isArray(items) ? items.length : 0;
//     if (!total) return { allGood: true, correct: 0, total: 0 };

//     let allGood = true;
//     let correct = 0;

//     for (const ex of items) {
//       let ok = true;
//       switch (ex.type) {
//         case "multiple_choice": {
//           const v = answers[ex.id];
//           ok = typeof v === "number" && v === ex.correctIndex;
//           break;
//         }
//         case "true_false": {
//           const v = answers[ex.id];
//           ok = typeof v === "boolean" && v === !!ex.answer;
//           break;
//         }
//         case "text": {
//           const v = (answers[ex.id] ?? "").toString().trim();
//           ok = v.length > 0; // sin verificación de correcto a menos que proveas ex.answer
//           break;
//         }
//         case "fill_blank": {
//           const arr = Array.isArray(answers[ex.id]) ? answers[ex.id] : [];
//           const want = Array.isArray(ex.answers) ? ex.answers : [];
//           ok =
//             arr.length === want.length &&
//             want.every(
//               (w, i) =>
//                 (arr[i] || "").trim().toLowerCase() ===
//                 String(w || "")
//                   .trim()
//                   .toLowerCase()
//             );
//           break;
//         }
//         case "reorder": {
//           const ord = Array.isArray(order[ex.id])
//             ? order[ex.id]
//             : ex.items?.map((_, idx) => idx) || [];
//           const want = Array.isArray(ex.correctOrder) ? ex.correctOrder : [];
//           ok = ord.length === want.length && ord.every((n, i) => n === want[i]);
//           break;
//         }
//         case "matching": {
//           const map = matching[ex.id] || {};
//           ok = (ex.pairs || []).every((p, i) => {
//             const rightIdx = map[i];
//             if (rightIdx == null) return false;
//             const right = (ex.pairs || [])[rightIdx]?.right;
//             return (right || "").trim() === (p.right || "").trim();
//           });
//           break;
//         }
//         default:
//           ok = true;
//       }
//       if (ok) correct += 1;
//       else allGood = false;
//     }
//     return { allGood, correct, total };
//   }, [items, answers, order, matching]);

//   /** Snapshot user answers for persistence */
//   const snapshot = useCallback(
//     () => ({ answers, order, matching }),
//     [answers, order, matching]
//   );

//   // Expose evaluate() and snapshot() to parent
//   useImperativeHandle(ref, () => ({ evaluate, snapshot }), [
//     evaluate,
//     snapshot,
//   ]);

//   const ReviewRow = ({ label, children }) => (
//     <div className="text-xs text-slate-300 flex gap-2">
//       <span className="min-w-[110px] text-slate-400">{label}</span>
//       <div className="flex-1">{children}</div>
//     </div>
//   );

//   return (
//     <div className="space-y-4">
//       {items.length === 0 && (
//         <div className="text-slate-400 text-sm">
//           This lesson has no exercises.
//         </div>
//       )}

//       {items.map((ex, idx) => {
//         // helpers por ejercicio
//         const userVal = answers[ex.id];
//         const baseCard = "p-4 rounded-lg border border-slate-800 bg-slate-900";

//         return (
//           <div key={ex.id} className={baseCard}>
//             <div className="text-slate-200 font-semibold mb-2">
//               {idx + 1}.{" "}
//               {ex.title ||
//                 ex.question ||
//                 ex.statement ||
//                 ex.prompt ||
//                 "Exercise"}
//             </div>

//             {/* Multiple choice */}
//             {ex.type === "multiple_choice" && (
//               <>
//                 <div className="space-y-2">
//                   {ex.options?.map((opt, i) => {
//                     const selected = userVal === i;
//                     const isCorrect = showCorrections && i === ex.correctIndex;
//                     const isWrongSel =
//                       showCorrections && selected && i !== ex.correctIndex;
//                     const base =
//                       "w-full text-left px-3 py-2 rounded border transition";
//                     const cls = isCorrect
//                       ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
//                       : isWrongSel
//                       ? "border-red-500 bg-red-500/10 text-red-300"
//                       : selected
//                       ? "border-yellow-400 bg-yellow-400/10 text-yellow-300"
//                       : "border-slate-700 hover:bg-slate-800";
//                     return (
//                       <button
//                         key={i}
//                         onClick={() =>
//                           !showCorrections &&
//                           setAnswers((a) => ({ ...a, [ex.id]: i }))
//                         }
//                         className={`${base} ${cls}`}
//                         disabled={showCorrections}
//                       >
//                         {opt}
//                       </button>
//                     );
//                   })}
//                 </div>

//                 {showCorrections && (
//                   <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800/60 p-3">
//                     <div className="font-semibold text-slate-200 mb-2">
//                       Answer review
//                     </div>
//                     <ReviewRow label="Your answer:">
//                       <span
//                         className={
//                           userVal === ex.correctIndex
//                             ? "text-emerald-300"
//                             : "text-red-300"
//                         }
//                       >
//                         {Number.isInteger(userVal)
//                           ? ex.options?.[userVal] ?? "—"
//                           : "—"}
//                       </span>
//                     </ReviewRow>
//                     <ReviewRow label="Correct answer:">
//                       <span className="text-emerald-300">
//                         {Number.isInteger(ex.correctIndex)
//                           ? ex.options?.[ex.correctIndex] ?? "—"
//                           : "—"}
//                       </span>
//                     </ReviewRow>
//                   </div>
//                 )}
//               </>
//             )}

//             {/* True/False */}
//             {ex.type === "true_false" && (
//               <>
//                 <div className="flex gap-2">
//                   {[true, false].map((val) => {
//                     const selected = userVal === val;
//                     const isCorrect = showCorrections && val === !!ex.answer;
//                     const isWrongSel =
//                       showCorrections && selected && val !== !!ex.answer;
//                     const base = "px-3 py-2 rounded border transition";
//                     const cls = isCorrect
//                       ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
//                       : isWrongSel
//                       ? "border-red-500 bg-red-500/10 text-red-300"
//                       : selected
//                       ? "border-yellow-400 bg-yellow-400/10 text-yellow-300"
//                       : "border-slate-700 hover:bg-slate-800";
//                     return (
//                       <button
//                         key={String(val)}
//                         onClick={() =>
//                           !showCorrections &&
//                           setAnswers((a) => ({ ...a, [ex.id]: val }))
//                         }
//                         className={`${base} ${cls}`}
//                         disabled={showCorrections}
//                       >
//                         {val ? "True" : "False"}
//                       </button>
//                     );
//                   })}
//                 </div>

//                 {showCorrections && (
//                   <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800/60 p-3">
//                     <div className="font-semibold text-slate-200 mb-2">
//                       Answer review
//                     </div>
//                     <ReviewRow label="Your answer:">
//                       <span
//                         className={
//                           userVal === !!ex.answer
//                             ? "text-emerald-300"
//                             : "text-red-300"
//                         }
//                       >
//                         {typeof userVal === "boolean"
//                           ? userVal
//                             ? "True"
//                             : "False"
//                           : "—"}
//                       </span>
//                     </ReviewRow>
//                     <ReviewRow label="Correct answer:">
//                       <span className="text-emerald-300">
//                         {!!ex.answer ? "True" : "False"}
//                       </span>
//                     </ReviewRow>
//                   </div>
//                 )}
//               </>
//             )}

//             {/* Long text */}
//             {ex.type === "text" && (
//               <>
//                 <textarea
//                   rows={4}
//                   placeholder="Type your answer..."
//                   className={`w-full rounded bg-slate-800 border p-3 outline-none ${
//                     showCorrections
//                       ? "border-slate-700"
//                       : "border-slate-700 focus:border-yellow-400"
//                   }`}
//                   value={answers[ex.id] || ""}
//                   onChange={(e) =>
//                     !showCorrections &&
//                     setAnswers((a) => ({ ...a, [ex.id]: e.target.value }))
//                   }
//                   disabled={showCorrections}
//                 />
//                 {showCorrections && (
//                   <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800/60 p-3">
//                     <div className="font-semibold text-slate-200 mb-2">
//                       Answer review
//                     </div>
//                     <ReviewRow label="Your answer:">
//                       <div className="whitespace-pre-wrap">
//                         {(answers[ex.id] || "").toString() || "—"}
//                       </div>
//                     </ReviewRow>
//                     {ex.answer != null && (
//                       <ReviewRow label="Correct answer:">
//                         <div className="whitespace-pre-wrap text-emerald-300">
//                           {String(ex.answer)}
//                         </div>
//                       </ReviewRow>
//                     )}
//                   </div>
//                 )}
//               </>
//             )}

//             {/* Fill in the blanks */}
//             {ex.type === "fill_blank" && (
//               <>
//                 {/* Header: Enunciado + Banco de palabras (si existen) */}
//                 {(ex.title || ex.hintWords) && (
//                   <div className="mb-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
//                     {ex.title && (
//                       <div className="text-sm font-semibold text-slate-200 mb-2">
//                         {ex.title}
//                       </div>
//                     )}
//                     {ex.hintWords && String(ex.hintWords).trim() && (
//                       <div>
//                         <div className="text-xs text-slate-400 mb-1">
//                           Word bank
//                         </div>
//                         <div className="flex flex-wrap gap-1.5">
//                           {String(ex.hintWords)
//                             .split(",")
//                             .map((w) => w.trim())
//                             .filter(Boolean)
//                             .map((w, i) => (
//                               <span
//                                 key={`${ex.id}-hint-${i}`}
//                                 className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800/80 text-slate-200 text-[11px]"
//                               >
//                                 {w}
//                               </span>
//                             ))}
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 )}

//                 {/* Frase con inputs embebidos y compactos */}
//                 <div className="space-y-2">
//                   {(() => {
//                     const parts = String(ex.sentence || "").split("***");
//                     const blanks = (ex.sentence?.match(/\*\*\*/g) || []).length;
//                     const current = Array.isArray(answers[ex.id])
//                       ? answers[ex.id].slice()
//                       : Array.from({ length: blanks }).map(() => "");

//                     const setAt = (idx, v) => {
//                       if (showCorrections) return;
//                       const arr = Array.isArray(answers[ex.id])
//                         ? answers[ex.id].slice()
//                         : Array.from({ length: blanks }).map(() => "");
//                       arr[idx] = v;
//                       setAnswers((a) => ({ ...a, [ex.id]: arr }));
//                     };

//                     const want = Array.isArray(ex.answers) ? ex.answers : [];

//                     return (
//                       <>
//                         {/* Línea con el texto y campos (más bajos y angostos) */}
//                         <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-slate-200 leading-7">
//                           {parts.map((chunk, i) => {
//                             const isLast = i === parts.length - 1;
//                             // autosize aproximado: contenido actual o respuesta esperada
//                             const basis = (current[i] ?? want[i] ?? "")
//                               .toString()
//                               .trim();
//                             const size = Math.max(
//                               4,
//                               Math.min(16, basis.length + 1)
//                             );
//                             return (
//                               <span key={`${ex.id}-chunk-${i}`}>
//                                 {chunk}
//                                 {!isLast && (
//                                   <input
//                                     aria-label={`Blank #${i + 1}`}
//                                     placeholder={`#${i + 1}`}
//                                     size={size}
//                                     className={`align-baseline inline-block h-8 px-2 py-0.5 text-sm rounded-md bg-slate-800/90 border outline-none transition
//                           ${
//                             showCorrections
//                               ? "border-slate-700"
//                               : "border-slate-700 focus:border-yellow-400"
//                           }`}
//                                     value={current[i] || ""}
//                                     onChange={(e) => setAt(i, e.target.value)}
//                                     disabled={showCorrections}
//                                   />
//                                 )}
//                               </span>
//                             );
//                           })}
//                         </div>

//                         {/* Review compacto por blank */}
//                         {showCorrections && blanks > 0 && (
//                           <div className="mt-2 space-y-1">
//                             {Array.from({ length: blanks }).map((_, i) => {
//                               const val = (answers[ex.id] || [])[i] ?? "";
//                               const target = String(want[i] || "");
//                               const ok =
//                                 val.toString().trim().toLowerCase() ===
//                                 target.trim().toLowerCase();
//                               return (
//                                 <div
//                                   key={`${ex.id}-rev-${i}`}
//                                   className="text-xs"
//                                 >
//                                   <span className="text-slate-400 mr-2">
//                                     Blank #{i + 1}
//                                   </span>
//                                   <span
//                                     className={
//                                       ok ? "text-emerald-300" : "text-red-300"
//                                     }
//                                   >
//                                     {val || "—"}
//                                   </span>
//                                   <span className="text-slate-400 mx-2">/</span>
//                                   <span className="text-emerald-300">
//                                     {target}
//                                   </span>
//                                 </div>
//                               );
//                             })}
//                           </div>
//                         )}
//                       </>
//                     );
//                   })()}
//                 </div>
//               </>
//             )}

//             {/* Reorder */}
//             {ex.type === "reorder" && (
//               <>
//                 <div className="space-y-2">
//                   {(() => {
//                     const current = Array.isArray(order[ex.id])
//                       ? order[ex.id]
//                       : ex.items?.map((_, idx) => idx) || [];
//                     const setCurrent = (next) =>
//                       setOrder((o) => ({ ...o, [ex.id]: next }));
//                     const moveLocal = (arr, from, to) => {
//                       const copy = arr.slice();
//                       const item = copy.splice(from, 1)[0];
//                       copy.splice(to, 0, item);
//                       return copy;
//                     };
//                     return (
//                       <ul className="space-y-2">
//                         {current.map((idxItem, pos) => (
//                           <li
//                             key={`${ex.id}-${idxItem}`}
//                             className="flex items-center gap-2"
//                           >
//                             <div className="flex-1 px-3 py-2 rounded border bg-slate-800 border-slate-700">
//                               {ex.items?.[idxItem]}
//                             </div>
//                             <div className="flex flex-col gap-1">
//                               <button
//                                 aria-label="Move up"
//                                 onClick={() =>
//                                   !showCorrections &&
//                                   pos > 0 &&
//                                   setCurrent(moveLocal(current, pos, pos - 1))
//                                 }
//                                 className="p-2 rounded border border-slate-700 hover:bg-slate-800 disabled:opacity-50"
//                                 disabled={showCorrections}
//                               >
//                                 <FiArrowUp />
//                               </button>
//                               <button
//                                 aria-label="Move down"
//                                 onClick={() =>
//                                   !showCorrections &&
//                                   pos < current.length - 1 &&
//                                   setCurrent(moveLocal(current, pos, pos + 1))
//                                 }
//                                 className="p-2 rounded border border-slate-700 hover:bg-slate-800 disabled:opacity-50"
//                                 disabled={showCorrections}
//                               >
//                                 <FiArrowDown />
//                               </button>
//                             </div>
//                           </li>
//                         ))}
//                       </ul>
//                     );
//                   })()}
//                 </div>

//                 {showCorrections && (
//                   <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800/60 p-3">
//                     <div className="font-semibold text-slate-200 mb-2">
//                       Answer review
//                     </div>
//                     {(() => {
//                       const yourIdxs = Array.isArray(order[ex.id])
//                         ? order[ex.id]
//                         : ex.items?.map((_, i) => i) || [];
//                       const correctIdxs = Array.isArray(ex.correctOrder)
//                         ? ex.correctOrder
//                         : [];
//                       const your = yourIdxs.map((i) => ex.items?.[i]);
//                       const correct = correctIdxs.map((i) => ex.items?.[i]);
//                       const ok =
//                         yourIdxs.length === correctIdxs.length &&
//                         yourIdxs.every((n, i) => n === correctIdxs[i]);

//                       return (
//                         <div className="grid sm:grid-cols-2 gap-3 text-xs">
//                           <div>
//                             <div className="text-slate-400 mb-1">
//                               Your order
//                             </div>
//                             <ol className="list-decimal list-inside space-y-1">
//                               {your.map((t, i) => (
//                                 <li
//                                   key={i}
//                                   className={
//                                     ok ? "text-emerald-300" : "text-slate-200"
//                                   }
//                                 >
//                                   {t}
//                                 </li>
//                               ))}
//                             </ol>
//                           </div>
//                           <div>
//                             <div className="text-slate-400 mb-1">
//                               Correct order
//                             </div>
//                             <ol className="list-decimal list-inside space-y-1">
//                               {correct.map((t, i) => (
//                                 <li key={i} className="text-emerald-300">
//                                   {t}
//                                 </li>
//                               ))}
//                             </ol>
//                           </div>
//                         </div>
//                       );
//                     })()}
//                   </div>
//                 )}
//               </>
//             )}

//             {/* Matching */}
//             {ex.type === "matching" && (
//               <>
//                 <div className="space-y-3">
//                   {(ex.pairs || []).map((p, leftIdx) => {
//                     const rights = (ex.pairs || []).map((q, i) => ({
//                       label: q.right,
//                       value: i,
//                     }));
//                     const selected = (matching[ex.id] || {})[leftIdx] ?? "";
//                     const isCorrect =
//                       showCorrections &&
//                       Number.isInteger(selected) &&
//                       (ex.pairs?.[selected]?.right || "").trim() ===
//                         (p.right || "").trim();
//                     return (
//                       <div
//                         key={leftIdx}
//                         className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center"
//                       >
//                         <div
//                           className={`text-sm rounded px-3 py-2 border ${
//                             isCorrect
//                               ? "bg-emerald-500/10 border-emerald-500 text-emerald-300"
//                               : "bg-slate-800 border-slate-700"
//                           }`}
//                         >
//                           {p.left}
//                         </div>
//                         <select
//                           className={`rounded px-3 py-2 outline-none border ${
//                             showCorrections
//                               ? "bg-slate-800 border-slate-700"
//                               : "bg-slate-800 border-slate-700 focus:border-yellow-400"
//                           }`}
//                           value={selected}
//                           onChange={(e) => {
//                             if (showCorrections) return;
//                             const next = { ...(matching[ex.id] || {}) };
//                             next[leftIdx] =
//                               e.target.value === ""
//                                 ? undefined
//                                 : Number(e.target.value);
//                             setMatching((m) => ({ ...m, [ex.id]: next }));
//                           }}
//                           disabled={showCorrections}
//                         >
//                           <option value="">Select a match</option>
//                           {rights.map((r) => (
//                             <option key={r.value} value={r.value}>
//                               {r.label}
//                             </option>
//                           ))}
//                         </select>
//                       </div>
//                     );
//                   })}
//                 </div>

//                 {showCorrections && (
//                   <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800/60 p-3">
//                     <div className="font-semibold text-slate-200 mb-2">
//                       Answer review
//                     </div>
//                     <div className="text-xs space-y-1">
//                       {(ex.pairs || []).map((p, i) => {
//                         const selIdx = (matching[ex.id] || {})[i];
//                         const yourRight = Number.isInteger(selIdx)
//                           ? ex.pairs?.[selIdx]?.right
//                           : "";
//                         const ok =
//                           (yourRight || "").trim() === (p.right || "").trim();
//                         return (
//                           <div key={i} className="flex flex-wrap gap-2">
//                             <span className="text-slate-400">{p.left}</span>
//                             <span
//                               className={
//                                 ok ? "text-emerald-300" : "text-red-300"
//                               }
//                             >
//                               {yourRight || "—"}
//                             </span>
//                             <span className="text-slate-400">/</span>
//                             <span className="text-emerald-300">{p.right}</span>
//                           </div>
//                         );
//                       })}
//                     </div>
//                   </div>
//                 )}
//               </>
//             )}
//           </div>
//         );
//       })}
//     </div>
//   );
// });

// /* =========================
//    Unit Accordion
//    ========================= */

// /* =========================
//    Unit Accordion
//    ========================= */

// const UnitAccordion = ({
//   unit,
//   unitIndex,
//   isExpanded,
//   onToggle,
//   activeU,
//   activeL,
//   completedLessons,
//   onLessonClick,
//   isLocked,
//   lessonNumberMap, // <-- nuevo: mapa "U.L" por lección
// }) => {
//   // progreso por unidad (no cambia)
//   const completedInUnit = unit.lessons.filter(
//     (l) => completedLessons[l.key]
//   ).length;
//   const totalInUnit = unit.lessons.length;
//   const unitProgress =
//     totalInUnit > 0 ? Math.round((completedInUnit / totalInUnit) * 100) : 0;

//   return (
//     <div className="mb-2">
//       {/* Header de unidad con badge U# */}
//       <button
//         onClick={onToggle}
//         className="w-full flex items-center justify-between px-3 py-3 text-left rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800/60 transition-colors"
//       >
//         <div className="flex items-center gap-3">
//           {/* Badge de unidad: "U1", "U2", ... */}
//           <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-300">
//             U{unitIndex + 1}
//           </span>

//           {/* Chevron + título */}
//           <div className="flex items-center gap-2">
//             {isExpanded ? (
//               <FiChevronDown size={16} />
//             ) : (
//               <FiChevronRight size={16} />
//             )}
//             <span className="font-semibold text-slate-200">{unit.title}</span>
//           </div>
//         </div>

//         <div className="flex items-center gap-2">
//           <span className="text-xs text-slate-400">
//             {completedInUnit}/{totalInUnit}
//           </span>
//           <div className="w-12 h-2 bg-slate-800 rounded-full overflow-hidden">
//             <div
//               className="h-full bg-yellow-400 rounded-full transition-all"
//               style={{ width: `${unitProgress}%` }}
//             />
//           </div>
//         </div>
//       </button>

//       {/* Lista de lecciones */}
//       {isExpanded && (
//         <div className="mt-2 ml-4 space-y-1">
//           {unit.lessons.map((lesson, lIdx) => {
//             const isActive = unitIndex === activeU && lIdx === activeL;
//             const isDone = !!completedLessons[lesson.key];
//             const locked = isLocked(unitIndex, lIdx);

//             // Número "U.L" solo si es lección contable (type === "video")
//             const numLabel = lessonNumberMap?.[lesson.key] || null;

//             return (
//               <button
//                 key={lesson.key}
//                 onClick={() => onLessonClick(unitIndex, lIdx, locked)}
//                 disabled={locked}
//                 className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
//                   isActive
//                     ? "bg-yellow-400/10 text-yellow-300 border border-yellow-400/30"
//                     : locked
//                     ? "text-slate-500 cursor-not-allowed bg-slate-800/30"
//                     : "hover:bg-slate-800/60 text-slate-300"
//                 }`}
//                 title={
//                   locked ? "Locked until the previous lesson is completed." : ""
//                 }
//               >
//                 {/* Columna fija para numeración: ocupa lugar aunque no haya número, para alinear */}
//                 <span
//                   className={`w-10 shrink-0 text-[11px] font-semibold text-center rounded ${
//                     numLabel
//                       ? "text-slate-200 bg-slate-800 border border-slate-700"
//                       : "text-slate-600"
//                   }`}
//                 >
//                   {numLabel || ""}
//                 </span>

//                 {/* Estado (done/lock/active) */}
//                 <span
//                   className={`grid place-items-center w-5 h-5 rounded-full border ${
//                     isDone
//                       ? "bg-emerald-500 border-emerald-500 text-white"
//                       : locked
//                       ? "border-slate-700 text-slate-600"
//                       : isActive
//                       ? "border-yellow-400 text-yellow-400"
//                       : "border-slate-600 text-slate-500"
//                   }`}
//                 >
//                   {isDone ? (
//                     <FiCheckCircle size={12} />
//                   ) : locked ? (
//                     <FiLock size={12} />
//                   ) : isActive ? (
//                     <FiPlay size={10} />
//                   ) : (
//                     <span className="w-1.5 h-1.5 rounded-full bg-current" />
//                   )}
//                 </span>

//                 {/* Título */}
//                 <span className="flex-1 min-w-0 text-sm font-medium line-clamp-1">
//                   {lesson.title}
//                 </span>

//                 {/* Duración si existe */}
//                 {lesson.duration && (
//                   <span className="text-xs text-slate-400 inline-flex items-center gap-1">
//                     <FiClock size={12} /> {lesson.duration}m
//                   </span>
//                 )}
//               </button>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// };

// /* =========================
//    Page
//    ========================= */

// export default function CoursePlayerPage() {
//   const params = useParams();
//   const courseId = params?.id?.toString?.() || "";
//   const router = useRouter();
//   const { firestore, storage, usuario, cursos, verificarLogin } =
//     useContext(ContextGeneral);

//   const [loading, setLoading] = useState(() => usuario === undefined);
//   const [course, setCourse] = useState(null);
//   const [units, setUnits] = useState([]);
//   const [activeU, setActiveU] = useState(0);
//   const [activeL, setActiveL] = useState(0);
//   const [expandedUnits, setExpandedUnits] = useState({});
//   const [mobileNavOpen, setMobileNavOpen] = useState(false);
//   // Single progress + answers local state
//   const [progressState, setProgressState] = useState({
//     byLesson: {},
//     lastActive: { unitId: null, lessonId: null },
//   });
//   const [initialProgressReady, setInitialProgressReady] = useState(false);
//   const initialProgressRef = useRef(null);
//   const [progressLoaded, setProgressLoaded] = useState(false);

//   const [resolvedVideoUrl, setResolvedVideoUrl] = useState("");
//   const [vimeoApiReady, setVimeoApiReady] = useState(false);

//   const [capChecklist, setCapChecklist] = useState({});
//   const [capDriveLink, setCapDriveLink] = useState("");
//   const [showDriveHelp, setShowDriveHelp] = useState(false); // popup de ayuda

//   const iframeRef = useRef(null);
//   const vimeoPlayerRef = useRef(null);
//   const videoRef = useRef(null);

//   const appliedInitialPosRef = useRef(false);
//   const maxReachedRef = useRef(0);
//   const progressRef = useRef(null);
//   progressRef.current = progressState;

//   // PDF modal open/close state
//   const [pdfModalOpen, setPdfModalOpen] = useState(false);

//   /**
//    * If the Vimeo script was already loaded elsewhere (first visit),
//    * Next.js won't call onLoad again on this route. Detect it and mark ready.
//    */
//   useEffect(() => {
//     // Check synchronously on mount
//     if (typeof window !== "undefined" && window?.Vimeo?.Player) {
//       setVimeoApiReady(true);
//     }
//   }, []);

//   // Close on ESC and lock scroll while modal is open
//   useEffect(() => {
//     if (!pdfModalOpen) return;

//     const onKey = (e) => {
//       if (e.key === "Escape") setPdfModalOpen(false);
//     };
//     document.addEventListener("keydown", onKey);
//     const prev = document.body.style.overflow;
//     document.body.style.overflow = "hidden";

//     return () => {
//       document.removeEventListener("keydown", onKey);
//       document.body.style.overflow = prev || "auto";
//     };
//   }, [pdfModalOpen]);

//   useEffect(() => {
//     if (!mobileNavOpen) return;
//     const prev = document.body.style.overflow;
//     document.body.style.overflow = "hidden";
//     return () => {
//       document.body.style.overflow = prev || "auto";
//     };
//   }, [mobileNavOpen]);
//   // UI flags (derived)
//   const [videoEnded, setVideoEnded] = useState(false);
//   const [exSubmitted, setExSubmitted] = useState(false);
//   const [exPassed, setExPassed] = useState(false);
//   const [lastScore, setLastScore] = useState(null);

//   const exerciseRef = useRef(null);

//   // Ensure auth context is loaded/check session
//   useEffect(() => {
//     // Solo verifico si el contexto aún no resolvió al usuario.
//     if (usuario === undefined) {
//       verificarLogin?.();
//     }
//   }, [usuario, verificarLogin]);

//   // Find selected course from context list
//   const foundCourse = useMemo(() => {
//     if (!Array.isArray(cursos)) return null;
//     return cursos.find((c) => c?.id === courseId) || null;
//   }, [cursos, courseId]);

//   // Ownership guard (email must be in course.cursantes and courseId in user acquisitions)
//   const ownership = useMemo(() => {
//     const email = usuario?.email;
//     const adquiridos = usuario?.cursosAdquiridos || [];
//     const idOk = !!courseId && adquiridos.includes(courseId);
//     const emailOk =
//       !!email &&
//       Array.isArray(foundCourse?.cursantes) &&
//       foundCourse.cursantes.includes(email);
//     return { idOk, emailOk };
//   }, [usuario, foundCourse, courseId]);

//   /* =========================
//      Load initial progress
//      NEW: Read from alumnos/{email}.progress[courseId]
//      Legacy fallback: alumnos/{email}/progress/{courseId}
//      ========================= */
//   const loadInitialProgress = useCallback(async () => {
//     if (!firestore || !usuario?.email || !courseId) return;
//     try {
//       // 1) Read from main user doc map field
//       const userRef = doc(firestore, "alumnos", usuario.email);
//       const userSnap = await getDoc(userRef);
//       if (userSnap.exists()) {
//         const data = userSnap.data();
//         const entry = data?.progress?.[courseId];
//         if (entry?.progress?.byLesson) {
//           const loaded = {
//             byLesson: entry.progress.byLesson || {},
//             lastActive: entry.progress.lastActive || {
//               unitId: null,
//               lessonId: null,
//             },
//           };
//           setProgressState(loaded);
//           initialProgressRef.current = loaded;
//           setInitialProgressReady(true);
//           return;
//         }
//       }

//       // 2) Legacy fallback
//       const legacyRef = doc(
//         firestore,
//         "alumnos",
//         usuario.email,
//         "progress",
//         courseId
//       );
//       const legacySnap = await getDoc(legacyRef);
//       if (legacySnap.exists()) {
//         const legacy = legacySnap.data();
//         if (legacy?.progress?.byLesson) {
//           const loaded = {
//             byLesson: legacy.progress.byLesson || {},
//             lastActive: legacy.progress.lastActive || {
//               unitId: null,
//               lessonId: null,
//             },
//           };
//           setProgressState(loaded);
//           initialProgressRef.current = loaded;
//           setInitialProgressReady(true);
//           return;
//         }
//       }
//     } catch (e) {
//       console.error("Error loading progress:", e);
//     } finally {
//       if (!initialProgressRef.current) {
//         const empty = {
//           byLesson: {},
//           lastActive: { unitId: null, lessonId: null },
//         };
//         setProgressState(empty);
//         initialProgressRef.current = empty;
//         setInitialProgressReady(true);
//       }
//     }
//   }, [firestore, usuario?.email, courseId]);

//   // Boot sequence: guards + load
//   useEffect(() => {
//     if (!courseId) return;
//     if (usuario === undefined) return;

//     if (!usuario?.email) {
//       toast.error("Sign in to access the course.");
//       router.push("/");
//       return;
//     }
//     if (!foundCourse) {
//       toast.error("Course not found.");
//       setLoading(false);
//       return;
//     }
//     if (!ownership.idOk || !ownership.emailOk) {
//       toast.error("You don't have access to this course.");
//       setLoading(false);
//       return;
//     }

//     setCourse(foundCourse);
//     const normalizedUnits = normalizeUnits(foundCourse);
//     setUnits(normalizedUnits);
//     if (normalizedUnits.length > 0) setExpandedUnits({ 0: true });

//     (async () => {
//       await loadInitialProgress();
//       setLoading(false);
//     })();
//   }, [usuario, foundCourse, ownership, router, courseId, loadInitialProgress]);

//   /* ---------- Flatten helpers ---------- */
//   const flatLessons = useMemo(() => {
//     const arr = [];
//     units.forEach((u, uIdx) =>
//       (u.lessons || []).forEach((l, lIdx) =>
//         arr.push({ uIdx, lIdx, key: l.key, unitId: u.id, lessonId: l.lessonId })
//       )
//     );
//     return arr;
//   }, [units]);

//   // --- Countable lesson helper: only "real" lessons (video) are numbered ---
//   const isCountableLesson = (l) => l && l.type === "video"; // exclude "text" (intro/closing), "exam", "capstone"

//   // --- Build { [lesson.key]: "U.L" } map like "1.3" ---
//   const lessonNumberMap = useMemo(() => {
//     const map = {};
//     units.forEach((u, ui) => {
//       let counter = 1;
//       (u.lessons || []).forEach((l) => {
//         if (isCountableLesson(l)) {
//           map[l.key] = `${ui + 1}.${counter}`; // e.g., "1.1"
//           counter += 1;
//         }
//       });
//     });
//     return map;
//   }, [units]);

//   const pdfKeySet = useMemo(() => {
//     const set = new Set();
//     units.forEach((u) =>
//       (u.lessons || []).forEach((l) => {
//         if (isHttpUrl(l?.pdfUrl || "")) set.add(l.key);
//       })
//     );
//     return set;
//   }, [units]);

//   const indexOfLesson = useCallback(
//     (uIdx, lIdx) => {
//       let idx = 0;
//       for (let i = 0; i < units.length; i++) {
//         const len = units[i]?.lessons?.length || 0;
//         if (i === uIdx) return idx + lIdx;
//         idx += len;
//       }
//       return 0;
//     },
//     [units]
//   );

//   // Derived: map of completed lessons from progress state
//   const completedLessons = useMemo(() => {
//     const map = {};
//     Object.entries(progressState.byLesson || {}).forEach(([k, v]) => {
//       map[k] = !!(v?.exSubmitted && (v?.videoEnded || pdfKeySet.has(k)));
//     });
//     return map;
//   }, [progressState.byLesson, pdfKeySet]);

//   // Sequential locking based on previous completions
//   const isLocked = useCallback(
//     (uIdx, lIdx) => {
//       const targetIdx = indexOfLesson(uIdx, lIdx);
//       if (targetIdx === 0) return false;
//       for (let k = 0; k < targetIdx; k++) {
//         const prev = flatLessons[k];
//         if (!prev || !completedLessons[prev.key]) return true;
//       }
//       return false;
//     },
//     [flatLessons, indexOfLesson, completedLessons]
//   );

//   // Find first playable (not completed) lesson index
//   const firstPlayableIndex = useMemo(() => {
//     for (let i = 0; i < flatLessons.length; i++) {
//       const l = flatLessons[i];
//       if (!completedLessons[l.key]) return i;
//     }
//     return flatLessons.length ? flatLessons.length - 1 : 0;
//   }, [flatLessons, completedLessons]);

//   // Restore lastActive pointer if valid; otherwise go to first playable
//   const findIndicesByIds = useCallback(
//     (unitId, lessonId) => {
//       const uIdx = units.findIndex((u) => u.id === unitId);
//       if (uIdx < 0) return { uIdx: -1, lIdx: -1 };
//       const lIdx = (units[uIdx]?.lessons || []).findIndex(
//         (l) => l.lessonId === lessonId
//       );
//       return { uIdx, lIdx };
//     },
//     [units]
//   );

//   useEffect(() => {
//     if (appliedInitialPosRef.current) return;
//     if (!units.length) return;
//     if (!initialProgressReady) return;

//     // Siempre ir a la ÚLTIMA lección disponible (la más lejana desbloqueada)
//     const i = firstPlayableIndex;
//     const entry = flatLessons[i] || flatLessons[flatLessons.length - 1] || null;

//     if (entry) {
//       setActiveU(entry.uIdx);
//       setActiveL(entry.lIdx);
//       setExpandedUnits((prev) => ({ ...prev, [entry.uIdx]: true }));
//     } else {
//       setActiveU(0);
//       setActiveL(0);
//       setExpandedUnits((prev) => ({ ...prev, 0: true }));
//     }
//     appliedInitialPosRef.current = true;
//   }, [units, initialProgressReady, firstPlayableIndex, flatLessons]);

//   /* ---------- Active lesson ---------- */
//   const activeLesson = useMemo(
//     () => units[activeU]?.lessons?.[activeL] || null,
//     [units, activeU, activeL]
//   );

//   // Sync UI flags from progress state when active lesson changes
//   useEffect(() => {
//     const key = activeLesson?.key || "";
//     setVideoEnded(!!progressRef.current?.byLesson?.[key]?.videoEnded);
//     const s = progressRef.current?.byLesson?.[key];
//     setExSubmitted(!!s?.exSubmitted);
//     setExPassed(!!s?.exPassed);
//     setLastScore(s?.score || null);
//     maxReachedRef.current = 0;
//   }, [activeLesson?.key, progressState.byLesson]);

//   useEffect(() => {
//     const key = activeLesson?.key || "";
//     const s = progressRef.current?.byLesson?.[key];
//     if (activeLesson?.type === "capstone") {
//       const saved = s?.answers?.capstone || {};
//       setCapChecklist(saved.checklist || {});
//       setCapDriveLink(saved.driveLink || "");
//     }
//   }, [activeLesson?.key, activeLesson?.type, progressState.byLesson]);

//   // --- Helper: render lesson text into paragraphs (simple) ---
//   const renderLessonText = useCallback((raw) => {
//     // ✅ Acepta string; si no hay contenido, no devuelve nada
//     if (typeof raw !== "string" || raw.trim().length === 0) return null;
//     // ✅ Divide por saltos de línea simples o dobles
//     const parts = raw.split(/\n{2,}|\n/g).filter(Boolean);
//     // ✅ Devuelve nodos <p> con estilos del player
//     return parts.map((p, i) => (
//       <p key={i} className="text-slate-300 leading-relaxed">
//         {p}
//       </p>
//     ));
//   }, []);

//   const onSubmitCapstone = async () => {
//     const lessonKey = activeLesson?.key;
//     const unitId = units[activeU]?.id || null;
//     const lessonId = units[activeU]?.lessons?.[activeL]?.lessonId || null;

//     // pasa si todos los ítems true y hay link no vacío
//     const totalItems = Array.isArray(activeLesson?.checklist)
//       ? activeLesson.checklist.length
//       : 0;
//     const checkedCount = Object.values(capChecklist || {}).filter(
//       Boolean
//     ).length;
//     const hasAll = totalItems === 0 ? true : checkedCount === totalItems;
//     const hasLink = (capDriveLink || "").trim().length > 0;
//     const allGood = hasAll && hasLink;

//     const prevByLesson = progressRef.current?.byLesson || {};
//     const updatedEntry = {
//       ...(prevByLesson[lessonKey] || {}),
//       videoEnded: true, // no hay video obligatorio, pero marcamos como visto para gating
//       exSubmitted: true,
//       exPassed: allGood,
//       score: {
//         correct: allGood ? totalItems : checkedCount,
//         total: totalItems,
//       },
//       answers: {
//         ...(prevByLesson[lessonKey]?.answers || {}),
//         capstone: {
//           checklist: capChecklist,
//           driveLink: capDriveLink,
//         },
//       },
//       updatedAt: Date.now(),
//     };
//     const nextByLesson = { ...prevByLesson, [lessonKey]: updatedEntry };
//     const nextProgress = {
//       byLesson: nextByLesson,
//       lastActive: { unitId, lessonId },
//     };

//     setExSubmitted(true);
//     setExPassed(allGood);
//     setLastScore({
//       correct: allGood ? totalItems : checkedCount,
//       total: totalItems,
//     });
//     setProgressState(nextProgress);

//     try {
//       const userRef = doc(firestore, "alumnos", usuario.email);
//       const courseMeta = {
//         id: courseId,
//         title: course?.titulo || "Course",
//         totalUnits: units.length,
//         totalLessons,
//       };
//       const courseStructure = buildCourseStructure(units);
//       const stats = computeStats(nextByLesson, totalLessons, pdfKeySet);
//       const payload = {
//         courseId,
//         courseMeta,
//         courseStructure,
//         progress: nextProgress,
//         stats,
//         updatedAt: serverTimestamp(),
//       };
//       await setDoc(
//         userRef,
//         { progress: { [courseId]: payload } },
//         { merge: true }
//       );
//       if (allGood) toast.success("Capstone submitted!");
//       else toast.warning("Complete the checklist and add a Drive link.");
//     } catch (e) {
//       console.error("Error saving capstone:", e);
//       toast.error("We couldn't save your capstone.");
//     }
//   };

//   /* ---------- Resolve video URL ---------- */
//   const resolveNonVimeoUrl = useCallback(async () => {
//     try {
//       const url = activeLesson?.videoUrl;
//       if (!url) return setResolvedVideoUrl("");
//       if (getVimeoId(url)) return setResolvedVideoUrl("");
//       if (url.startsWith("http://") || url.startsWith("https://")) {
//         setResolvedVideoUrl(url);
//         return;
//       }
//       if (storage && (url.startsWith("gs://") || !url.startsWith("http"))) {
//         const storageRef = ref(storage, url);
//         const httpsUrl = await getDownloadURL(storageRef);
//         setResolvedVideoUrl(httpsUrl);
//         return;
//       }
//       setResolvedVideoUrl(url);
//     } catch (err) {
//       console.error("Error resolving video URL", err);
//       setResolvedVideoUrl("");
//       toast.error("Could not load the video.");
//     }
//   }, [activeLesson, storage]);

//   useEffect(() => {
//     resolveNonVimeoUrl();
//   }, [resolveNonVimeoUrl]);

//   /* ---------- Vimeo controls ---------- */
//   const vimeoId = getVimeoId(activeLesson?.videoUrl);
//   const vimeoSrc = vimeoId ? buildVimeoEmbedSrc(vimeoId) : null;

//   useEffect(() => {
//     // Accept either the state flag (on first load) OR the presence of the global Vimeo.Player (on re-entries)
//     const hasVimeo = vimeoApiReady || !!window?.Vimeo?.Player;
//     if (!hasVimeo || !iframeRef.current || !vimeoId) {
//       try {
//         vimeoPlayerRef.current?.destroy?.();
//       } catch {}
//       vimeoPlayerRef.current = null;
//       return;
//     }
//     const Player = window?.Vimeo?.Player;
//     if (!Player) return;

//     const player = new Player(iframeRef.current);
//     vimeoPlayerRef.current = player;

//     // Reset reach tracking when a new player is created
//     maxReachedRef.current = 0;

//     const onTime = (data) => {
//       const seconds = Math.floor(data.seconds || 0);
//       maxReachedRef.current = Math.max(maxReachedRef.current, seconds);
//     };
//     const onSeeked = async () => {
//       try {
//         const cur = await player.getCurrentTime();
//         const allowed = (maxReachedRef.current || 0) + 1;
//         if (cur > allowed) {
//           await player.setCurrentTime(allowed);
//           toast.warning("You can't fast-forward yet.");
//         }
//       } catch {}
//     };
//     const onEnded = () => {
//       setVideoEnded(true);
//       if (activeLesson?.key) {
//         setProgressState((p) => ({
//           ...p,
//           byLesson: {
//             ...p.byLesson,
//             [activeLesson.key]: {
//               ...(p.byLesson?.[activeLesson.key] || {}),
//               videoEnded: true,
//               updatedAt: Date.now(),
//             },
//           },
//         }));
//       }
//     };

//     player.on("timeupdate", onTime);
//     player.on("seeked", onSeeked);
//     player.on("ended", onEnded);

//     return () => {
//       try {
//         player.off("timeupdate", onTime);
//         player.off("seeked", onSeeked);
//         player.off("ended", onEnded);
//         player.destroy?.();
//       } catch {}
//       vimeoPlayerRef.current = null;
//     };
//   }, [vimeoApiReady, vimeoId, activeLesson?.key]);

//   /* ---------- HTML5 controls ---------- */
//   const onVideoTimeUpdate = () => {
//     if (!videoRef.current) return;
//     const seconds = Math.floor(videoRef.current.currentTime || 0);
//     maxReachedRef.current = Math.max(maxReachedRef.current, seconds);
//   };
//   const onVideoSeeking = () => {
//     if (!videoRef.current) return;
//     const cur = videoRef.current.currentTime || 0;
//     const allowed = (maxReachedRef.current || 0) + 1;
//     if (cur > allowed) {
//       videoRef.current.currentTime = allowed;
//       toast.warning("You can't fast-forward yet.");
//     }
//   };
//   const onVideoEnded = () => {
//     setVideoEnded(true);
//     if (activeLesson?.key) {
//       setProgressState((p) => ({
//         ...p,
//         byLesson: {
//           ...p.byLesson,
//           [activeLesson.key]: {
//             ...(p.byLesson?.[activeLesson.key] || {}),
//             videoEnded: true,
//             updatedAt: Date.now(),
//           },
//         },
//       }));
//     }
//   };

//   /* ---------- Submit exercises: evaluate + save + persist ---------- */
//   const totalLessons = useMemo(
//     () => units.reduce((acc, u) => acc + (u.lessons?.length || 0), 0),
//     [units]
//   );

//   // ✅ Reemplaza tu onSubmitExercises entero por este
//   const onSubmitExercises = async () => {
//     // 0) Default snapshot y resultados para lecciones SIN ejercicios
//     let allGood = true; // 0/0 -> todo bien
//     let correct = 0;
//     let total = 0;
//     let snap = { answers: {}, order: {}, matching: {} };

//     // 1) Si existe ExerciseRunner (lecciones con ejercicios), usamos su evaluación
//     if (exerciseRef.current) {
//       const res = exerciseRef.current.evaluate(); // calcula correct/total
//       allGood = !!res.allGood;
//       correct = Number(res.correct || 0);
//       total = Number(res.total || 0);
//       snap = exerciseRef.current.snapshot?.() || snap; // respuestas del usuario
//     }

//     // 2) Referencias de la lección activa
//     const lessonKey = activeLesson?.key;
//     const unitId = units[activeU]?.id || null;
//     const lessonId = units[activeU]?.lessons?.[activeL]?.lessonId || null;

//     // 3) Construye el próximo snapshot de progreso
//     const prevByLesson = progressRef.current?.byLesson || {};
//     const updatedEntry = {
//       ...(prevByLesson[lessonKey] || {}),
//       // ✅ Marcamos videoEnded: true incluso sin video (intro/cierre/PDF/force)
//       videoEnded: true,
//       exSubmitted: true,
//       exPassed: allGood,
//       score: { correct, total },
//       answers: snap,
//       updatedAt: Date.now(),
//     };
//     const nextByLesson = { ...prevByLesson, [lessonKey]: updatedEntry };
//     const nextProgress = {
//       byLesson: nextByLesson,
//       lastActive: { unitId, lessonId },
//     };

//     // 4) Actualiza UI
//     setExSubmitted(true);
//     setExPassed(allGood);
//     setLastScore({ correct, total });
//     setProgressState(nextProgress);

//     // 5) Persiste en Firestore (bajo alumnos/{email}.progress[courseId])
//     try {
//       const userRef = doc(firestore, "alumnos", usuario.email);

//       const courseMeta = {
//         id: courseId,
//         title: course?.titulo || "Course",
//         totalUnits: units.length,
//         totalLessons,
//       };
//       const courseStructure = buildCourseStructure(units);
//       const stats = computeStats(nextByLesson, totalLessons, pdfKeySet);

//       const payload = {
//         courseId,
//         courseMeta,
//         courseStructure,
//         progress: nextProgress,
//         stats,
//         updatedAt: serverTimestamp(),
//       };

//       await setDoc(
//         userRef,
//         { progress: { [courseId]: payload } },
//         { merge: true }
//       );
//     } catch (e) {
//       console.error("Error saving progress:", e);
//       toast.error("We couldn't save your progress.");
//     }

//     // 6) Feedback amigable
//     if (total === 0) {
//       // Intro/cierre/PDF sin ejercicios
//       toast.success("Marked as done. You can continue.");
//     } else if (allGood) {
//       toast.success(`Perfect! (${correct}/${total})`);
//     } else {
//       toast.error(`Some answers are wrong (${correct}/${total}).`);
//     }
//   };

//   // Derived UI
//   const percentage = useMemo(
//     () => calcPercentage(completedLessons, totalLessons),
//     [completedLessons, totalLessons]
//   );

//   const hasPdf = isHttpUrl(activeLesson?.pdfUrl || "");
//   const hasVideo =
//     !!getVimeoId(activeLesson?.videoUrl || "") || !!resolvedVideoUrl;
//   const forceOpen =
//     !!activeLesson?.forceExercises || activeLesson?.type === "capstone";

//   // ✅ Nuevo: detecta "no hay media"
//   const noMedia = !hasVideo && !hasPdf;

//   // ✅ Nuevo: si no hay media, habilitamos ejercicios / "Mark as done" igual
//   const canShowExercises = hasVideo
//     ? videoEnded || forceOpen
//     : hasPdf || forceOpen || noMedia;

//   // ✅ Para pasar a la siguiente: requiere submit y las mismas condiciones.
//   //    En el caso "no media", `!hasVideo` ya habilitaba avanzar una vez enviado.
//   const canShowNext =
//     exSubmitted &&
//     (hasVideo ? videoEnded || forceOpen : hasPdf || forceOpen || !hasVideo);

//   /* ---------- Navigate to next lesson ---------- */
//   const goNextLesson = () => {
//     if (!canShowNext) {
//       if (!videoEnded) toast.warning("Finish the video first.");
//       else toast.warning("Submit the exercises to continue.");
//       return;
//     }
//     const currentIdx = indexOfLesson(activeU, activeL);
//     const nextIdx = currentIdx + 1;
//     if (nextIdx < flatLessons.length) {
//       const next = flatLessons[nextIdx];
//       setActiveU(next.uIdx);
//       setActiveL(next.lIdx);
//       setExpandedUnits((prev) => ({ ...prev, [next.uIdx]: true }));
//       // Local pointer update (persisted on next submit)
//       setProgressState((p) => ({
//         ...p,
//         lastActive: {
//           unitId: units[next.uIdx]?.id || null,
//           lessonId: units[next.uIdx]?.lessons?.[next.lIdx]?.lessonId || null,
//         },
//       }));
//     } else {
//       toast.success("🎉 Course completed!");
//     }
//   };

//   /* ---------- UI handlers ---------- */
//   const handleLessonClick = (uIdx, lIdx, locked) => {
//     if (locked) {
//       toast.warning("Locked lesson. Complete previous lessons first.");
//       return;
//     }
//     setActiveU(uIdx);
//     setActiveL(lIdx);
//     setExpandedUnits((prev) => ({ ...prev, [uIdx]: true }));
//     setProgressState((p) => ({
//       ...p,
//       lastActive: {
//         unitId: units[uIdx]?.id || null,
//         lessonId: units[uIdx]?.lessons?.[lIdx]?.lessonId || null,
//       },
//     }));
//   };

//   const toggleUnit = (unitIndex) => {
//     setExpandedUnits((prev) => ({ ...prev, [unitIndex]: !prev[unitIndex] }));
//   };

//   /* ---------- Guards ---------- */
//   if (!courseId || loading) {
//     return (
//       <div className="min-h-[60vh] grid place-items-center bg-[#0B1220]">
//         <div className="flex flex-col items-center gap-3 text-slate-300">
//           <div className="w-10 h-10 border-4 border-yellow-400/80 border-t-transparent rounded-full animate-spin" />
//           <div className="text-sm">Loading course…</div>
//         </div>
//       </div>
//     );
//   }

//   const emailOk = !!usuario?.email && ownership.emailOk;
//   const idOk = ownership.idOk;
//   if (!course || !idOk || !emailOk) {
//     return (
//       <div className="min-h-[60vh] grid place-items-center px-6 bg-[#0B1220]">
//         <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 shadow p-6 text-center">
//           <div className="mx-auto w-12 h-12 rounded-full bg-yellow-400/20 text-yellow-400 grid place-items-center">
//             <FiAlertTriangle />
//           </div>
//           <h2 className="mt-3 text-lg font-bold text-white">No access</h2>
//           <p className="mt-1 text-sm text-slate-300">
//             Sign in with the correct account or purchase the course.
//           </p>
//           <button
//             onClick={() => router.push("/")}
//             className="mt-4 inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300"
//           >
//             Go home
//           </button>
//         </div>
//       </div>
//     );
//   }

//   /* ---------- UI ---------- */
//   const courseTitle = course?.titulo || "Course";
//   const courseDesc = course?.descripcion || "Course description";
//   const thumb = course?.urlImagen || "";

//   const savedSnapshot =
//     progressState.byLesson?.[activeLesson?.key || ""]?.answers || null;

//   const itemsCount = activeLesson?.exercises?.length || 0;
//   const showExerciseRunner =
//     itemsCount > 0 && activeLesson?.type !== "capstone";

//   return (
//     <>
//       <Script
//         src="https://player.vimeo.com/api/player.js"
//         strategy="afterInteractive"
//         onLoad={() => setVimeoApiReady(true)}
//       />

//       <div
//         className="bg-[#0B1220] text-slate-200"
//         style={{ minHeight: "100vh" }}
//       >
//         <div className="flex" style={{ height: "100vh" }}>
//           {/* Sidebar */}
//           <aside className="hidden lg:flex lg:flex-col lg:w-80 lg:shrink-0 bg-[#0F172A] border-r border-slate-800/80 overflow-y-auto">
//             <div className="p-4 border-b border-slate-800">
//               <div className="flex items-center gap-3">
//                 <div>
//                   <div className="font-bold text-white line-clamp-1">
//                     {courseTitle}
//                   </div>
//                   <div className="text-xs text-slate-400 line-clamp-1">
//                     {courseDesc}
//                   </div>
//                 </div>
//               </div>

//               <div className="mt-4">
//                 <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
//                   <span className="font-medium">Overall progress</span>
//                   <span className="font-semibold text-white">
//                     {percentage}%
//                   </span>
//                 </div>
//                 <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
//                   <div
//                     className="h-full bg-yellow-400 rounded-full transition-all duration-300"
//                     style={{ width: `${percentage}%` }}
//                   />
//                 </div>
//                 <div className="mt-2 text-xs text-slate-400">
//                   {Object.values(completedLessons).filter(Boolean).length} of{" "}
//                   {totalLessons} lessons
//                 </div>
//               </div>
//             </div>

//             {/* Units with Accordion */}
//             {/* Units with Accordion */}
//             <nav className="p-3 flex-1">
//               <div className="space-y-2">
//                 {units.map((unit, unitIndex) => (
//                   <UnitAccordion
//                     key={unit.id}
//                     unit={unit}
//                     unitIndex={unitIndex}
//                     isExpanded={!!expandedUnits[unitIndex]}
//                     onToggle={() => toggleUnit(unitIndex)}
//                     activeU={activeU}
//                     activeL={activeL}
//                     completedLessons={completedLessons}
//                     onLessonClick={handleLessonClick}
//                     isLocked={isLocked}
//                     lessonNumberMap={lessonNumberMap} // <-- NUEVO
//                   />
//                 ))}
//               </div>
//             </nav>

//             <div className="mt-auto p-4 text-xs text-slate-500 border-t border-slate-800">
//               © {new Date().getFullYear()} Further Academy
//             </div>
//           </aside>

//           {/* Main */}
//           <main className="flex-1 flex flex-col overflow-y-auto">
//             <header className="sticky top-0 z-40 bg-[#0F172A]/95 backdrop-blur border-b border-slate-800 px-3 sm:px-4 py-2.5">
//               <div className="flex items-center justify-between gap-2">
//                 {/* Izquierda: Back */}
//                 <div className="flex items-center">
//                   {/* Botón compacto en mobile */}
//                   <button
//                     onClick={() => router.push("/dashboard")}
//                     type="button"
//                     className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 active:scale-[.98] transition"
//                     aria-label="Volver al dashboard"
//                   >
//                     <FiChevronLeft size={18} />
//                   </button>

//                   {/* Botón con texto en >= sm */}
//                   <button
//                     onClick={() => router.push("/dashboard")}
//                     type="button"
//                     className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800"
//                   >
//                     <FiChevronLeft />
//                     <span className="text-sm">Back to dashboard</span>
//                   </button>
//                 </div>

//                 {/* Centro: Título (queda a la izquierda en >= sm) */}
//                 <div className="flex items-center gap-2 min-w-0 sm:order-none order-[-1] sm:mx-0">
//                   <FiBookOpen className="text-yellow-400 shrink-0" />
//                   <h1 className="truncate text-base sm:text-lg font-semibold text-white">
//                     {courseTitle}
//                   </h1>
//                 </div>

//                 {/* Derecha: Progreso + menú */}
//                 <div className="flex items-center gap-2 sm:gap-3">
//                   {/* Chip de progreso compacto en mobile */}
//                   <div className="sm:hidden inline-flex items-center px-2 py-1 text-[11px] rounded-md border border-slate-700 text-slate-200">
//                     {percentage}%
//                   </div>

//                   {/* Texto normal en >= sm */}
//                   <div className="hidden sm:block text-sm text-slate-300">
//                     {percentage}% completed
//                   </div>

//                   {/* Menú (hamburguesa) mejorado */}
//                   <button
//                     type="button"
//                     className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 active:scale-[.98] transition"
//                     onClick={() => setMobileNavOpen(true)}
//                     aria-label="Abrir menú del curso"
//                     aria-expanded={mobileNavOpen ? "true" : "false"}
//                   >
//                     <FiMenu size={18} />
//                   </button>
//                 </div>
//               </div>
//             </header>

//             {/* Drawer Mobile (sidebar en pantallas chicas) */}
//             {mobileNavOpen && (
//               <div className="fixed inset-0 z-50">
//                 {/* overlay */}
//                 <div
//                   className="absolute inset-0 bg-black/60"
//                   onClick={() => setMobileNavOpen(false)}
//                 />

//                 {/* panel */}
//                 <div className="absolute inset-y-0 left-0 w-[88%] max-w-sm bg-[#0F172A] border-r border-slate-800 shadow-xl flex flex-col">
//                   {/* Top: título + cerrar */}
//                   <div className="p-4 border-b border-slate-800 flex items-center justify-between">
//                     <div className="flex items-center gap-3">
//                       <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-800">
//                         {thumb ? (
//                           <Image
//                             src={thumb}
//                             alt={courseTitle}
//                             fill
//                             className="object-cover"
//                           />
//                         ) : (
//                           <div className="w-full h-full grid place-items-center text-slate-500 text-[10px]">
//                             No image
//                           </div>
//                         )}
//                       </div>
//                       <div>
//                         <div className="font-semibold text-white line-clamp-1">
//                           {courseTitle}
//                         </div>
//                         <div className="text-[11px] text-slate-400 line-clamp-1">
//                           {courseDesc}
//                         </div>
//                       </div>
//                     </div>
//                     <button
//                       type="button"
//                       onClick={() => setMobileNavOpen(false)}
//                       className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800"
//                       aria-label="Close menu"
//                     >
//                       <FiX />
//                     </button>
//                   </div>

//                   {/* Progreso */}
//                   <div className="p-4 border-b border-slate-800">
//                     <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
//                       <span className="font-medium">Overall progress</span>
//                       <span className="font-semibold text-white">
//                         {percentage}%
//                       </span>
//                     </div>
//                     <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
//                       <div
//                         className="h-full bg-yellow-400 rounded-full transition-all duration-300"
//                         style={{ width: `${percentage}%` }}
//                       />
//                     </div>
//                     <div className="mt-2 text-xs text-slate-400">
//                       {Object.values(completedLessons).filter(Boolean).length}{" "}
//                       of {totalLessons} lessons
//                     </div>
//                   </div>

//                   {/* Navegación de unidades (mismo acordeón) */}
//                   <nav className="p-3 flex-1 overflow-y-auto">
//                     <div className="space-y-2">
//                       {units.map((unit, unitIndex) => (
//                         <UnitAccordion
//                           key={unit.id}
//                           unit={unit}
//                           unitIndex={unitIndex}
//                           isExpanded={!!expandedUnits[unitIndex]}
//                           onToggle={() => toggleUnit(unitIndex)}
//                           activeU={activeU}
//                           activeL={activeL}
//                           completedLessons={completedLessons}
//                           isLocked={isLocked}
//                           onLessonClick={(uIdx, lIdx, locked) => {
//                             handleLessonClick(uIdx, lIdx, locked);
//                             setMobileNavOpen(false);
//                           }}
//                           lessonNumberMap={lessonNumberMap} // <-- NUEVO
//                         />
//                       ))}
//                     </div>
//                   </nav>

//                   <div className="p-4 text-xs text-slate-500 border-t border-slate-800">
//                     © {new Date().getFullYear()} Further Academy
//                   </div>
//                 </div>
//               </div>
//             )}

//             <section className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
//               <div className="xl:col-span-2">
//                 <div className="bg-[#0F172A] rounded-2xl border border-slate-800 overflow-hidden">
//                   <div className="p-4 border-b border-slate-800">
//                     <div className="text-sm font-semibold text-yellow-400">
//                       {units[activeU]?.title || "Unit"}
//                     </div>
//                     <h2 className="text-xl font-bold text-white">
//                       {/* Muestra "1.3 — Title" si aplica */}
//                       {lessonNumberMap[activeLesson?.key || ""]
//                         ? `${lessonNumberMap[activeLesson.key]} — `
//                         : ""}
//                       {activeLesson?.title || "Lesson"}
//                     </h2>

//                     <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
//                       <span>
//                         Lesson {indexOfLesson(activeU, activeL) + 1} of{" "}
//                         {totalLessons}
//                       </span>
//                       {activeLesson?.duration && (
//                         <span className="flex items-center gap-1">
//                           <FiClock size={12} /> {activeLesson.duration}min
//                         </span>
//                       )}
//                     </div>
//                   </div>
//                   {/* Lesson text (if any) + Media (Video or PDF) */}
//                   <div className="p-4">
//                     {/* 1) TEXT ABOVE MEDIA (only if lesson.text exists) */}
//                     {(() => {
//                       // ⚙️ Leemos el texto crudo de la lección activa
//                       const raw = activeLesson?.text || "";
//                       // ⚙️ Chequeamos si hay texto útil
//                       const hasText =
//                         typeof raw === "string" && raw.trim().length > 0;

//                       // 🧱 Si no hay texto, no rendereamos nada acá
//                       if (!hasText) return null;

//                       return (
//                         <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
//                           {/* Título opcional del bloque */}
//                           <div className="text-sm font-semibold text-slate-200 mb-2">
//                             Lesson notes
//                           </div>
//                           {/* Texto en párrafos bonitos */}
//                           <div className="space-y-3">
//                             {renderLessonText(raw)}
//                           </div>
//                         </div>
//                       );
//                     })()}

//                     {/* 2) MEDIA: PDF (embebido) o VIDEO (Vimeo/HTML5)
//       Nota: usamos el hasPdf "outer" que ya definiste arriba para gating */}
//                     {(() => {
//                       const vId = getVimeoId(activeLesson?.videoUrl || "");
//                       const pdfUrl = activeLesson?.pdfUrl || "";
//                       const embedSrc = toEmbedPdfUrl(pdfUrl);

//                       // 1) VIDEO primero (Vimeo o HTML5)
//                       if ((activeLesson?.videoUrl && vId) || vimeoSrc) {
//                         return (
//                           <>
//                             <iframe
//                               key={vimeoSrc || vId}
//                               ref={iframeRef}
//                               src={vimeoSrc || buildVimeoEmbedSrc(vId)}
//                               allow="autoplay; fullscreen; picture-in-picture"
//                               allowFullScreen
//                               className="w-full aspect-video rounded-lg bg-black"
//                             />
//                             {/* 2) PDF solo después de terminar el video */}
//                             {hasPdf && videoEnded && (
//                               <div className="mt-4 relative">
//                                 <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-slate-900 border border-slate-800">
//                                   <iframe
//                                     src={embedSrc}
//                                     title="Lesson PDF"
//                                     className="w-full h-full"
//                                     loading="lazy"
//                                   />
//                                 </div>
//                                 <div className="mt-3 flex items-center gap-2">
//                                   <button
//                                     onClick={() => setPdfModalOpen(true)}
//                                     className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
//                                     type="button"
//                                   >
//                                     <FiMaximize />
//                                     <span>Open full screen</span>
//                                   </button>
//                                   <a
//                                     href={pdfUrl}
//                                     target="_blank"
//                                     rel="noreferrer"
//                                     className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
//                                   >
//                                     <FiPlay />
//                                     <span>Open in new tab</span>
//                                   </a>
//                                 </div>
//                               </div>
//                             )}
//                           </>
//                         );
//                       }

//                       if (resolvedVideoUrl) {
//                         return (
//                           <>
//                             <video
//                               key={resolvedVideoUrl}
//                               ref={videoRef}
//                               src={resolvedVideoUrl}
//                               controls
//                               onTimeUpdate={onVideoTimeUpdate}
//                               onSeeking={onVideoSeeking}
//                               onEnded={onVideoEnded}
//                               className="w-full aspect-video rounded-lg bg-black"
//                             />
//                             {hasPdf && videoEnded && (
//                               <div className="mt-4 relative">
//                                 <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-slate-900 border border-slate-800">
//                                   <iframe
//                                     src={embedSrc}
//                                     title="Lesson PDF"
//                                     className="w-full h-full"
//                                     loading="lazy"
//                                   />
//                                 </div>
//                                 <div className="mt-3 flex items-center gap-2">
//                                   <button
//                                     onClick={() => setPdfModalOpen(true)}
//                                     className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
//                                     type="button"
//                                   >
//                                     <FiMaximize />
//                                     <span>Open full screen</span>
//                                   </button>
//                                   <a
//                                     href={pdfUrl}
//                                     target="_blank"
//                                     rel="noreferrer"
//                                     className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
//                                   >
//                                     <FiPlay />
//                                     <span>Open in new tab</span>
//                                   </a>
//                                 </div>
//                               </div>
//                             )}
//                           </>
//                         );
//                       }

//                       // 3) SIN video: mostrá el PDF inmediatamente (como antes)
//                       if (hasPdf) {
//                         return (
//                           <div className="relative">
//                             <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-slate-900 border border-slate-800">
//                               <iframe
//                                 src={embedSrc}
//                                 title="Lesson PDF"
//                                 className="w-full h-full"
//                                 loading="lazy"
//                               />
//                             </div>
//                             <div className="mt-3 flex items-center gap-2">
//                               <button
//                                 onClick={() => setPdfModalOpen(true)}
//                                 className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
//                                 type="button"
//                               >
//                                 <FiMaximize />
//                                 <span>Open full screen</span>
//                               </button>
//                               <a
//                                 href={pdfUrl}
//                                 target="_blank"
//                                 rel="noreferrer"
//                                 className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
//                               >
//                                 <FiPlay />
//                                 <span>Open in new tab</span>
//                               </a>
//                             </div>
//                           </div>
//                         );
//                       }

//                       // 🪫 Sin media
//                       return null;
//                     })()}

//                     {/* --- CAPSTONE EXTRA UI --- */}
//                     {activeLesson?.type === "capstone" && (
//                       <div className="mt-4 space-y-4">
//                         {/* Instrucciones */}
//                         {activeLesson?.text?.trim() && (
//                           <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
//                             <div className="text-sm font-semibold text-slate-200 mb-2">
//                               Capstone instructions
//                             </div>
//                             <div className="space-y-3">
//                               {renderLessonText(activeLesson.text)}
//                             </div>
//                           </div>
//                         )}

//                         {/* Checklist */}
//                         <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
//                           <div className="text-sm font-semibold text-slate-200 mb-2">
//                             Checklist
//                           </div>
//                           {Array.isArray(activeLesson?.checklist) &&
//                           activeLesson.checklist.length > 0 ? (
//                             <ul className="space-y-2">
//                               {activeLesson.checklist.map((item, idx) => {
//                                 const checked = !!capChecklist[idx];
//                                 return (
//                                   <li
//                                     key={idx}
//                                     className="flex items-start gap-2"
//                                   >
//                                     <input
//                                       type="checkbox"
//                                       className="mt-1"
//                                       checked={checked}
//                                       onChange={(e) =>
//                                         setCapChecklist((s) => ({
//                                           ...s,
//                                           [idx]: e.target.checked,
//                                         }))
//                                       }
//                                     />
//                                     <span className="text-slate-300">
//                                       {item}
//                                     </span>
//                                   </li>
//                                 );
//                               })}
//                             </ul>
//                           ) : (
//                             <div className="text-sm text-slate-400">
//                               No checklist items provided.
//                             </div>
//                           )}
//                         </div>

//                         {/* Drive link */}
//                         <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
//                           <div className="flex items-center justify-between gap-2 mb-2">
//                             <div className="text-sm font-semibold text-slate-200">
//                               Submission link (Google Drive)
//                             </div>
//                             <button
//                               type="button"
//                               onClick={() => setShowDriveHelp(true)}
//                               className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-200 hover:bg-slate-800"
//                             >
//                               How to share from Drive
//                             </button>
//                           </div>
//                           <input
//                             placeholder="Paste a public Google Drive link (Anyone with the link can view)"
//                             className="w-full rounded bg-slate-800 border border-slate-700 focus:border-yellow-400 p-2 outline-none"
//                             value={capDriveLink}
//                             onChange={(e) => setCapDriveLink(e.target.value)}
//                           />
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                   {/* Video status (solo para lecciones con video) */}
//                   {hasVideo && !videoEnded && (
//                     <div className="px-4 pb-2">
//                       <div className="flex items-center gap-2 text-sm text-slate-400">
//                         <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
//                         <span>
//                           Playing video… finish it to unlock exercises.
//                         </span>
//                       </div>
//                     </div>
//                   )}
//                   {/* Exercises */}
//                   {canShowExercises && showExerciseRunner && (
//                     <div className="px-4 pb-4">
//                       <div className="flex items-center gap-2 mb-4">
//                         <div className="text-lg font-semibold text-slate-200">
//                           Exercises
//                         </div>
//                         {(videoEnded || hasPdf) && (
//                           <div className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
//                             {hasPdf ? "PDF available" : "Video completed"}
//                           </div>
//                         )}
//                       </div>

//                       <ExerciseRunner
//                         ref={exerciseRef}
//                         items={activeLesson?.exercises || []}
//                         showCorrections={exSubmitted}
//                         initialSnapshot={savedSnapshot}
//                       />

//                       {exSubmitted && lastScore && (
//                         <div
//                           className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
//                             exPassed
//                               ? "border-emerald-600/50 bg-emerald-500/10 text-emerald-300"
//                               : "border-orange-600/50 bg-orange-500/10 text-orange-300"
//                           }`}
//                         >
//                           <div className="flex items-center justify-between">
//                             <span>
//                               {exPassed
//                                 ? "Perfect! All answers are correct"
//                                 : "Exercises submitted with some errors"}
//                             </span>
//                             <span className="font-semibold">
//                               {lastScore.correct}/{lastScore.total}
//                             </span>
//                           </div>
//                         </div>
//                       )}

//                       {exSubmitted &&
//                         Boolean(activeLesson?.finalMessage?.trim()) && (
//                           <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
//                             <div className="text-sm font-semibold text-slate-200 mb-2">
//                               Final message
//                             </div>
//                             <div className="space-y-3">
//                               {renderLessonText(activeLesson.finalMessage)}
//                             </div>
//                           </div>
//                         )}
//                     </div>
//                   )}

//                   {exSubmitted &&
//                     !showExerciseRunner &&
//                     Boolean(activeLesson?.finalMessage?.trim()) && (
//                       <div className="px-4 pb-4">
//                         <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
//                           <div className="text-sm font-semibold text-slate-200 mb-2">
//                             Final message
//                           </div>
//                           <div className="space-y-3">
//                             {renderLessonText(activeLesson.finalMessage)}
//                           </div>
//                         </div>
//                       </div>
//                     )}
//                   {/* Footer actions */}
//                   <div className="p-4 bg-[#0B1220] border-t border-slate-800">
//                     {hasVideo && !hasPdf && !videoEnded && (
//                       <div className="text-center text-sm text-slate-300">
//                         <FiPlay className="inline mr-2" size={14} />
//                         Watch the full video to unlock exercises.
//                       </div>
//                     )}

//                     {canShowExercises && !exSubmitted && (
//                       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
//                         <div className="text-sm text-slate-300">
//                           {(activeLesson?.exercises?.length || 0) > 0 ||
//                           activeLesson?.type === "capstone"
//                             ? "Complete the tasks to continue."
//                             : "This lesson has no exercises, submit to continue."}
//                         </div>
//                         <button
//                           onClick={
//                             activeLesson?.type === "capstone"
//                               ? onSubmitCapstone
//                               : onSubmitExercises
//                           }
//                           className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold shadow bg-yellow-400 text-slate-900 hover:bg-yellow-300"
//                         >
//                           {activeLesson?.type === "capstone"
//                             ? "Submit capstone"
//                             : (activeLesson?.exercises?.length || 0) > 0
//                             ? "Submit exercises"
//                             : "Mark as done"}
//                         </button>
//                       </div>
//                     )}

//                     {canShowNext && (
//                       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
//                         <div className="text-sm text-slate-300">
//                           <FiCheckCircle
//                             className="inline mr-2 text-emerald-400"
//                             size={14}
//                           />
//                           Done! You can move to the next lesson.
//                         </div>
//                         <button
//                           onClick={goNextLesson}
//                           className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold shadow bg-yellow-400 text-slate-900 hover:bg-yellow-300"
//                         >
//                           {indexOfLesson(activeU, activeL) + 1 <
//                           totalLessons ? (
//                             <>
//                               Next lesson <FiChevronRight />
//                             </>
//                           ) : (
//                             "Finish course"
//                           )}
//                         </button>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </div>

//               {/* Sidebar Info */}
//               <aside className="xl:col-span-1">
//                 <div className="bg-[#0F172A] rounded-2xl border border-slate-800 p-4">
//                   <div className="flex items-center gap-2 text-slate-200 font-semibold mb-4">
//                     <FiBookOpen className="text-yellow-400" />
//                     <span>Course summary</span>
//                   </div>

//                   <p className="text-sm text-slate-400 mb-4">{courseDesc}</p>

//                   <div className="space-y-3 text-sm">
//                     <div className="flex items-center justify-between">
//                       <span className="text-slate-300">Total lessons</span>
//                       <span className="font-bold text-white">
//                         {totalLessons}
//                       </span>
//                     </div>
//                     <div className="flex items-center justify-between">
//                       <span className="text-slate-300">Completed</span>
//                       <span className="font-bold text-emerald-400">
//                         {Object.values(completedLessons).filter(Boolean).length}
//                       </span>
//                     </div>
//                     <div className="flex items-center justify-between">
//                       <span className="text-slate-300">Current lesson</span>
//                       <span className="font-bold text-yellow-400">
//                         {indexOfLesson(activeU, activeL) + 1}
//                       </span>
//                     </div>
//                   </div>

//                   <div className="mt-4 pt-4 border-t border-slate-800">
//                     <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
//                       <span className="font-medium">Total progress</span>
//                       <span className="font-semibold text-white">
//                         {percentage}%
//                       </span>
//                     </div>
//                     <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
//                       <div
//                         className="h-full bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full transition-all duration-500"
//                         style={{ width: `${percentage}%` }}
//                       />
//                     </div>
//                   </div>

//                   {/* Next lesson hint */}
//                   {(() => {
//                     const currentIdx = indexOfLesson(activeU, activeL);
//                     const nextIdx = currentIdx + 1;
//                     const nextLesson = flatLessons[nextIdx];
//                     if (nextLesson && canShowNext) {
//                       const nextUnit = units[nextLesson.uIdx];
//                       const nextLessonData =
//                         nextUnit?.lessons?.[nextLesson.lIdx];
//                       return (
//                         <div className="mt-4 pt-4 border-t border-slate-800">
//                           <div className="text-sm font-semibold text-slate-200 mb-2">
//                             Next lesson
//                           </div>
//                           <div className="text-xs text-slate-400">
//                             <div className="font-medium text-slate-300">
//                               {nextLessonData?.title}
//                             </div>
//                             <div className="mt-1">{nextUnit?.title}</div>
//                           </div>
//                         </div>
//                       );
//                     }
//                     if (currentIdx + 1 >= totalLessons && canShowNext) {
//                       return (
//                         <div className="mt-4 pt-4 border-t border-slate-800">
//                           <div className="text-sm font-semibold text-emerald-400 mb-2">
//                             🎉 Course completed!
//                           </div>
//                           <div className="text-xs text-slate-400">
//                             You finished all the lessons.
//                           </div>
//                         </div>
//                       );
//                     }
//                     return null;
//                   })()}
//                 </div>
//               </aside>
//             </section>
//           </main>
//         </div>
//       </div>

//       {/* Drive Help Modal */}
//       {showDriveHelp && (
//         <div
//           className="fixed inset-0 z-[1000] bg-black/80"
//           onClick={() => setShowDriveHelp(false)}
//           aria-modal="true"
//           role="dialog"
//         >
//           <div
//             className="absolute inset-4 md:inset-20 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-2xl"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="h-12 px-4 flex items-center justify-between border-b border-slate-800 bg-[#0F172A]">
//               <div className="text-slate-200 text-sm font-medium">
//                 Share a video from Google Drive
//               </div>
//               <button
//                 onClick={() => setShowDriveHelp(false)}
//                 className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
//                 type="button"
//               >
//                 Close
//               </button>
//             </div>
//             <div className="p-4 space-y-3 text-sm text-slate-300">
//               <ol className="list-decimal list-inside space-y-2">
//                 <li>Upload your video to Google Drive.</li>
//                 <li>Right-click the file → “Share”.</li>
//                 <li>Under “General access”, select “Anyone with the link”.</li>
//                 <li>Permission should be “Viewer”.</li>
//                 <li>
//                   Click “Copy link” and paste it into the field in this page.
//                 </li>
//               </ol>
//               <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
//                 <div className="font-semibold text-slate-200 mb-1">Tip</div>
//                 <p>
//                   If you want to embed the video, convert the share link to a
//                   preview URL using <code>/preview</code> at the end.
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* PDF Fullscreen Modal */}
//       {pdfModalOpen && (
//         <div
//           className="fixed inset-0 z-[999] bg-black/80"
//           onClick={() => setPdfModalOpen(false)}
//           aria-modal="true"
//           role="dialog"
//         >
//           <div
//             className="absolute inset-4 md:inset-10 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-2xl"
//             onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
//           >
//             <div className="h-12 px-4 flex items-center justify-between border-b border-slate-800 bg-[#0F172A]">
//               <div className="text-slate-200 text-sm font-medium">
//                 PDF viewer
//               </div>
//               <button
//                 onClick={() => setPdfModalOpen(false)}
//                 className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
//                 type="button"
//               >
//                 Close (Esc)
//               </button>
//             </div>
//             <div className="w-full h-[calc(100%-3rem)] bg-slate-900">
//               <iframe
//                 src={toEmbedPdfUrl(activeLesson?.pdfUrl || "")}
//                 title="PDF Fullscreen"
//                 className="w-full h-full"
//               />
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }