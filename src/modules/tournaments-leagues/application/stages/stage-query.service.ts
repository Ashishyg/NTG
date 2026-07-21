import { prisma } from "@core/database/client";
import type {
  StageQualificationRulePublic,
  TournamentStagePublicView,
} from "@core/contracts/tournament-stages";
import {
  parseDestination,
  parseSelector,
} from "@tournaments-leagues/domain/stages/validation";
import { computeGroupStandings } from "./standings.engine";

function readFinalsFormat(config: unknown): "BO1" | "BO3" | "BO5" | null {
  if (config && typeof config === "object" && "finalsMatchFormat" in config) {
    const v = (config as { finalsMatchFormat?: string }).finalsMatchFormat;
    if (v === "BO1" || v === "BO3" || v === "BO5") return v;
  }
  return null;
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function selectorLabel(raw: unknown): string {
  const s = parseSelector(raw);
  if (!s) return "Custom rule";
  if (s.kind === "TOP_N") return `Top ${s.n}`;
  if (s.kind === "BOTTOM_N") return `Bottom ${s.n}`;
  if (s.kind === "POSITION" || s.kind === "CUSTOM") {
    return s.positions.map(ordinal).join(" & ");
  }
  if (s.kind === "PERCENTAGE") return `Top ${s.n}%`;
  return "Custom rule";
}

function destinationLabel(
  raw: unknown,
  stageNameById: Map<string, string>,
): { label: string; kind: StageQualificationRulePublic["destinationKind"] } {
  const d = parseDestination(raw);
  if (!d) return { label: "Unknown destination", kind: "UNKNOWN" };
  if (d.kind === "ELIMINATED") {
    return { label: "Eliminated (DQ / out)", kind: "ELIMINATED" };
  }
  if (d.kind === "CHAMPION") {
    return { label: "Named Champion", kind: "CHAMPION" };
  }
  if (d.kind === "LOWER_BRACKET") {
    return { label: "Drops to lower bracket", kind: "LOWER_BRACKET" };
  }
  if (d.kind === "STAGE" || d.kind === "STAGE_GROUP") {
    const name = stageNameById.get(d.stageId) ?? "next stage";
    return { label: `Advances to ${name}`, kind: d.kind };
  }
  return { label: "Unknown destination", kind: "UNKNOWN" };
}

export async function mapStagesToPublic(
  tournamentId: string,
): Promise<TournamentStagePublicView[]> {
  const stages = await prisma.tournamentStage.findMany({
    where: { tournamentId },
    orderBy: { order: "asc" },
    include: {
      groups: {
        orderBy: { order: "asc" },
        include: {
          slots: {
            orderBy: { slotIndex: "asc" },
            include: { team: { select: { id: true, name: true } } },
          },
        },
      },
      qualificationRules: {
        orderBy: { priority: "asc" },
        include: { group: { select: { id: true, name: true } } },
      },
      seedingEntries: {
        orderBy: { seed: "asc" },
        include: { team: { select: { id: true, name: true } } },
      },
      bracket: {
        include: {
          matches: {
            orderBy: [{ roundNumber: "asc" }, { positionInRound: "asc" }],
            include: {
              participants: { orderBy: { slot: "asc" } },
              result: true,
            },
          },
        },
      },
    },
  });

  const stageNameById = new Map(stages.map((s) => [s.id, s.name]));
  const views: TournamentStagePublicView[] = [];

  for (const stage of stages) {
    const groups = [];
    for (const g of stage.groups) {
      const standings = await computeGroupStandings(stage.id, g.id);
      groups.push({
        id: g.id,
        name: g.name,
        order: g.order,
        targetSize: g.targetSize,
        slots: g.slots.map((s) => ({
          id: s.id,
          slotIndex: s.slotIndex,
          teamId: s.teamId,
          teamName: s.team?.name ?? null,
          sourceStageId: s.sourceStageId,
          sourceGroupId: s.sourceGroupId,
          sourcePosition: s.sourcePosition,
          eliminated: s.eliminated,
        })),
        standings,
      });
    }

    const finalsMatchFormat = readFinalsFormat(stage.config);
    const matches = stage.bracket?.matches ?? [];
    const maxRound = matches.reduce((m, x) => Math.max(m, x.roundNumber), 0);

    const qualificationRules: StageQualificationRulePublic[] =
      stage.qualificationRules.map((r) => {
        const dest = destinationLabel(r.destination, stageNameById);
        return {
          id: r.id,
          groupId: r.groupId,
          groupName: r.group?.name ?? null,
          priority: r.priority,
          selectorLabel: selectorLabel(r.selector),
          destinationLabel: dest.label,
          destinationKind: dest.kind,
        };
      });

    views.push({
      id: stage.id,
      name: stage.name,
      order: stage.order,
      stageType: stage.stageType,
      matchFormat: stage.matchFormat,
      finalsMatchFormat,
      seedingMethod: stage.seedingMethod,
      status: stage.status,
      groups,
      matches: matches.map((m) => {
        const isFinal =
          m.bracketSide === "grand_final" ||
          (!m.nextWinnerMatchId &&
            m.bracketSide !== "losers" &&
            m.roundNumber === maxRound);
        return {
          id: m.id,
          roundNumber: m.roundNumber,
          positionInRound: m.positionInRound,
          bracketSide: m.bracketSide,
          status: m.status,
          stageGroupId: m.stageGroupId,
          matchFormat:
            isFinal && finalsMatchFormat ? finalsMatchFormat : stage.matchFormat,
          isFinal,
          scheduledAt: m.scheduledAt?.toISOString() ?? null,
          scheduleStatus: m.scheduleStatus ?? null,
          participants: m.participants.map((p) => ({
            slot: p.slot,
            teamId: p.tournamentTeamId,
            teamLabel: p.teamLabel,
            seed: p.seed,
          })),
          result: m.result
            ? {
                winnerSlot: m.result.winnerSlot,
                scoreSummary: m.result.scoreSummary,
                scoreA: m.result.scoreA,
                scoreB: m.result.scoreB,
              }
            : null,
        };
      }),
      seeding: stage.seedingEntries.map((e) => ({
        teamId: e.teamId,
        teamName: e.team.name,
        seed: e.seed,
      })),
      qualificationRules,
    });
  }

  return views;
}
