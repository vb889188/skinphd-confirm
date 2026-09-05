export function haptic(kind: "tap" | "success" | "complete" | "warn" = "tap") {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  const pattern = {
    tap: 12,
    success: [10, 30, 16],
    complete: [12, 40, 12, 40, 24],
    warn: [40, 30, 40],
  }[kind];
  try {
    navigator.vibrate(pattern);
  } catch {
    /* some browsers expose vibrate but reject it */
  }
}
