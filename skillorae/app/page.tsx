"use client";

import { useRouter } from "next/navigation";
import FutureSelf from "./components/FutureSelf";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      {/* NAVBAR */}
      <nav className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-white/10 bg-[#030712]/80 px-6 py-5 backdrop-blur-xl md:px-12">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="text-2xl font-bold tracking-tight"
        >
          SKILL<span className="text-blue-400">ORAE</span>
        </button>

        <div className="hidden gap-8 text-sm text-gray-300 md:flex">
          <button
            onClick={() =>
              document
                .getElementById("product")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="transition hover:text-white"
          >
            Product
          </button>

          <button
            onClick={() =>
              document
                .getElementById("how")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="transition hover:text-white"
          >
            How It Works
          </button>

          <button
            onClick={() =>
              document
                .getElementById("about")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="transition hover:text-white"
          >
            About
          </button>
        </div>

        <button
          onClick={() => router.push("/analyze")}
          className="rounded-full bg-blue-500 px-5 py-2.5 text-sm font-semibold transition hover:bg-blue-400"
        >
          Start Analysis
        </button>
      </nav>

      {/* HERO */}
      <section className="relative flex min-h-screen items-center overflow-hidden px-6 pb-16 pt-28 md:px-12 lg:px-20">
        {/* Background effects */}
        <div className="pointer-events-none absolute left-[15%] top-[20%] h-96 w-96 rounded-full bg-blue-600/20 blur-[140px]" />

        <div className="pointer-events-none absolute right-[5%] top-[35%] h-80 w-80 rounded-full bg-purple-600/10 blur-[130px]" />

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-2">
          {/* LEFT SIDE */}
          <div>
            <div className="mb-6 inline-flex rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-sm text-blue-300">
              AI-Powered Student Future Simulator
            </div>

            <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight md:text-7xl">
              Discover the
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
                Future You.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-gray-400">
              SKILLORAE analyzes your academic profile, skills and interests to
              discover suitable careers, identify skill gaps and simulate your
              future growth.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <button
                onClick={() => router.push("/analyze")}
                className="rounded-full bg-blue-500 px-7 py-3.5 font-semibold transition hover:-translate-y-0.5 hover:bg-blue-400"
              >
                Analyze My Future â†’
              </button>

              <button
                onClick={() =>
                  document
                    .getElementById("product")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="rounded-full border border-white/15 px-7 py-3.5 font-semibold text-gray-300 transition hover:bg-white/5"
              >
                Explore SKILLORAE
              </button>
            </div>

            {/* Stats */}
            <div className="mt-10 flex flex-wrap gap-8 text-sm text-gray-500">
              <div>
                <span className="block text-2xl font-bold text-white">AI</span>
                Career Intelligence
              </div>

              <div>
                <span className="block text-2xl font-bold text-white">
                  360Â°
                </span>
                Future Simulation
              </div>

              <div>
                <span className="block text-2xl font-bold text-white">1:1</span>
                Personal Roadmap
              </div>
            </div>
          </div>

          {/* RIGHT SIDE â€” FUTURE SELF */}
          <div className="relative">
            <div className="absolute -inset-6 rounded-[40px] bg-blue-500/10 blur-3xl" />

            <div className="relative">
              <FutureSelf />
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT */}
      <section
        id="product"
        className="border-t border-white/10 px-6 py-28 md:px-12"
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
            The Product
          </p>

          <h2 className="mt-4 text-4xl font-bold md:text-5xl">
            Your career journey,
            <span className="text-gray-500"> visualized.</span>
          </h2>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <Feature
              number="01"
              title="Student Analysis"
              description="Build your personal academic and skill profile."
              onClick={() => router.push("/analyze")}
            />

            <Feature
              number="02"
              title="Career Discovery"
              description="Explore careers that align with your profile."
              onClick={() => router.push("/career")}
            />

            <Feature
              number="03"
              title="Future Simulation"
              description="See how your skills can evolve toward your chosen career."
              onClick={() => router.push("/simulation")}
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how"
        className="border-t border-white/10 px-6 py-28 md:px-12"
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
            How It Works
          </p>

          <h2 className="mt-4 text-4xl font-bold md:text-5xl">
            From student profile
            <span className="text-gray-500"> to future roadmap.</span>
          </h2>

          <div className="mt-14 grid gap-5 md:grid-cols-5">
            {[
              "Student Profile",
              "AI Analysis",
              "Career Match",
              "Future Simulation",
              "Personal Roadmap",
            ].map((item, index) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-blue-400/30"
              >
                <span className="text-sm text-blue-400">0{index + 1}</span>

                <h3 className="mt-5 font-semibold">{item}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section
        id="about"
        className="border-t border-white/10 px-6 py-28 md:px-12"
      >
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
            About SKILLORAE
          </p>

          <h2 className="mt-4 text-4xl font-bold md:text-5xl">
            Don&apos;t just choose a career.
            <span className="block text-gray-500">Simulate your future.</span>
          </h2>

          <p className="mx-auto mt-7 max-w-2xl leading-8 text-gray-400">
            SKILLORAE helps students understand where they are, where they can
            go, and what they need to learn to reach their desired career.
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-t border-white/10 px-6 py-24">
        <div className="mx-auto max-w-5xl rounded-3xl border border-blue-400/20 bg-blue-500/[0.06] p-10 text-center md:p-16">
          <h2 className="text-4xl font-bold md:text-5xl">
            Ready to discover your future?
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-gray-400">
            Start your SKILLORAE analysis and build your personalized career
            roadmap.
          </p>

          <button
            onClick={() => router.push("/analyze")}
            className="mt-8 rounded-full bg-blue-500 px-8 py-4 font-semibold transition hover:bg-blue-400"
          >
            Start My Analysis â†’
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-gray-500">
        Â© 2026 SKILLORAE â€” AI Student Future Simulator
      </footer>
    </main>
  );
}

function Feature({
  number,
  title,
  description,
  onClick,
}: {
  number: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-left transition hover:-translate-y-1 hover:border-blue-400/30 hover:bg-white/[0.05]"
    >
      <span className="text-sm text-blue-400">{number}</span>

      <h3 className="mt-6 text-xl font-semibold">{title}</h3>

      <p className="mt-3 leading-7 text-gray-400">{description}</p>

      <span className="mt-6 block text-sm text-gray-500 transition group-hover:text-blue-300">
        Explore â†’
      </span>
    </button>
  );
}

