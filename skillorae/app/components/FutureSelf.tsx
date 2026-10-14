"use client";

import { useRef, useState } from "react";

type Mode = "avatar" | "real";

export default function FutureSelf() {
  const [mode, setMode] = useState<Mode>("avatar");
  const [photo, setPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (file: File) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhoto(reader.result);
        setMode("real");
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-[32px] border border-white/10 bg-[#050816]">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20 blur-[100px]" />

      {/* Header */}
      <div className="absolute left-6 right-6 top-6 z-20 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
            SKILLORAE
          </p>

          <h3 className="mt-1 text-lg font-semibold">
            Meet Your Future Self
          </h3>
        </div>

        <div className="rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs text-blue-300">
          Interactive
        </div>
      </div>

      {/* Main visual */}
      <div className="absolute inset-0 flex items-center justify-center pt-10">
        {mode === "real" && photo ? (
          <div className="relative flex h-[350px] w-[260px] items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-3xl" />

            <img
              src={photo}
              alt="Your uploaded profile"
              className="relative max-h-[350px] max-w-[260px] rounded-3xl object-cover shadow-2xl"
            />
          </div>
        ) : (
          <div className="relative flex h-[350px] w-[220px] items-center justify-center">
            <div className="absolute h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

            {/* Temporary AI avatar representation */}
            <div className="relative flex flex-col items-center">
              <div className="h-24 w-24 rounded-full border border-blue-300/20 bg-gradient-to-br from-gray-200 to-gray-500 shadow-[0_0_50px_rgba(59,130,246,0.25)]" />

              <div className="mt-2 h-40 w-28 rounded-[45%] border border-blue-300/20 bg-gradient-to-b from-gray-700 to-gray-950" />

              <div className="mt-1 flex gap-5">
                <div className="h-32 w-8 rounded-full bg-gray-800" />
                <div className="h-32 w-8 rounded-full bg-gray-800" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-5 left-5 right-5 z-20">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode("avatar")}
            className={`rounded-2xl border p-4 text-left transition ${
              mode === "avatar"
                ? "border-blue-400/40 bg-blue-400/10"
                : "border-white/10 bg-black/20 hover:bg-white/5"
            }`}
          >
            <div className="text-sm font-semibold">🤖 AI Avatar</div>
            <div className="mt-1 text-xs text-gray-500">
              Create a futuristic identity
            </div>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-2xl border p-4 text-left transition ${
              mode === "real"
                ? "border-cyan-400/40 bg-cyan-400/10"
                : "border-white/10 bg-black/20 hover:bg-white/5"
            }`}
          >
            <div className="text-sm font-semibold">👤 My Real Self</div>
            <div className="mt-1 text-xs text-gray-500">
              Upload your photo
            </div>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              handlePhoto(file);
            }
          }}
        />
      </div>
    </div>
  );
}