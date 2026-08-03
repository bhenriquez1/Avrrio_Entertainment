"use client";

const guestModeActive = process.env.NEXT_PUBLIC_GUEST_MODE === "true";

export function GuestModeBanner() {
  if (!guestModeActive) return null;

  return (
    <div className="bg-sky-600 px-4 py-2 text-center text-xs font-medium text-white">
      Guest Testing Mode — Data is stored only in this browser. Sign in to save your work permanently.
    </div>
  );
}
