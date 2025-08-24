"use client";
import React from "react";

export default function HeaderHomeButton() {
  return (
    <div className="fixed top-4 left-4 z-50">
      <button
        onClick={() => (window.location.href = "/")}
        className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-lg shadow transition"
      >
        Vuelve a Home
      </button>
    </div>
  );
}
