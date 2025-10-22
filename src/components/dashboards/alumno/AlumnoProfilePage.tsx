"use client";

import { useState } from "react";
import { FiMail, FiUser, FiEdit2, FiCalendar, FiAlertTriangle } from "react-icons/fi";
import { Button } from "@/components/ui/button";

export default function AlumnoProfilePage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dni: "",
    englishLevel: "",
    notes: "",
  });

  const [email] = useState("abbruzzesetadeo6@gmail.com"); // temporal
  const [memberSince] = useState("13/10/2025, 9:37:58");
  const [status] = useState("activo");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    alert("Luego esto actualizará los datos del alumno en alumnos/batch_X/user_X 🚀");
  };

  const missingName = !formData.firstName || !formData.lastName;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Profile Information</h1>
          <p className="text-sm text-gray-500">
            View and manage your personal details and account status.
          </p>
        </div>
        <Button
          onClick={handleSave}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center gap-2"
        >
          <FiEdit2 size={16} />
          Complete profile
        </Button>
      </div>

      {/* ALERTA SI FALTAN DATOS */}
      {missingName && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-orange-500 bg-orange-100 p-2 rounded-full">
              <FiAlertTriangle size={20} />
            </div>
            <div>
              <p className="font-semibold text-orange-700">Please complete your profile</p>
              <p className="text-sm text-orange-600">
                We’re missing your first and last name. Certificates and invoices use this
                information.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => window.scrollTo({ top: 500, behavior: "smooth" })}
            className="text-orange-600 hover:text-orange-700 font-semibold bg-transparent"
          >
            Fill in details
          </Button>
        </div>
      )}

      {/* INFORMACIÓN GENERAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ACCOUNT CARD */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FiUser /> Account
          </h3>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500 flex items-center gap-2">
                <FiMail size={14} /> Email
              </span>
              <span className="text-gray-800 font-medium">{email}</span>
            </li>
            <li className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500">Status</span>
              <span className="text-green-600 font-medium capitalize">{status}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-500 flex items-center gap-2">
                <FiCalendar size={14} /> Member since
              </span>
              <span className="text-gray-700 text-right">{memberSince}</span>
            </li>
          </ul>
        </div>

        {/* PERSONAL CARD */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FiUser /> Personal
          </h3>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <label className="text-gray-500">First name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Enter your first name"
                className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              />
              {!formData.firstName && (
                <p className="text-red-500 text-xs mt-1">Missing</p>
              )}
            </div>
            <div>
              <label className="text-gray-500">Last name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter your last name"
                className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              />
              {!formData.lastName && (
                <p className="text-red-500 text-xs mt-1">Missing</p>
              )}
            </div>
            <div>
              <label className="text-gray-500">National ID</label>
              <input
                type="text"
                name="dni"
                value={formData.dni}
                onChange={handleChange}
                placeholder="Your ID number"
                className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="text-gray-500">English level</label>
              <input
                type="text"
                name="englishLevel"
                value={formData.englishLevel}
                onChange={handleChange}
                placeholder="Beginner, Intermediate..."
                className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="text-gray-500">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                placeholder="Additional info..."
                className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* ACTIVITY CARD */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            📊 Activity
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between border-b border-gray-100 pb-1">
              <span className="text-gray-500">Courses purchased</span>
              <span className="text-gray-800 font-medium">1</span>
            </li>
            <li className="flex justify-between border-b border-gray-100 pb-1">
              <span className="text-gray-500">Courses tracked</span>
              <span className="text-gray-800 font-medium">1</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-500">Completed</span>
              <span className="text-gray-800 font-medium">0</span>
            </li>
          </ul>

          <div className="mt-3">
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full"
                style={{ width: "2%" }}
              ></div>
            </div>
            <p className="text-xs text-right text-gray-500 mt-1">
              Avg completion: 2%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
