"use client";

import { FiAward } from "react-icons/fi";
import Link from "next/link";

export default function AlumnoCertificatesPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        {/* HEADER */}
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
          <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
            <FiAward size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Certificates</h1>
            <p className="text-sm text-gray-500">
              Your certificates will appear here once you finish a course.
              Complete all lessons and required assessments to unlock your
              downloadable certificate.
            </p>
          </div>
        </div>

        {/* CERTIFICATE LIST */}
        <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center">
          <div className="mx-auto w-full md:w-1/2 bg-gray-50 border border-gray-200 rounded-lg py-10 px-4">
            <p className="text-gray-500 text-sm mb-2">
              Certificate preview will be available after completion
            </p>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            Ready to earn one?{" "}
            <Link
              href="#"
              className="text-blue-600 font-semibold hover:underline"
            >
              Go to My Courses
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
