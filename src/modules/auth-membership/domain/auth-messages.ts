/** Generic auth messages — avoid leaking whether an account/email exists. */

export const AUTH_GENERIC_LOGIN_ERROR = "Incorrect email or password.";

/** Shown when input shape is invalid but we avoid naming sensitive fields. */
export const AUTH_GENERIC_VALIDATION_ERROR =
  "Invalid input. Check your details and try again.";

/**
 * Shown when email, phone, username, or Olympus ID is already in use.
 * Never say which field matched — prevents account/username enumeration.
 */
export const AUTH_SIGNUP_DETAILS_CONFLICT =
  "Unable to register with these details. If you already have an account, sign in instead.";

/** @deprecated Use AUTH_SIGNUP_DETAILS_CONFLICT */
export const AUTH_EMAIL_PHONE_CONFLICT = AUTH_SIGNUP_DETAILS_CONFLICT;

/** @deprecated Use AUTH_SIGNUP_DETAILS_CONFLICT */
export const AUTH_GENERIC_SIGNUP_CONFLICT = AUTH_SIGNUP_DETAILS_CONFLICT;

export const AUTH_PASSWORD_RESET_REQUEST_MESSAGE =
  "If that email is registered, you'll receive a reset link.";

export const AUTH_RESET_CODE_EXPIRED = "Code expired. Request a new one.";
export const AUTH_RESET_CODE_INVALID = "Incorrect verification code.";
export const AUTH_RESET_TOO_MANY_ATTEMPTS = "Too many attempts. Request a new code.";
export const AUTH_RESET_FAILED =
  "We couldn't reset your password. Check your email and code, then try again.";

export const AUTH_COMPLETE_SIGNUP_MESSAGE =
  "Complete your account setup to sign in.";
