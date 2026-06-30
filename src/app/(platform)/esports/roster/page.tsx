import PlatformHeader from "@/components/platform/shell/PlatformHeader";
import RosterHub from "@/components/platform/roster/RosterHub";
import { listRosterTeams } from "@roster-listings/index";
import { listOpenListings } from "@roster-listings/index";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "NTG Roster",
};

export default async function RosterPage() {
  const [teams, jobListings, tryoutListings] = await Promise.all([
    listRosterTeams(),
    listOpenListings("JOB"),
    listOpenListings("ROSTER_TRYOUT"),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
      <PlatformHeader
        eyebrow="NTG Esports"
        title="Official Roster"
        subtitle="Our competitive teams — and open team tryouts you can apply for right now."
      />
      <RosterHub teams={teams} jobListings={jobListings} tryoutListings={tryoutListings} />
    </div>
  );
}
