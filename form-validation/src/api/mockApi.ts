const TAKEN_EMAILS = new Set([
  "taken@example.com",
  "already@used.com",
  "test@test.com",
]);

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function isEmailTaken(email: string): Promise<boolean> {
  await wait(500);
  return TAKEN_EMAILS.has(email.trim().toLowerCase());
}

export type SubmitResult =
  | { ok: true; applicationId: string }
  | { ok: false; error: string };

export async function submitApplication(
  payload: unknown
): Promise<SubmitResult> {
  await wait(900);
  // eslint-disable-next-line no-console
  console.log("Submitting application payload:", payload);

  if (Math.random() < 0.4) {
    return { ok: false, error: "Server is busy. Please try again." };
  }
  return {
    ok: true,
    applicationId: `APP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  };
}
