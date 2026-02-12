interface SendEmailValues {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail(
  env: { RESEND_API_KEY: string },
  { to, subject, text }: SendEmailValues
) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "verification@alizmail.com",
      to,
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error);
  }

  return res.json();
}
