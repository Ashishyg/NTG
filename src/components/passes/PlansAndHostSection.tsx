import { getLoungeCommerceHomeData } from "@lounge-commerce/index";
import { showPlansSection } from "@/lib/env";
import { serverEnv } from "@core/config/env.server";
import PlansAndHostClient from "./PlansAndHostClient";

export default async function PlansAndHostSection() {
  if (!showPlansSection || !serverEnv.databaseUrl) {
    return null;
  }

  const data = await getLoungeCommerceHomeData();
  if (
    data.playstationFeatured.length === 0 &&
    data.pcPlans.length === 0 &&
    data.hostOfferings.length === 0
  ) {
    return null;
  }

  return <PlansAndHostClient data={data} />;
}
