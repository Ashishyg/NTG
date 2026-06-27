const DEFAULT_MORE_PASSES_MESSAGE =
  "Hi NTG Lounge, I'd like to inquire about more gamepass options (5hr packs, controller rates, etc.).";

const HOST_MESSAGES = {
  sponsor:
    "Hi NTG Lounge, I'd like to inquire about sponsorship opportunities.",
  birthday: "Hi NTG Lounge, I'd like to inquire about hosting a birthday party.",
  events: "Hi NTG Lounge, I'd like to inquire about renting the lounge for a private event.",
} as const;

export type HostInquiryTopic = keyof typeof HOST_MESSAGES;

export function morePassesWhatsappMessage(): string {
  return DEFAULT_MORE_PASSES_MESSAGE;
}

export function hostInquiryWhatsappMessage(topic: HostInquiryTopic): string {
  return HOST_MESSAGES[topic];
}

export function planWhatsappMessage(
  custom: string | null | undefined,
  fallback: string,
): string {
  return custom?.trim() || fallback;
}
