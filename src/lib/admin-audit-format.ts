const ACTION_LABELS: Record<string, string> = {
  "tournament.update": "Updated cup",
  "tournament.delete": "Deleted cup",
  "member.update": "Updated member",
  "member.delete": "Deleted member",
  "member.resetPassword": "Reset member password",
  "member.linkRiot": "Linked Riot ID",
  "member.unlinkRiot": "Unlinked Riot ID",
  "member.linkSteam": "Linked Steam",
  "member.unlinkSteam": "Unlinked Steam",
  "upload.create": "Uploaded image",
  "upload.rulebook": "Uploaded rulebook",
  "leaderboard.sync": "Refreshed leaderboard ranks",
};

const FIELD_LABELS: Record<string, string> = {
  name: "name",
  game: "game",
  gameLabel: "game label",
  seasonId: "season",
  status: "status",
  description: "description",
  startsAt: "start date",
  endsAt: "end date",
  registrationOpensAt: "registration open",
  registrationClosesAt: "registration close",
  autoManageStatus: "auto status",
  prizePool: "prize pool",
  prizeNotes: "prize notes",
  prizeSplit: "prize split",
  bracketUrl: "bracket URL",
  posterUrl: "poster",
  hubBannerUrl: "hub banner",
  hubCarouselImages: "carousel images",
  showOnEsportsHub: "esports hub visibility",
  hideAfter: "hide after",
  rulebookUrl: "rulebook",
  teams: "teams",
  registrationFormat: "registration format",
  phone: "phone",
  role: "role",
  displayName: "display name",
};

function labelField(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim().toLowerCase();
}

export function formatAuditOperation(action: string, metadata: unknown): string {
  const base = ACTION_LABELS[action] ?? action.replace(/\./g, " · ");

  if (!metadata || typeof metadata !== "object") {
    return base;
  }

  const m = metadata as Record<string, unknown>;

  if (Array.isArray(m.fields) && m.fields.length > 0) {
    const fields = m.fields
      .filter((f): f is string => typeof f === "string" && f !== "action")
      .map(labelField);
    if (fields.length > 0) {
      return `${base}: ${fields.join(", ")}`;
    }
  }

  if (typeof m.prefix === "string" && m.prefix) {
    return `${base} (${m.prefix})`;
  }

  if (typeof m.synced === "number") {
    const failed = typeof m.failed === "number" ? m.failed : 0;
    const skipped = typeof m.skipped === "number" ? m.skipped : 0;
    return `${base}: ${m.synced} updated, ${skipped} skipped, ${failed} failed`;
  }

  return base;
}
