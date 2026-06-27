import type { GamepassPlanView } from "@lounge-commerce/domain/types";

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export type PlanPriceRow = {
  amount: number;
  unit: string;
  /** Secondary row (e.g. night rate below day rate). */
  muted?: boolean;
};

function isHourlyDayNightPlan(plan: GamepassPlanView): boolean {
  if (plan.slug.includes("1-hour") || plan.slug.includes("1-hr")) return true;
  return /^1\s*hour$/i.test(plan.title.trim());
}

function packUnitFromTitle(title: string): string {
  const match = title.match(/(\d+)\s*-?\s*hour/i);
  if (match) return `/ ${match[1]}-Hour Pack`;
  return "/ Pack";
}

export function getPlanPriceRows(plan: GamepassPlanView): PlanPriceRow[] | null {
  if (plan.inquiryOnly) return null;

  if (plan.priceDay != null && plan.priceNight != null) {
    if (isHourlyDayNightPlan(plan)) {
      return [
        { amount: plan.priceDay, unit: "/ hr Day" },
        { amount: plan.priceNight, unit: "/ hr Night", muted: true },
      ];
    }

    return [
      { amount: plan.priceDay, unit: "/ Day Pack" },
      { amount: plan.priceNight, unit: "/ Night Pack", muted: true },
    ];
  }

  if (plan.priceSingle != null) {
    const unit = plan.title.toLowerCase().includes("pack")
      ? packUnitFromTitle(plan.title)
      : plan.category === "PC"
        ? "/ hr"
        : "/ session";

    return [{ amount: plan.priceSingle, unit }];
  }

  if (plan.priceController != null) {
    return [{ amount: plan.priceController, unit: "/ controller / hr" }];
  }

  return null;
}

/** @deprecated Use getPlanPriceRows for UI rendering. */
export function formatPlanPriceLabel(plan: GamepassPlanView): string | null {
  const rows = getPlanPriceRows(plan);
  if (!rows?.length) return null;
  return rows.map((row) => `${formatInr(row.amount)} ${row.unit}`).join(" · ");
}

export function planMetaLines(plan: GamepassPlanView): string[] {
  const lines: string[] = [];
  if (plan.timeWindowText) lines.push(plan.timeWindowText);
  if (plan.validityText) lines.push(`Valid for ${plan.validityText}`);
  if (
    plan.subtitle &&
    !plan.timeWindowText &&
    !(plan.priceDay != null && plan.priceNight != null)
  ) {
    lines.push(plan.subtitle);
  }
  return lines;
}
