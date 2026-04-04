import { NextRequest, NextResponse } from "next/server";

/**
 * Public marketing contact form — ENG-189.
 * Sends via Resend when configured; otherwise logs (dev) and returns 200.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const hospitalName = typeof body.hospital_name === "string" ? body.hospital_name.trim() : "";
  const contactName = typeof body.contact_name === "string" ? body.contact_name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";

  if (!hospitalName || !contactName || !email) {
    return NextResponse.json(
      { error: "hospital_name, contact_name, and email are required" },
      { status: 400 }
    );
  }

  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "Kanta <onboarding@resend.dev>";

  const text = [
    "Kanta — Request access",
    "",
    `Hospital: ${hospitalName}`,
    `Contact: ${contactName}`,
    `Email: ${email}`,
    `Phone: ${phone || "—"}`,
    `City: ${city || "—"}`,
  ].join("\n");

  if (!key) {
    // TODO: wire RESEND_API_KEY in deployment for production delivery
    console.log("[POST /api/contact] RESEND_API_KEY not set — would send:\n", text);
    return NextResponse.json({ ok: true, queued: false });
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from,
      to: "admin@zyntel.net",
      subject: `Kanta access request — ${hospitalName}`,
      text,
    });
    if (error) {
      console.error("[POST /api/contact] Resend error:", error);
      return NextResponse.json({ error: "Failed to send message" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, queued: true });
  } catch (e) {
    console.error("[POST /api/contact]", e);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
