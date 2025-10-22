// helpers/HomeStats.ts
export const getAlumnoStats = (misCursos: any[]) => {
  const totalCourses = misCursos.length;
  const totalLessons = misCursos.reduce((acc, c) => acc + (c.totalLessons || 0), 0);
  const completedLessons = misCursos.reduce((acc, c) => acc + (c.completedCount || 0), 0);
  const averageProgress = totalCourses > 0
    ? Math.round(misCursos.reduce((acc, c) => acc + (c.progressPercent || 0), 0) / totalCourses)
    : 0;
  return { totalCourses, totalLessons, completedLessons, averageProgress };
};
