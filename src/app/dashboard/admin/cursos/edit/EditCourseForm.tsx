'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Image from 'next/image';
import CourseContentSection from "./CourseContentSection";

interface Course {
  
  id: string;
  title: string;
  description: string;
  level: string;
  category: string;
  price: number;
  oldPrice: number;
  image: string;
  visible: boolean;
}

interface Props {
  course: Course;
  onClose: () => void;
  onSave: (course: Course) => void;
}

export default function EditCourseForm({ course, onClose, onSave }: Props) {
  const [formData, setFormData] = useState(course);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleToggleVisible = () => {
    setFormData({ ...formData, visible: !formData.visible });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
  <div className="flex justify-center items-center w-full h-[90vh] overflow-hidden">
    <div className="flex flex-col w-[95vw] max-w-6xl h-full bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 p-6 text-white rounded-t-2xl">
        <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <span>📝</span> Editar Curso
        </h2>
        <p className="text-white/80 text-sm">
          Update your course content, structure, and settings
        </p>
      </div>

      {/* TABS */}
      <Tabs defaultValue="general" className="flex flex-col flex-1 overflow-hidden">
        {/* TABS HEADER */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 p-4 text-white">
          <TabsList className="bg-white/10 backdrop-blur-md p-2 rounded-xl flex flex-wrap gap-2">
            {[
              { id: 'general', label: 'General', desc: 'Basic info' },
              { id: 'content', label: 'Content', desc: 'Units & lessons' },
              { id: 'exam', label: 'Exam', desc: 'Final assessment' },
              { id: 'project', label: 'Project', desc: 'Final project' },
              { id: 'closing', label: 'Closing', desc: 'Closing message' },
              { id: 'students', label: 'Students', desc: 'Enroll users' },
            ].map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="text-sm text-white data-[state=active]:bg-white/30 rounded-lg px-4 py-1.5"
              >
                {tab.label}{' '}
                <span className="ml-1 text-gray-200">{tab.desc}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* TABS CONTENT */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-8">
          {/* --- GENERAL TAB --- */}
          <TabsContent value="general">
            <section className="p-8 bg-white rounded-xl border border-gray-200 shadow-sm mb-10">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-6">
                📘 Course Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* LEFT */}
                <div className="flex flex-col space-y-6">
                  <div>
                    <Label className="text-gray-700">Course title</Label>
                    <Input
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-700">Description</Label>
                    <Textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={8}
                      className="mt-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-700">Level</Label>
                      <Input
                        name="level"
                        value={formData.level}
                        onChange={handleChange}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">Category</Label>
                      <Input
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="flex flex-col space-y-6">
                  <div>
                    <Label className="text-gray-700">Intro video URL</Label>
                    <Input
                      name="videoUrl"
                      placeholder="https://vimeo.com/..."
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-700">Course thumbnail URL</Label>
                    <Input
                      name="image"
                      value={formData.image}
                      onChange={handleChange}
                      placeholder="https://imgur.com/..."
                      className="mt-2"
                    />
                  </div>

                  {formData.image && (
                    <div className="relative w-full h-56 rounded-lg overflow-hidden border border-gray-200">
                      <Image
                        src={
                          formData.image.startsWith('http')
                            ? formData.image
                            : `/images/${formData.image}`
                        }
                        alt="thumbnail"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 mt-8">
                <Switch
                  checked={formData.visible}
                  onCheckedChange={handleToggleVisible}
                />
                <span className="text-sm text-gray-700">Public course</span>
              </div>
            </section>

            {/* --- PRICING --- */}
            <section className="p-8 bg-white rounded-xl border border-gray-200 shadow-sm">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-6">
                💰 Pricing Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <Label className="text-gray-700">Regular price</Label>
                  <Input
                    type="number"
                    name="oldPrice"
                    value={formData.oldPrice}
                    onChange={handleChange}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Discounted price</Label>
                  <Input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className="mt-2"
                  />
                </div>
              </div>
            </section>
          </TabsContent>

          {/* --- CONTENT TAB --- */}
          <TabsContent value="content">
            <CourseContentSection courseId={formData.id} />
          </TabsContent>

          {/* --- OTHER TABS PLACEHOLDERS --- */}
          <TabsContent value="exam">
            <div className="p-10 text-gray-500 italic text-center">
              Exam configuration coming soon.
            </div>
          </TabsContent>

          <TabsContent value="project">
            <div className="p-10 text-gray-500 italic text-center">
              Project section coming soon.
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* FOOTER */}
      <div className="p-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 flex justify-center items-center rounded-b-2xl">
        <Button
          type="submit"
          onClick={handleSubmit}
          className="bg-white text-indigo-600 font-semibold hover:bg-gray-100 px-10 py-4 rounded-xl shadow-md"
        >
          💾 Save Course
        </Button>
      </div>
    </div>
  </div>
);


}