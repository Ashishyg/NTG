import { auth } from "@auth-membership/index";

export async function getSession() {
  if (!auth) return null;
  return auth();
}
