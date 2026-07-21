"use client";

import type { ReactNode } from "react";
import { STAGE_DETAIL_TABS, type StageDetailTabId } from "./types";

type Props = {
  activeTab: StageDetailTabId;
  onChange: (tab: StageDetailTabId) => void;
  children: ReactNode;
};

export default function StageDetailTabs({ activeTab, onChange, children }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-xl bg-white/[0.03] p-1">
        {STAGE_DETAIL_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition ${
              activeTab === tab.id
                ? "bg-white/[0.1] text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="min-h-[12rem]">{children}</div>
    </div>
  );
}
