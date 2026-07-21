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
import {
  parseStoredGames,
  readFinalsFormat,
  resolveMatchFormat,
} from "./series-format";

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
    return { label: "Eliminated", kind: "ELIMINATED" };
  }
  if (d.kind === "CHAMPION") {
    return { label: "Champion", kind: "CHAMPION" };
  }
  if (d.kind === "LOWER_BRACKET") {
    return { label: "Lower Bracket", kind: "LOWER_BRACKET" };
  }
  if (d.kind === "STAGE" || d.kind === "STAGE_GROUP") {
    const name = stageNameById.get(d.stageId) ?? "Next Stage";
    return { label: name, kind: d.kind };
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

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i]!;
    const previous = [...stages]
      .filter((s) => s.order < stage.order)
      .sort((a, b) => b.order - a.order)[0];
    const revealed =
      !previous ||
      previous.status === "COMPLETE" ||
      stage.status === "COMPLETE";

    const groups = [];
    for (const g of stage.groups) {
      const standings = revealed
        ? await computeGroupStandings(stage.id, g.id)
        : [];
      groups.push({
        id: g.id,
        name: g.name,
        order: g.order,
        targetSize: g.targetSize,
        slots: revealed
          ? g.slots.map((s) => ({
              id: s.id,
              slotIndex: s.slotIndex,
              teamId: s.teamId,
              teamName: s.team?.name ?? null,
              sourceStageId: s.sourceStageId,
              sourceGroupId: s.sourceGroupId,
              sourcePosition: s.sourcePosition,
              eliminated: s.eliminated,
            }))
          : g.slots.map((s) => ({
              id: s.id,
              slotIndex: s.slotIndex,
              teamId: null,
              teamName: null,
              sourceStageId: null,
              sourceGroupId: null,
              sourcePosition: null,
              eliminated: false,
            })),
        standings,
      });
    }

    const finalsMatchFormat = readFinalsFormat(stage.config);
    const matches = revealed ? (stage.bracket?.matches ?? []) : [];
    const winnersMaxRound = matches.reduce((max, x) => {
      if (x.bracketSide === "losers" || x.bracketSide === "grand_final") return max;
      return Math.max(max, x.roundNumber);
    }, 0);

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
      revealed,
      groups,
      matches: matches.map((m) => {
        const matchFormat = resolveMatchFormat({
          stageMatchFormat: stage.matchFormat,
          config: stage.config,
          bracketSide: m.bracketSide,
          nextWinnerMatchId: m.nextWinnerMatchId,
          roundNumber: m.roundNumber,
          winnersMaxRound,
        });
        const isFinal = matchFormat !== stage.matchFormat ||
          m.bracketSide === "grand_final" ||
          (!m.nextWinnerMatchId && m.bracketSide !== "losers");
        return {
          id: m.id,
          roundNumber: m.roundNumber,
          positionInRound: m.positionInRound,
          bracketSide: m.bracketSide,
          status: m.status,
          stageGroupId: m.stageGroupId,
          matchFormat,
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
                games: parseStoredGames((m.result as { games?: unknown }).games),
              }
            : null,
        };
      }),
      seeding: revealed
        ? stage.seedingEntries.map((e) => ({
            teamId: e.teamId,
            teamName: e.team.name,
            seed: e.seed,
          }))
        : [],
      qualificationRules,
    });
  }

  return views;
}
