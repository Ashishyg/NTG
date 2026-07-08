"use client";

import { useEffect } from "react";
import { CS2_ROSTER_CHARACTER_IMAGES } from "@/lib/cs2-roster-assets";

/** Warms the browser cache for CS2 roster art as soon as the roster hub mounts. */
export default function Cs2RosterImagePreload() {
  useEffect(() => {
    for (const src of CS2_ROSTER_CHARACTER_IMAGES) {
      const img = new window.Image();
      img.decoding = "async";
      img.fetchPriority = "high";
      img.src = src;
    }
  }, []);

  return null;
}
