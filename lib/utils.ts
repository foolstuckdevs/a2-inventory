import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const shortDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function normalizeDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const normalized = value instanceof Date ? value : new Date(value);
  return Number.isNaN(normalized.getTime()) ? null : normalized;
}

export function formatShortDate(value: Date | string | null | undefined) {
  const normalized = normalizeDate(value);
  return normalized ? shortDateFormatter.format(normalized) : "—";
}

export function formatShortDateTime(value: Date | string | null | undefined) {
  const normalized = normalizeDate(value);
  return normalized ? shortDateTimeFormatter.format(normalized) : "—";
}
