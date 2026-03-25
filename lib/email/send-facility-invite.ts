type SendInviteParams = {
  to: string;
  inviteUrl: string;
  facilityName?: string;
};

/**
 * Sends invite email via Resend when RESEND_API_KEY is set; otherwise logs the link (dev).
 */
export async function sendFacilityInviteEmail(params: SendInviteParams): Promise<{
  ok: boolean;
  skipped?: boolean;
  error?: string;
}> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || "Kanta <onboarding@resend.dev>";

  if (!key) {
    console.warn("[invite] RESEND_API_KEY not set — invite URL:", params.inviteUrl);
    return { ok: false, skipped: true };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.facilityName
        ? `You're invited to ${params.facilityName} on Kanta`
        : "You're invited to Kanta",
      html: `
        <p>You have been invited to join a facility on Kanta.</p>
        <p><a href="${params.inviteUrl}">Accept invitation</a></p>
        <p>If you did not expect this email, you can ignore it.</p>
      `,
    });
    if (error) {
      console.error("[invite] Resend error:", error);
      return { ok: false, error: String(error) };
    }
    return { ok: true };
  } catch (e) {
    console.error("[invite] send failed:", e);
    return { ok: false, error: (e as Error).message };
  }
}
