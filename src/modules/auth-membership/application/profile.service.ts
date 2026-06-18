import type { PublicProfile } from "@core/contracts";
import type { CreateGameIdentityInput, UpdateProfileInput } from "../domain/types";
import { ProfileRepository } from "../infrastructure/profile.repository";

const profileRepo = new ProfileRepository();

export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  return profileRepo.findPublicByUserId(userId);
}

export async function updatePlayerProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<PublicProfile | null> {
  return profileRepo.updateProfile(userId, input);
}

export async function linkGameIdentity(
  userId: string,
  input: CreateGameIdentityInput,
): Promise<PublicProfile | null> {
  return profileRepo.linkGameIdentity(userId, input);
}
