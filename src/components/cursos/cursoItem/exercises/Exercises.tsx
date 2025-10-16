"use client";

import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";

// ===== Definiciones de tipo para los ejercicios =====

interface ExerciseBase {
  id: string;
}

interface MultipleChoiceExercise extends ExerciseBase {
  type: "multiple_choice";
  question: string;
  options: string[];
  correctIndex: number;
}

interface TrueFalseExercise extends ExerciseBase {
  type: "true_false";
  statement: string;
  answer: boolean;
}

interface FillBlankExercise extends ExerciseBase {
  type: "fill_blank";
  title: string;
  sentence: string;
  answers: string[];
  hintWords: string;
}

interface TextExercise extends ExerciseBase {
  type: "text";
  prompt: string;
  maxLength: number;
}

interface ReorderExercise extends ExerciseBase {
  type: "reorder";
  title: string;
  items: string[];
  correctOrder: number[];
}

interface MatchingExercise extends ExerciseBase {
  type: "matching";
  title: string;
  pairs: { left: string; right: string }[];
}

type Exercise =
  | MultipleChoiceExercise
  | TrueFalseExercise
  | FillBlankExercise
  | TextExercise
  | ReorderExercise
  | MatchingExercise;

// ===== Props del componente =====

interface ExercisesProps {
  initial?: Exercise[];
  onChange?: (exercises: Exercise[]) => void;
}

// ===== Implementación del componente =====

