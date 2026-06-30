"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { ListingPreview } from "@core/contracts/roster-listings";
import ListingCard from "./ListingCard";

type Tab = "ALL" | "JOB" | "ROSTER_TRYOUT";

type Props = {
  listings: ListingPreview[];
  initialType?: string | null;
};

export default function ListingsBoard({ listings, initialType }: Props) {
  const initialTab: Tab =
    initialType === "JOB" || initialType === "ROSTER_TRYOUT" ? initialType : "ALL";
  const [tab, setTab] = useState<Tab>(initialTab);

  const filtered = useMemo(() => {
    if (tab === "ALL") return listings;
    return listings.filter((l) => l.type === tab);
  }, [listings, tab]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "ALL", label: "All" },
    { id: "JOB", label: "Jobs" },
    { id: "ROSTER_TRYOUT", label: "Team tryouts" },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-1 rounded-full bg-[#111] p-1.5 backdrop-blur-md border border-white/20 shadow-inner">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                tab === t.id
                  ? "text-black"
                  : "text-white/50 hover:text-white/90 hover:bg-white/5"
              }`}
            >
              {tab === t.id && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 z-0 rounded-full bg-[var(--color-brand)] shadow-[0_4px_14px_0_rgba(94,234,212,0.39)]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brand)]/20 bg-[var(--color-brand)]/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-brand)] shadow-[0_0_16px_-4px_rgba(94,234,212,0.2)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)] shadow-[0_0_8px_rgba(94,234,212,0.8)] animate-pulse"></span>
            {filtered.length} open {filtered.length === 1 ? "listing" : "listings"}
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-24 text-center backdrop-blur-sm">
          <p className="font-display text-xl text-white/70">No opportunities available</p>
          <p className="mt-3 text-sm text-white/40 max-w-sm mx-auto">
            Check back soon or browse other categories to see our open listings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {filtered.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
