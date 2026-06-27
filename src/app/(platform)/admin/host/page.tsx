import AdminHostPanel from "@/components/admin/AdminHostPanel";
import {
  listAllHostOfferingsAdmin,
  listAllSponsorLogosAdmin,
} from "@lounge-commerce/index";
import { serverEnv } from "@core/config/env.server";

export const metadata = { title: "Admin Host" };

export default async function AdminHostPage() {
  const [offerings, sponsorLogos] = serverEnv.databaseUrl
    ? await Promise.all([listAllHostOfferingsAdmin(), listAllSponsorLogosAdmin()])
    : [[], []];

  return (
    <AdminHostPanel initialOfferings={offerings} initialSponsorLogos={sponsorLogos} />
  );
}
