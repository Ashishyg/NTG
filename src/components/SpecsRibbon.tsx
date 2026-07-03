"use client";

import { motion } from "framer-motion";
import { specs } from "@/lib/data";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cellVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: "easeOut" as const,
    },
  },
};

export default function SpecsRibbon() {
  return (
    <section id="specs" className="relative mx-auto w-full max-w-[var(--container)] scroll-mt-28 px-[clamp(1.25rem,_3vw,_4rem)] pt-12 sm:pt-16">
      <div className="shine-border relative overflow-hidden rounded-2xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="shine-border-inner glass-strong relative overflow-hidden rounded-2xl"
        >
          <div className="grid divide-y divide-white/[0.06] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {specs.map((s) => (
              <motion.div
                key={s.label}
                variants={cellVariants}
                className="group relative px-6 py-6 sm:px-7 sm:py-7"
              >
                <p className="text-[10px] uppercase tracking-[0.32em] text-white/35">
                  {s.label}
                </p>
                <div className="mt-2">
                  <p className="font-display text-2xl font-semibold tracking-tight text-white transition-colors group-hover:text-[var(--color-brand)] sm:text-[1.65rem]">
                    {s.value}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
