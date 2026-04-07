import type { JourneyActionType } from "./types";
export function runJourneyAction(params: {
  type: JourneyActionType;
  context: {
    bookingId: string;
    relatedBookingLinks: {
      newBookingId: string | null;
      sourceBookingId: string | null;
    };
  };
  handlers: {
    confirm: () => void;
    cancel: () => void;
    reschedule: () => void;
    recreate: () => void;
    scrollToMessages: () => void;
    scrollToAutomation: () => void;
    scrollToResources: () => void;
    openNewBooking: (id: string) => void;
    openSourceBooking: (id: string) => void;
  };
}) {
  const { type, context, handlers } = params;

  switch (type) {
    case "confirm_booking":
      handlers.confirm();
      break;

    case "open_recreate":
      handlers.recreate();
      break;

    case "scroll_messages":
      handlers.scrollToMessages();
      break;

    case "scroll_automation":
      handlers.scrollToAutomation();
      break;

    case "scroll_resources":
      handlers.scrollToResources();
      break;

    case "open_new_booking":
      if (context.relatedBookingLinks.newBookingId) {
        handlers.openNewBooking(context.relatedBookingLinks.newBookingId);
      }
      break;

    case "open_source_booking":
      if (context.relatedBookingLinks.sourceBookingId) {
        handlers.openSourceBooking(context.relatedBookingLinks.sourceBookingId);
      }
      break;
  }
}
