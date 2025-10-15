"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import {UnitCard} from '@/components/UnitCard'

export default function CourseContentSection({ courseId }: { courseId: string }) {
  const [units, setUnits] = useState([
    { id: 1, title: "Deconstructing the Pitch", duration: 40, description: "Analyze and critique examples of effective and ineffective pitches." },
    { id: 2, title: "Structuring Your Argument", duration: 35, description: "Learn to organize your ideas logically for clarity and impact." },
    { id: 3, title: "Defining Your Value Proposition", duration: 45, description: "Identify the unique value that makes your pitch stand out." },
  ]);
  const [activeUnit, setActiveUnit] = useState(1);

  return (
    <div className="w-full h-full p-6 overflow-y-auto">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">📘 Course Content</h2>
      <p className="text-sm text-gray-500 mb-6">
        Organize your course’s units and lessons
      </p>

      {/* Unit Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 overflow-x-auto">
          <div className="flex space-x-2">
            {units.map((unit) => (
              <Button
                key={unit.id}
                variant={unit.id === activeUnit ? "default" : "outline"}
                onClick={() => setActiveUnit(unit.id)}
                className={`rounded-full ${
                  unit.id === activeUnit
                    ? "bg-blue-600 text-white"
                    : "border-gray-300 text-gray-600 hover:bg-gray-100"
                }`}
              >
                Unit {unit.id} • {unit.title}
              </Button>
            ))}
          </div>
        </div>
        <Button
          className="ml-4 bg-green-600 hover:bg-green-700 text-white"
          onClick={() =>
            setUnits([...units, { id: units.length + 1, title: "New Unit", duration: 0, description: "" }])
          }
        >
          <Plus className="w-4 h-4 mr-1" /> New Unit
        </Button>
      </div>

      {/* Tabs for Info / Lessons / Closing */}
      <Card className="p-6 rounded-2xl shadow-md">
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="flex w-full justify-start mb-6 bg-gray-100 rounded-lg p-1">
            <TabsTrigger value="info" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Info
            </TabsTrigger>
            <TabsTrigger value="lessons" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Lessons
            </TabsTrigger>
            <TabsTrigger value="closing" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Closing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700">Unit title *</label>
                <input
                  type="text"
                  value={units.find((u) => u.id === activeUnit)?.title || ""}
                  className="w-full mt-1 rounded-md border border-gray-300 p-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Duration (minutes)</label>
                <input
                  type="number"
                  value={units.find((u) => u.id === activeUnit)?.duration || 0}
                  className="w-full mt-1 rounded-md border border-gray-300 p-2"
                />
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={4}
                  value={units.find((u) => u.id === activeUnit)?.description || ""}
                  className="w-full mt-1 rounded-md border border-gray-300 p-2"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="lessons">
            <div className="text-gray-500 italic">
              Here you’ll manage lessons for this unit.
            </div>
          </TabsContent>

          <TabsContent value="closing">
            <div className="text-gray-500 italic">
              Closing summary for this unit.
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Save button */}
      <div className="flex justify-center mt-8">
        <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-2 rounded-full">
          💾 Save Course
        </Button>
      </div>
    </div>
  );
}
