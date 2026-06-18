export type RegistrationResult =
  | { ok: true; registrationId: string }
  | { ok: false; error: string };
