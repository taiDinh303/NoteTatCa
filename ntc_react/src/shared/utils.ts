import { ApiError } from "../infrastructure/http";
import { currentLanguage, t } from "./i18n";
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? t(error.message)
    : t("Something went wrong. Please try again.");
}
export function validationMessage(error: unknown) {
  if (error instanceof ApiError) {
    const fields = Object.values(error.fields).flat();
    return fields.length
      ? fields.map((message) => t(message)).join(" ")
      : errorMessage(error);
  }
  return errorMessage(error);
}
export function dateTime(value: string | null, zone?: string) {
  if (!value) return t("Not scheduled");
  try {
    return new Intl.DateTimeFormat(currentLanguage(), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: zone,
    }).format(new Date(value));
  } catch {
    return value;
  }
}
export function shortDate(value: string) {
  return new Intl.DateTimeFormat(currentLanguage(), {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
export function download(
  filename: string,
  content: string,
  type = "text/plain",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "N"
  );
}
