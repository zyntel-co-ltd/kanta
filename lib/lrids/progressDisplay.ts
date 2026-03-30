/**
 * LRIDS / Progress display — matches zyntel-dashboard `progressUtils` + index.css colours.
 */

export type LridsProgressCssClass =
  | "progress-complete-actual"
  | "progress-overdue"
  | "progress-urgent"
  | "progress-pending";

export type LridsProgressResult = {
  text: string;
  cssClass: LridsProgressCssClass;
};

/** Map zyntel CSS tokens to display styles (Flask parity). */
export const LRIDS_PROGRESS_STYLES: Record<
  LridsProgressCssClass,
  { color: string; fontWeight: number }
> = {
  "progress-complete-actual": { color: "#008000", fontWeight: 700 },
  "progress-overdue": { color: "#ff0000", fontWeight: 700 },
  "progress-urgent": { color: "#ffa500", fontWeight: 700 },
  "progress-pending": { color: "#4b5563", fontWeight: 400 },
};

/**
 * @param timeExpected ISO string for expected completion (ETA)
 * @param timeOut ISO string when result is out (completed)
 */
export function calculateLridsProgress(
  timeExpected: string | null | undefined,
  timeOut?: string | null | undefined
): LridsProgressResult {
  const now = new Date();

  const hasTimeOut =
    timeOut &&
    timeOut !== "N/A" &&
    timeOut !== null &&
    timeOut !== undefined &&
    String(timeOut) !== "undefined";
  const timeOutDate = hasTimeOut ? new Date(timeOut) : null;
  const isTimeOutValid = timeOutDate && !Number.isNaN(timeOutDate.getTime());
  const isTimeOutInPast = isTimeOutValid && timeOutDate! <= now;

  const hasTimeExpected =
    timeExpected && timeExpected !== "N/A" && timeExpected !== null && timeExpected !== undefined;
  const timeExpectedDate = hasTimeExpected ? new Date(timeExpected) : null;
  const isTimeExpectedValid = timeExpectedDate && !Number.isNaN(timeExpectedDate.getTime());
  const isTimeExpectedInPast = isTimeExpectedValid && timeExpectedDate! <= now;

  if (isTimeOutValid && isTimeOutInPast) {
    return { text: "Completed", cssClass: "progress-complete-actual" };
  }

  if (isTimeExpectedValid && isTimeExpectedInPast && !isTimeOutValid) {
    return { text: "Delayed", cssClass: "progress-overdue" };
  }

  if (isTimeExpectedValid && !isTimeExpectedInPast) {
    const timeLeft = timeExpectedDate!.getTime() - now.getTime();
    const timeLeftInMinutes = Math.floor(timeLeft / (1000 * 60));
    const timeLeftInHours = Math.floor(timeLeft / (1000 * 60 * 60));
    const timeLeftInDays = Math.floor(timeLeft / (1000 * 60 * 60 * 24));

    if (timeLeftInMinutes <= 10 && timeLeftInMinutes > 0) {
      return {
        text: `${timeLeftInMinutes} min(s) remaining`,
        cssClass: "progress-urgent",
      };
    }
    if (timeLeftInDays > 0) {
      return {
        text: `${timeLeftInDays} day(s) remaining`,
        cssClass: "progress-pending",
      };
    }
    if (timeLeftInHours > 0) {
      return {
        text: `${timeLeftInHours} hr(s) remaining`,
        cssClass: "progress-pending",
      };
    }
    if (timeLeftInMinutes > 0) {
      return {
        text: `${timeLeftInMinutes} min(s) remaining`,
        cssClass: "progress-pending",
      };
    }
    return { text: "Due now", cssClass: "progress-pending" };
  }

  return { text: "No ETA", cssClass: "progress-pending" };
}
