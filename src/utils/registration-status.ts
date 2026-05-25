import { EventItem } from "@/src/types/app";
import { formatRegistrationCountdown } from "@/src/utils/format";

export type RegistrationState = {
  borderColor: string;
  isOpen: boolean;
  label: string;
  tone: "closed" | "open";
};

export function getRegistrationState(
  event: Pick<EventItem, "date" | "registration_until" | "registrations_paused">,
  colors: { closed: string; open: string },
): RegistrationState {
  if (event.registrations_paused) {
    return {
      borderColor: colors.closed,
      isOpen: false,
      label: "Registrations paused",
      tone: "closed",
    };
  }

  const now = Date.now();
  const eventTime = new Date(event.date).getTime();
  const deadlineTime = event.registration_until
    ? new Date(event.registration_until).getTime()
    : eventTime;
  const isOpen = deadlineTime > now;

  return {
    borderColor: isOpen ? colors.open : colors.closed,
    isOpen,
    label: isOpen
      ? `Registration end: ${
          event.registration_until
            ? formatRegistrationCountdown(event.registration_until)
            : "Closes when event starts"
        }`
      : "Registration closed",
    tone: isOpen ? "open" : "closed",
  };
}