export default function Exercises({ initial = [], onChange }: ExercisesProps) {
  // ===== UI y estado de renderización =====
  const [snapshot, setSnapshot] = useState<Exercise[]>([]);
  const [savedMessage, setSavedMessage] = useState<string>("");
  const [touched, setTouched] = useState<boolean>(false);
  const [activeIdx, setActiveIdx] = useState<number>(0);

  // ===== Refs como única fuente de verdad =====
  const exercisesRef = useRef<Exercise[]>(initial ? structuredClone(initial) : []);
  const validationsRef = useRef<Record<string, boolean>>({});
  const mountedRef = useRef<boolean>(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ===== Utilidades =====
  const makeId = (): string =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const firstLine = (str: string = ""): string => {
    const s = String(str || "");
    const line = s
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0);
    return line || s.trim();
  };

  // ===== Validación por tipo =====
  const validateExercise = (ex: Exercise): boolean => {
    if (!ex || !ex.type) return false;
    switch (ex.type) {
      case "multiple_choice": {
        if (!ex.question || String(ex.question).trim() === "") return false;
        if (!Array.isArray(ex.options) || ex.options.length < 2) return false;
        const opts = ex.options.map((o) => (o ?? "").toString().trim());
        if (opts.filter((o) => o !== "").length < 2) return false;
        const idx = Number(ex.correctIndex);
        if (!Number.isInteger(idx) || idx < 0 || idx >= opts.length)
          return false;
        if (opts[idx] === "") return false;
        return true;
      }
      case "true_false": {
        if (!ex.statement || String(ex.statement).trim() === "") return false;
        return typeof ex.answer === "boolean";
      }
      case "fill_blank": {
        if (
          !ex.sentence ||
          typeof ex.sentence !== "string" ||
          !ex.sentence.includes("***")
        )
          return false;
        const blanks = (ex.sentence.match(/\*\*\*/g) || []).length;
        if (blanks === 0) return false;
        if (!Array.isArray(ex.answers) || ex.answers.length !== blanks)
          return false;
        if (ex.answers.some((a) => (a ?? "").toString().trim() === ""))
          return false;
        return true;
      }
      case "text":
        return !!(ex.prompt && String(ex.prompt).trim().length > 0);
      case "reorder": {
        if (!ex.title || String(ex.title).trim() === "") return false;
        if (!Array.isArray(ex.items) || ex.items.length < 2) return false;
        const nonEmptyItems = ex.items.filter(
          (item) => item && String(item).trim() !== ""
        );
        if (nonEmptyItems.length < 2) return false;
        if (!Array.isArray(ex.correctOrder) || ex.correctOrder.length < 2)
          return false;
        const validIndices = ex.correctOrder.every(
          (i) =>
            Number.isInteger(i) &&
            i >= 0 &&
            i < ex.items.length &&
            ex.items[i] &&
            String(ex.items[i]).trim() !== ""
        );
        return validIndices;
      }
      case "matching": {
        if (!ex.title || String(ex.title).trim() === "") return false;
        if (!Array.isArray(ex.pairs) || ex.pairs.length < 1) return false;
        const ok = ex.pairs.every(
          (p) =>
            p &&
            String(p.left || "").trim() !== "" &&
            String(p.right || "").trim() !== ""
        );
        return ok;
      }
      default:
        return false;
    }
  };

  // ===== Actualización de snapshot con debounce (revalidación) =====
  const updateSnapshot = useCallback(() => {
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = setTimeout(() => {
      exercisesRef.current.forEach((e) => {
        validationsRef.current[e.id] = validateExercise(e);
      });
      setSnapshot([...exercisesRef.current]);
    }, 300);
  }, []);

  // ===== Actualización inmediata de snapshot (cambios estructurales) =====
  const forceSnapshot = useCallback(() => {
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    exercisesRef.current.forEach((e) => {
      validationsRef.current[e.id] = validateExercise(e);
    });
    setSnapshot([...exercisesRef.current]);
  }, []);

  // ===== Montaje inicial =====
  useEffect(() => {
    if (!mountedRef.current) {
      exercisesRef.current = initial ? structuredClone(initial) : [];
      exercisesRef.current.forEach((e) => {
        validationsRef.current[e.id] = validateExercise(e);
      });
      setActiveIdx((idx) =>
        exercisesRef.current.length === 0
          ? 0
          : Math.min(idx, exercisesRef.current.length - 1)
      );
   
       setSnapshot([...exercisesRef.current]);
      mountedRef.current = true;
    }
  }, [initial]);

  // ===== Mutadores de colección =====
  const addExercise = (type: Exercise['type']) => {
    const id = makeId();
    let base: Exercise | null = null;
    switch (type) {
      case "multiple_choice":
        base = { id, type, question: "", options: ["", ""], correctIndex: 0 };
        break;
      case "true_false":
        base = { id, type, statement: "", answer: true };
        break;
      case "fill_blank":
        base = { id, type, title: "", sentence: "", answers: [], hintWords: "" };
        break;
      case "text":
        base = { id, type, prompt: "", maxLength: 500 };
        break;
      case "reorder":
        base = { id, type, title: "", items: [], correctOrder: [] };
        break;
      case "matching":
        base = { id, type, title: "", pairs: [{ left: "", right: "" }] };
        break;
    }

    if (!base) return;
    exercisesRef.current.push(base);
    validationsRef.current[base.id] = validateExercise(base);
    setTouched(true);
    setActiveIdx(exercisesRef.current.length - 1);
    forceSnapshot();
  };

  const duplicateExercise = (id: string) => {
    const ex = exercisesRef.current.find((x) => x.id === id);
    if (!ex) return;
    const copy = structuredClone(ex);
    copy.id = makeId();
    exercisesRef.current.push(copy);
    validationsRef.current[copy.id] = validateExercise(copy);
    setTouched(true);
    setActiveIdx(exercisesRef.current.length - 1);
    forceSnapshot();
  };

  const removeExercise = (id: string) => {
    const arr = exercisesRef.current;
    const idx = arr.findIndex((e) => e.id === id);
    if (idx === -1) return;
    if (!confirm("¿Eliminar este ejercicio?")) return;

    arr.splice(idx, 1);
    delete validationsRef.current[id];

    setActiveIdx((prev) => {
      if (arr.length === 0) return 0;
      return Math.min(prev, arr.length - 1);
    });
    setTouched(true);
    forceSnapshot();
  };

  const swapExercises = (from: number, to: number) => {
    const arr = exercisesRef.current;
    if (to < 0 || to >= arr.length) return;
    [arr[from], arr[to]] = [arr[to], arr[from]];
    setTouched(true);
    setActiveIdx(to);
    forceSnapshot();
  };

  // ===== Mutadores de campo =====
  const updateField = useCallback(
    (id: string, patch: Partial<Exercise>) => {
      const ex = exercisesRef.current.find((x) => x.id === id);
      if (!ex) return;
      Object.assign(ex, patch);
      setTouched(true);
      updateSnapshot(); // validaciones con debounce
    },
    [updateSnapshot]
  );

  const updateFieldImmediate = useCallback(
  (id: string, patch: Partial<Exercise>) => {
    const ex = exercisesRef.current.find((x) => x.id === id);
    if (!ex) return;
    Object.assign(ex, patch);
    setTouched(true);
    setSnapshot((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
    updateSnapshot();
  },
  [updateSnapshot]
);

  // ===== Ayudantes de opción múltiple =====
  const addOption = (id: string) => {
    const ex = exercisesRef.current.find((x) => x.id === id) as MultipleChoiceExercise | undefined;
    if (!ex) return;
    ex.options = Array.isArray(ex.options) ? ex.options : [];
    ex.options.push("");
    setTouched(true);
    forceSnapshot();
  };

  const removeOption = (id: string, idx: number) => {
    const ex = exercisesRef.current.find((x) => x.id === id) as MultipleChoiceExercise | undefined;
    if (!ex || !Array.isArray(ex.options)) return;
    if (ex.options.length <= 2) return;
    ex.options.splice(idx, 1);
    if (ex.correctIndex >= ex.options.length) ex.correctIndex = 0;
    setTouched(true);
    forceSnapshot();
  };

  // ===== Ayudantes de reordenación (vista previa de arrastre) =====
  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, exId: string, idx: number) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ exId, idx }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLLIElement>, exId: string, targetIdx: number) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
      if (!data || data.exId !== exId || data.idx === targetIdx) return;

      const ex = exercisesRef.current.find((x) => x.id === exId) as ReorderExercise | undefined;
      if (!ex || !Array.isArray(ex.items)) return;

      const nonEmptyItems = ex.items.filter(
        (item) => item && item.trim() !== ""
      );
      if (data.idx >= nonEmptyItems.length || targetIdx >= nonEmptyItems.length)
        return;

      const items = [...nonEmptyItems];
      const [moved] = items.splice(data.idx, 1);
      items.splice(targetIdx, 0, moved);

      updateFieldImmediate(exId, { items });
    } catch (error) {
      console.error("Error en arrastrar y soltar:", error);
    }
  };

  // ===== Ayudantes de emparejamiento =====
  const addPair = (id: string) => {
    const ex = exercisesRef.current.find((x) => x.id === id) as MatchingExercise | undefined;
    if (!ex) return;
    ex.pairs = Array.isArray(ex.pairs) ? ex.pairs : [];
    ex.pairs.push({ left: "", right: "" });
    setTouched(true);
    forceSnapshot();
  };

  const removePair = (id: string, idx: number) => {
    const ex = exercisesRef.current.find((x) => x.id === id) as MatchingExercise | undefined;
    if (!ex || !Array.isArray(ex.pairs)) return;
    ex.pairs.splice(idx, 1);
    setTouched(true);
    forceSnapshot();
  };

  // ===== ¿Todo válido? =====
  const allValid = useMemo(() => {
    if (snapshot.length === 0) return true;
    return snapshot.every(
      (ex) => validationsRef.current[ex.id] ?? validateExercise(ex)
    );
  }, [snapshot]);

  // ===== Guardar / Revertir =====
  const handleSave = () => {
    if (!allValid) {
      setSavedMessage("Hay ejercicios incompletos o no válidos.");
      return;
    }
    if (typeof onChange === "function")
      onChange(structuredClone(exercisesRef.current));
    setTouched(false);
    setSavedMessage("Ejercicios guardados.");
    setTimeout(() => setSavedMessage(""), 2200);
  };

  const handleRevert = () => {
    exercisesRef.current = initial ?
      structuredClone(initial) : [];
    validationsRef.current = {};
    exercisesRef.current.forEach(
      (e) => (validationsRef.current[e.id] = validateExercise(e))
    );
    setTouched(false);
    setActiveIdx((idx) =>
      exercisesRef.current.length === 0
        ? 0
        : Math.min(idx, exercisesRef.current.length - 1)
    );
    forceSnapshot();
    setSavedMessage("Cambios revertidos.");
    setTimeout(() => setSavedMessage(""), 1800);
  };

  // ===== Ayudantes de UI =====
  const typeLabel = (t: Exercise['type']): string =>
    ({
      multiple_choice: "Múltiple",
      true_false: "Verdadero/Falso",
      fill_blank: "Rellenar espacios",
      text: "Párrafo",
      reorder: "Reordenar",
      matching: "Emparejar",
    }[t] || t);

  const getTabTitle = (ex: Exercise, idx: number): string => {
    if (ex.type === "multiple_choice")
      return firstLine(ex.question) || `Múltiple ${idx + 1}`;
    if (ex.type === "true_false")
      return firstLine(ex.statement) || `Verdadero/Falso ${idx + 1}`;
    if (ex.type === "fill_blank")
      return firstLine(ex.title || ex.sentence) || `Rellenar ${idx + 1}`;
    if (ex.type === "text")
      return firstLine(ex.prompt) || `Párrafo ${idx + 1}`;
    if (ex.type === "reorder")
      return firstLine(ex.title) || `Reordenar ${idx + 1}`;
    if (ex.type === "matching")
      return firstLine(ex.title) || `Emparejar ${idx + 1}`;
    return `Ejercicio ${idx + 1}`;
  };

  // ===== Renderizadores =====
  const renderMultipleChoice = (ex: MultipleChoiceExercise) => (
    <div className="space-y-3">
      {/* Instrucciones multilínea */}
      <textarea
        rows={3}
        className="w-full border rounded px-3 py-2"
        style={{ whiteSpace: "pre-wrap" }}
        placeholder="Instrucciones / pregunta (ej., ¿Cuál es el USP más específico?)"
        value={ex.question ?? ""}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          updateFieldImmediate(ex.id, { question: e.target.value })
        }
      />
      <div className="space-y-2">
        {ex.options.map((opt, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              type="radio"
              name={`mc-correct-${ex.id}`}
              checked={ex.correctIndex === i}
              onChange={() => updateField(ex.id, { correctIndex: i })}
              title="Marcar como correcta"
            />
            <input
              className="flex-1 border rounded px-3 py-2"
              placeholder={`Opción ${i + 1}`}
              value={opt ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const newOptions = [...(ex.options || [])];
                newOptions[i] = e.target.value;
                updateFieldImmediate(ex.id, { options: newOptions });
              }}
            />
            <button
              type="button"
              className="text-sm px-2 py-1 rounded bg-red-100 text-red-700"
              onClick={() => removeOption(ex.id, i)}
            >
              ✖
            </button>
          </div>
        ))}
        <div className="flex gap-2 items-center">
          <button
            type="button"
            className="px-3 py-1.5 rounded bg-slate-100"
            onClick={() => addOption(ex.id)}
          >
            + Opción
          </button>
          <span className="text-xs text-slate-500">
            Usa el radio para marcar la correcta.
          </span>
        </div>
      </div>
    </div>
  );

  const renderFillBlank = (ex: FillBlankExercise) => {
    const blanksCount = (ex.sentence?.match(/\*\*\*/g) || []).length;
    const syncHintWordsToAnswers = (raw: string) => {
      const tokens = String(raw || "")
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      const nextAnswers = Array.from({ length: blanksCount }).map(
        (_, i) => tokens[i] || ex.answers?.[i] || ""
      );
      updateFieldImmediate(ex.id, { hintWords: raw, answers: nextAnswers });
    };

    const onSentenceChange = (s: string) => {
      const count = (s.match(/\*\*\*/g) || []).length;
      const nextAnswers = Array.from({ length: count }).map(
        (_, i) => ex.answers?.[i] || ""
      );
      updateFieldImmediate(ex.id, { sentence: s, answers: nextAnswers });
    };

    const renderSentencePreview = () => {
      if (!ex.sentence) return null;
      const html = ex.sentence.replace(/\*\*\*/g, "____");
      return (
        <div
          className="text-sm text-slate-600 px-3 py-2 bg-slate-50 border rounded"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {html}
        </div>
      );
    };

    return (
      <div className="space-y-3">
        {/* Título/instrucciones multilínea */}
        <textarea
          rows={2}
          className="w-full border rounded px-3 py-2"
          style={{ whiteSpace: "pre-wrap" }}
          placeholder="Título / instrucciones (ej., Completa la oración con las palabras correctas)"
          value={ex.title ?? ""}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            updateFieldImmediate(ex.id, { title: e.target.value })
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
          <input
            className="md:col-span-9 border rounded px-3 py-2"
            placeholder="Palabras para los espacios (separadas por comas), ej., perro, gato, pájaro"
            value={ex.hintWords ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateFieldImmediate(ex.id, { hintWords: e.target.value })
            }
          />
          <button
            type="button"
            className="md:col-span-3 px-3 py-2 rounded bg-slate-100 hover:bg-slate-200 border text-sm"
            onClick={() => syncHintWordsToAnswers(ex.hintWords || "")}
            title="Sincronizar palabras con la lista de respuestas de abajo"
          >
            Aplicar palabras a respuestas
          </button>
        </div>

        <textarea
          rows={3}
          className="w-full border rounded px-3 py-2"
          style={{ whiteSpace: "pre-wrap" }}
          placeholder='Usa "***" para los espacios (ej., Tengo un *** perro y un *** gato).'
          value={ex.sentence ?? ""}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onSentenceChange(e.target.value)}
        />

        {renderSentencePreview()}

        {blanksCount === 0 ? (
          <div className="text-xs text-amber-700">
            Añade al menos un "***" para crear espacios.
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-xs text-slate-600">
              Respuestas (en orden de aparición):
            </div>
            {Array.from({ length: blanksCount }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 min-w-[70px]">
                  Espacio #{idx + 1}
                </span>
                <input
                  className="flex-1 border rounded px-3 py-2"
                  placeholder={`Respuesta para el espacio #${idx + 1}`}
                  value={ex.answers?.[idx] ?? ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const nextAnswers = Array.from({ length: blanksCount }).map(
                      (_, i) =>
                        i === idx ? e.target.value : ex.answers?.[i] || ""
                    );
                    updateFieldImmediate(ex.id, { answers: nextAnswers });
                  }}
                />
              </div>
            ))}
            <button
              type="button"
              className="mt-2 text-xs text-slate-600 hover:text-slate-800"
              onClick={() => syncHintWordsToAnswers(ex.hintWords || "")}
            >
              ↻ Re-aplicar palabras desde el campo superior
            </button>
          </div>
        )}

        <div className="text-xs">
          {validateExercise(ex) ? (
            <div className="text-green-600">
              ✓ El ejercicio está completo y es válido
            </div>
          ) : (
            <div className="text-amber-600">
              ⚠ Requerido: oración con "***" y el mismo número de respuestas.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderText = (ex: TextExercise) => (
    <div className="space-y-2">
      {/* Indicación multilínea */}
      <textarea
        rows={3}
        className="w-full border rounded px-3 py-2"
        style={{ whiteSpace: "pre-wrap" }}
        placeholder="Instrucciones / indicación (ej., Escribe un párrafo sobre tu rutina matutina)"
        value={ex.prompt ?? ""}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          updateFieldImmediate(ex.id, { prompt: e.target.value })
        }
      />
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-600">Máx. caracteres</label>
        <input
          type="number"
          min={10}
          className="w-24 border rounded px-2 py-1"
          value={ex.maxLength ?? 0}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = parseInt(e.target.value || "0", 10) || 0;
            updateField(ex.id, { maxLength: value });
          }}
        />
      </div>
    </div>
  );

  const renderTrueFalse = (ex: TrueFalseExercise) => (
    <div className="space-y-2">
      {/* Enunciado multilínea */}
      <textarea
        rows={3}
        className="w-full border rounded px-3 py-2"
        style={{ whiteSpace: "pre-wrap" }}
        placeholder="Enunciado (ej., El cielo es azul.)"
        value={ex.statement ?? ""}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          updateFieldImmediate(ex.id, { statement: e.target.value })
        }
      />
      <div className="flex items-center gap-4 mt-1">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`tf-${ex.id}`}
            checked={ex.answer === true}
            onChange={() => updateField(ex.id, { answer: true })}
          />
          Verdadero
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`tf-${ex.id}`}
            checked={ex.answer === false}
            onChange={() => updateField(ex.id, { answer: false })}
          />
          Falso
        </label>
      </div>
    </div>
  );

  const renderReorder = (ex: ReorderExercise) => (
    <div className="space-y-3">
      {/* Título/instrucciones multilínea */}
      <textarea
        rows={3}
        className="w-full border rounded px-3 py-2"
        style={{ whiteSpace: "pre-wrap" }}
        placeholder="Título / instrucciones (ej., Ordena las 5 partes del pitch)"
        value={ex.title ?? ""}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateFieldImmediate(ex.id, { title: e.target.value })}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Columna izquierda: Elementos */}
        <div>
          <div className="text-sm font-medium text-slate-700 mb-2">
            1) Define los elementos a reordenar
          </div>
          <textarea
            rows={8}
            className="w-full border rounded px-3 py-2 font-mono text-sm resize-y"
            placeholder={
              "Escribe un elemento por línea:\n\nEl gancho\nEl problema\nLa solución\nLa propuesta de valor\nLa llamada a la acción"
            }
            value={(ex.items || []).join("\n")}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              const rawText = e.target.value;
              const items = rawText.split("\n"); // mantener todas las líneas visualmente
              const nonEmptyItems = items.filter((item) => item.trim() !== "");
              let correctOrder = ex.correctOrder || [];
              const prevNonEmptyItems = (ex.items || []).filter(
                (item) => item.trim() !== ""
              );
              if (nonEmptyItems.length !== prevNonEmptyItems.length) {
                correctOrder = [];
              } else {
                correctOrder = correctOrder.filter((idx) => {
                  const actualItem = items[idx];
                  return (
                    idx >= 0 &&
                    idx < items.length &&
                    actualItem &&
                    actualItem.trim() !== ""
                  );
                });
              }

              updateFieldImmediate(ex.id, { items, correctOrder });
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === "Enter") {
                e.stopPropagation(); // dejar que el textarea maneje el salto de línea natural
              }
            }}
            style={{ whiteSpace: "pre-wrap" }}
          />
          <div className="text-xs text-slate-500 mt-1">
            Presiona Enter para crear una nueva línea. Total:{" "}
            {(ex.items || []).filter((item) => item.trim() !== "").length} elementos válidos
          </div>
        </div>

        {/* Columna derecha: Orden correcto */}
        <div>
          <div className="text-sm font-medium text-slate-700 mb-2">
            2) Define el orden correcto
          </div>

          <div className="border rounded p-3 bg-slate-50 max-h-80 overflow-y-auto">
            {(ex.items || []).filter((item) => item.trim() !== "").length ===
            0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Primero añade algunos elementos a la izquierda.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-slate-600 mb-3">
                  Haz clic en los elementos en el orden correcto:
                </div>

                {/* Elementos disponibles */}
                <div className="space-y-1 mb-4">
                  <div className="text-xs font-medium text-slate-500">
                    Elementos disponibles:
                  </div>
                  {(ex.items || [])
                    .map((item, idx) => ({ item, idx }))
                    .filter(({ item }) => item.trim() !== "")
                    .map(({ item, idx }) => {
                      const isInOrder = (ex.correctOrder || []).includes(idx);
                      const orderPosition = isInOrder
                        ? (ex.correctOrder || []).indexOf(idx) + 1
                        : null;
                      return (
                        <button
                          key={idx}
                          type="button"
                          className={`w-full text-left px-3 py-2 rounded border text-sm transition ${
                            isInOrder
                              ? "bg-blue-100 border-blue-300 text-blue-800"
                              : "bg-white hover:bg-slate-50 border-slate-200"
                          }`}
                          onClick={() => {
                            const currentOrder = ex.correctOrder || [];
                            const newOrder = isInOrder
                              ? currentOrder.filter((i) => i !== idx)
                              : [...currentOrder, idx];
                            updateField(ex.id, { correctOrder: newOrder });
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="flex-1 pr-2"
                              style={{ whiteSpace: "pre-wrap" }}
                            >
                              {item}
                            </span>
                            {isInOrder && (
                              <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full text-xs font-bold">
                                #{orderPosition}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>

                {/* Orden actual */}
                {(ex.correctOrder || []).length > 0 && (
                  <div className="border-t pt-3">
                    <div className="text-xs font-medium text-green-600 mb-2">
                      Orden correcto definido:
                    </div>
                    <ol className="space-y-1">
                      {(ex.correctOrder || []).map((idx, pos) => (
                        <li
                          key={pos}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold min-w-[24px] text-center">
                            {pos + 1}
                          </span>
                          <span
                            className="flex-1"
                            style={{ whiteSpace: "pre-wrap" }}
                          >
                            {(ex.items || [])[idx] || `[Error: índice ${idx}]`}
                          </span>
                          <button
                            type="button"
                            className="text-red-500 hover:text-red-700 text-xs px-1"
                            onClick={() => {
                              const newOrder = (ex.correctOrder || []).filter(
                                (_, i) => i !== pos
                              );
                              updateField(ex.id, { correctOrder: newOrder });
                            }}
                            title="Eliminar de la secuencia"
                          >
                            ✖
                          </button>
                        </li>
                      ))}
                    </ol>

                    <button
                      type="button"
                      className="mt-2 text-xs text-slate-500 hover:text-slate-700"
                      onClick={() => updateField(ex.id, { correctOrder: [] })}
                    >
                      🗑 Limpiar orden
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vista previa visual de arrastrar y soltar */}
      {(ex.items || []).filter((item) => item.trim() !== "").length > 0 && (
        <div>
          <div className="text-sm font-medium text-slate-700 mb-2">
            3) Vista previa (arrastra para probar)
          </div>
          <ul className="divide-y border rounded bg-white">
            {(ex.items || [])
              .filter((item) => item.trim() !== "")
              .map((item, i) => (
                <li
                  key={`preview-${i}`}
                  className="px-3 py-2 hover:bg-slate-50 cursor-move border-l-4 border-l-transparent hover:border-l-blue-400 transition-colors"
                  draggable
                  onDragStart={(e) => handleDragStart(e, ex.id, i)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, ex.id, i)}
                  title="Arrastra para reordenar (solo visual)"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm min-w-[24px]">
                      #{i + 1}
                    </span>
                    <span
                      className="flex-1 text-sm"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {item}
                    </span>
                    <span className="text-slate-300 text-xs">⋮⋮</span>
                  </div>
                </li>
              ))}
          </ul>
          <div className="mt-2 text-xs text-slate-500">
            💡 Esta sección es solo una prueba visual. El orden correcto se define arriba.
          </div>
        </div>
      )}

      <div className="text-xs">
        {validateExercise(ex) ? (
          <div className="text-green-600">✓ Ejercicio completo y válido</div>
        ) : (
          <div className="text-amber-600">
            ⚠ Requerido: título, al menos 2 elementos y un orden correcto.
          </div>
        )}
      </div>
    </div>
  );

  const renderMatching = (ex: MatchingExercise) => (
    <div className="space-y-3">
      {/* Título/instrucciones multilínea */}
      <textarea
        rows={3}
        className="w-full border rounded px-3 py-2"
        style={{ whiteSpace: "pre-wrap" }}
        placeholder="Título / instrucciones (ej., Empareja cada oración con la audiencia correcta)"
        value={ex.title ?? ""}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateFieldImmediate(ex.id, { title: e.target.value })}
      />

      <div className="text-xs text-slate-600">Pares</div>
      <div className="space-y-2">
        {(ex.pairs || []).map((pair, idx) => (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2">
            <textarea
              rows={2}
              className="md:col-span-5 border rounded px-3 py-2"
              style={{ whiteSpace: "pre-wrap" }}
              placeholder="Izquierda"
              value={pair.left ?? ""}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                const newPairs = [...(ex.pairs || [])];
                newPairs[idx] = { ...newPairs[idx], left: e.target.value };
                updateFieldImmediate(ex.id, { pairs: newPairs });
              }}
            />
            <div className="md:col-span-2 flex items-center justify-center text-slate-400">
              ↔
            </div>
            <textarea
              rows={2}
              className="md:col-span-5 border rounded px-3 py-2"
              style={{ whiteSpace: "pre-wrap" }}
              placeholder="Derecha"
              value={pair.right ?? ""}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                const newPairs = [...(ex.pairs || [])];
                newPairs[idx] = { ...newPairs[idx], right: e.target.value };
                updateFieldImmediate(ex.id, { pairs: newPairs });
              }}
            />
            <div className="md:col-span-12 flex justify-end">
              <button
                type="button"
                className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs"
                onClick={() => removePair(ex.id, idx)}
              >
                Eliminar par
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="px-3 py-1.5 rounded bg-slate-100"
        onClick={() => addPair(ex.id)}
      >
        + Añadir par
      </button>
    </div>
  );

  const renderEditorByType = (ex: Exercise) => {
    switch (ex.type) {
      case "multiple_choice":
        return renderMultipleChoice(ex);
      case "fill_blank":
        return renderFillBlank(ex);
      case "text":
        return renderText(ex);
      case "true_false":
        return renderTrueFalse(ex);
      case "reorder":
        return renderReorder(ex);
      case "matching":
        return renderMatching(ex);
      default:
        return null;
    }
  };

  // Limpieza de debounce al desmontar
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    };
  }, []);

  // ===== UI =====
  return (
    <div className="space-y-5">
      {/* Barra de herramientas */}
      <div className="flex flex-wrap gap-2 items-center sticky top-0 bg-white/85 backdrop-blur py-2 z-10">
        <span className="text-sm text-slate-600 pr-2">Añadir:</span>

        <button
          type="button"
          onClick={() => addExercise("multiple_choice")}
          className="px-3 py-1.5 rounded bg-sky-600 text-white text-sm"
        >
          + Opción Múltiple
        </button>

        <button
          type="button"
          onClick={() => addExercise("true_false")}
          className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm"
        >
          + Verdadero/Falso
        </button>

        <button
          type="button"
          onClick={() => addExercise("fill_blank")}
          className="px-3 py-1.5 rounded bg-amber-500 text-white text-sm"
        >
          + Rellenar Espacios
        </button>

        <button
          type="button"
          onClick={() => addExercise("text")}
          className="px-3 py-1.5 rounded bg-indigo-600 text-white text-sm"
        >
          + Párrafo
        </button>

        <button
          type="button"
          onClick={() => addExercise("reorder")}
          className="px-3 py-1.5 rounded bg-fuchsia-600 text-white text-sm"
        >
          + Reordenar
        </button>

        <button
          type="button"
          onClick={() => addExercise("matching")}
          className="px-3 py-1.5 rounded bg-rose-600 text-white text-sm"
        >
          + Emparejar
        </button>
      </div>

      {/* Contenedor de pestañas */}
      <div className="border rounded-lg bg-white shadow-sm">
        {/* Encabezado de pestañas */}
        <div className="flex items-center gap-2 overflow-x-auto p-2 border-b">
          {snapshot.length === 0 ? (
            <div className="text-sm text-slate-500 px-2 py-1">
              Aún no hay ejercicios.
            </div>
          ) : (
            snapshot.map((ex, i) => {
              const active = i === activeIdx;
              const valid =
                validationsRef.current[ex.id] ?? validateExercise(ex);
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  className={`px-3 py-1 rounded-full border text-sm whitespace-nowrap transition ${
                    active
                      ? "bg-sky-600 text-white border-sky-600"
                      : "bg-white hover:bg-slate-50"
                  }`}
                  title={getTabTitle(ex, i)}
                >
                  <span className="mr-1 opacity-80">{typeLabel(ex.type)}</span>
                  <span className="font-medium">#{i + 1}</span>
                  <span
                    className={`ml-2 inline-block w-2 h-2 rounded-full align-middle ${
                      valid ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                    title={valid ? "Válido" : "Incompleto"}
                  />
                </button>
              );
            })
          )}

          {/* Acciones para el ejercicio activo */}
          {snapshot.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                className="px-2 py-1 rounded border text-xs hover:bg-slate-50"
                onClick={() => swapExercises(activeIdx, activeIdx - 1)}
                disabled={activeIdx <= 0}
              >
                ← Mover
              </button>
              <button
                type="button"
                className="px-2 py-1 rounded border text-xs hover:bg-slate-50"
                onClick={() => swapExercises(activeIdx, activeIdx + 1)}
                disabled={activeIdx >= snapshot.length - 1}
              >
                Mover →
              </button>
              <button
                type="button"
                className="px-2 py-1 rounded border text-xs hover:bg-slate-50"
                onClick={() => duplicateExercise(snapshot[activeIdx].id)}
              >
                Duplicar
              </button>
              <button
                type="button"
                className="px-2 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                onClick={() => removeExercise(snapshot[activeIdx].id)}
              >
                Eliminar
              </button>
            </div>
          )}
        </div>

        {/* Contenido de la pestaña activa */}
        {snapshot.length > 0 && snapshot[activeIdx] && (
          <div className="p-4">
            <div className="mb-3">
              <div className="text-xs text-slate-500">
                {typeLabel(snapshot[activeIdx].type)} •{" "}
                {getTabTitle(snapshot[activeIdx], activeIdx)}
              </div>
            </div>
            {renderEditorByType(snapshot[activeIdx])}
          </div>
        )}
      </div>

      {/* Guardar / Revertir */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={!touched || !allValid}
          className={`px-4 py-2 rounded bg-sky-600 text-white ${
            !touched || !allValid
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-sky-700"
          }`}
        >
          Guardar ejercicios
        </button>

        <button
          type="button"
          onClick={handleRevert}
          disabled={!touched}
          className={`px-3 py-2 rounded border ${
            !touched ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50"
          }`}
        >
          Revertir
        </button>

        <div className="text-sm text-slate-600">{savedMessage}</div>
      </div>
    </div>
  );
}