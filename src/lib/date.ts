export function formatDateGregorian(dateStrOrDate: string | Date) {
  const d = typeof dateStrOrDate === "string" ? new Date(dateStrOrDate) : dateStrOrDate;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // 2025-11-29
}
