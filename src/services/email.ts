
import { Currency } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { ExternalServiceError } from "@/utils/error";
import { createLogger } from "@/utils/logger";

interface ResendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}


export class Emailservice {
  private apiKey: string;
  private fromEmail: string;
  private logger;

    constructor(apiKey: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
    this.logger = createLogger();
  }
    private async send(options: ResendEmailOptions): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        from: options.from || this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error('Failed to send email', new Error(error), { to: options.to });
      throw new ExternalServiceError('Resend', `Failed to send email: ${error}`);
    }

    this.logger.info('Email sent successfully', { to: options.to, subject: options.subject });
  }
  async sendInvoice(
    to: string,
    invoiceNumber: string,
    businessName: string,
    total: number,
    currency: Currency,
    dueDate: string,
    publicUrl: string,
    fromName?: string
  ): Promise<void> {
    await this.send({
      to,
      from: fromName ? `${fromName} <${this.fromEmail}>` : this.fromEmail,
      subject: `Invoice ${invoiceNumber} from ${businessName || 'Kivo'}`,
     html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Invoice ${invoiceNumber}</title>
  </head>

  <body style="margin:0; padding:0; background-color:#f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; padding:24px 0;">
      <tr>
        <td align="center">

          <!-- Card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background:#ffffff; border-radius:10px; overflow:hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">

            <!-- Header -->
            <tr>
              <td style="padding:24px 32px; background:#111827; color:#ffffff;">
                <h1 style="margin:0; font-size:20px; font-weight:600;">
                  ${businessName || 'Kivo'}
                </h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:32px; color:#111827;">
                <h2 style="margin:0 0 16px 0; font-size:18px; font-weight:600;">
                  Invoice ${invoiceNumber}
                </h2>

                <!-- Amount box -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb; border-radius:8px; margin-bottom:24px;">
                  <tr>
                    <td style="padding:16px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="color:#6b7280; font-size:14px;">
                            Amount Due
                          </td>
                          <td align="right" style="font-size:18px; font-weight:600;">
                            ${formatCurrency(total, currency)}
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2" style="height:8px;"></td>
                        </tr>
                        <tr>
                          <td style="color:#6b7280; font-size:14px;">
                            Due Date
                          </td>
                          <td align="right" style="font-size:14px;">
                            ${new Date(dueDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Button -->
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <a href="${publicUrl}"
                        style="
                          display:inline-block;
                          background:#10b981;
                          color:#ffffff;
                          text-decoration:none;
                          padding:12px 20px;
                          border-radius:6px;
                          font-weight:500;
                          font-size:14px;
                        ">
                        View Invoice
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px 32px; background:#f9fafb; color:#9ca3af; font-size:12px;">
                This invoice was sent via <strong>Kivo</strong>.
              </td>
            </tr>

          </table>
          <!-- End Card -->

        </td>
      </tr>
    </table>
  </body>
</html>
`

    });
  }

}