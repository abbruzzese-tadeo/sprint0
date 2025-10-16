'use client';

import React from 'react';
import CreateCourse from './CreateCourse';

export default function CreateCoursePage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Crear curso</h1>
      <CreateCourse />
    </div>
  );
}
