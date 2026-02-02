// PDF generation using Cloudflare Browser Rendering API
// Falls back to HTML if the API is unavailable

import { formatCurrency, formatDateForTimezone } from "@/lib/utils";
import { z } from "zod";

// Updated schemas to match your database types
const clientSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  company: z.string().nullable(),
  address: z.string().nullable(),
});

const invoiceItemSchema = z.object({
  id: z.string(),
  invoice_id: z.string(),
  description: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  amount: z.number(),
  sort_order: z.number(),
  tax_rate: z.number().nullable(),
});

const invoiceWithClientSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  client_id: z.string(),
  invoice_number: z.string(),
  status: z.enum(["draft", "pending", "paid", "void", "overdue", "sent"]),
  issue_date: z.date(),
  due_date: z.date(),
  currency: z.string(),
  subtotal: z.number(),
  tax_total: z.number(),
  discount_type: z.enum(["percentage", "fixed"]).nullable(),
  discount_value: z.number().nullable(),
  discount_amount: z.number(),
  total: z.number(),
  notes: z.string().nullable(),
  payment_terms: z.string().nullable(),
  reminders_enabled: z.boolean(),
  pdf_generated_at: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
  client: clientSchema,
  items: z.array(invoiceItemSchema),
});

const settingsSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  business_name: z.string().nullable(),
  business_email: z.string().nullable(),
  business_address: z.string().nullable(),
  logo_url: z.string().nullable(),
  default_currency: z.string(),
  default_payment_terms: z.string(),
  timezone: z.string(),
  email_from_name: z.string().nullable(),
  invoice_prefix: z.string(),
  next_invoice_number: z.number(),
  created_at: z.date(),
  updated_at: z.date(),
});

export type InvoiceWithClient = z.infer<typeof invoiceWithClientSchema>;
export type Settings = z.infer<typeof settingsSchema>;

export interface PDFResult {
  body: ReadableStream | ArrayBuffer;
  contentType: string;
  filename: string;
}

export class PDFService {
  private storage: R2Bucket;
  private CLOUDFLARE_ACCOUNT_ID: string;
  private CLOUDFLARE_API_TOKEN: string;

  constructor(storage: R2Bucket, accountId: string, apiToken: string) {
    this.storage = storage;
    this.CLOUDFLARE_ACCOUNT_ID = accountId;
    this.CLOUDFLARE_API_TOKEN = apiToken;
  }

  async generateInvoicePDF(
    invoice: InvoiceWithClient,
    settings: Settings
  ): Promise<{ data: ArrayBuffer; isPdf: boolean }> {
    const html = this.generateInvoiceHTML(invoice, settings);

    if (this.CLOUDFLARE_ACCOUNT_ID && this.CLOUDFLARE_API_TOKEN) {
      try {
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${this.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/pdf`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.CLOUDFLARE_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              html,
              pdfOptions: {
                format: 'a4',
                printBackground: true,
                margin: {
                  top: '20px',
                  bottom: '20px',
                  left: '20px',
                  right: '20px',
                },
              },
            }),
          }
        );

        if (response.ok) {
          const pdfBuffer = await response.arrayBuffer();
          return { data: pdfBuffer, isPdf: true };
        }

        console.error('Browser Rendering API error:', response.status, await response.text());
      } catch (error) {
        console.error('Browser Rendering API failed:', error);
      }
    }

    console.warn('Falling back to HTML generation');
    const encoder = new TextEncoder();
    return { data: encoder.encode(html).buffer as ArrayBuffer, isPdf: false };
  }

  private generateInvoiceHTML(
    invoice: InvoiceWithClient,
    settings: Settings
  ): string {
    const timezone = settings.timezone || 'Europe/Amsterdam';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1a1a1a;
      background: white;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .logo-section h1 {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    
    .logo-section p {
      color: #6b7280;
      font-size: 13px;
    }
    
    .invoice-info {
      text-align: right;
    }
    
    .invoice-number {
      font-size: 28px;
      font-weight: 700;
      color: #10B981;
      margin-bottom: 8px;
    }
    
    .invoice-dates {
      color: #6b7280;
      font-size: 13px;
    }
    
    .invoice-dates span {
      display: block;
      margin-bottom: 4px;
    }
    
    .parties {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    
    .party {
      width: 45%;
    }
    
    .party-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #9ca3af;
      margin-bottom: 8px;
    }
    
    .party-name {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .party-details {
      color: #6b7280;
      font-size: 13px;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    .items-table th {
      background: #f9fafb;
      padding: 12px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6b7280;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .items-table th:last-child,
    .items-table td:last-child {
      text-align: right;
    }
    
    .items-table td {
      padding: 16px 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .item-description {
      font-weight: 500;
    }
    
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }
    
    .totals-table {
      width: 280px;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      color: #6b7280;
    }
    
    .totals-row.total {
      border-top: 2px solid #e5e7eb;
      margin-top: 8px;
      padding-top: 16px;
      font-size: 18px;
      font-weight: 700;
      color: #1a1a1a;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .status-draft { background: #f3f4f6; color: #6b7280; }
    .status-sent { background: #dbeafe; color: #2563eb; }
    .status-pending { background: #fef3c7; color: #d97706; }
    .status-paid { background: #dcfce7; color: #16a34a; }
    .status-overdue { background: #fff7ed; color: #F97316; }
    .status-void { background: #f1f5f9; color: #64748b; }
    
    .notes {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .notes-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #9ca3af;
      margin-bottom: 8px;
    }
    
    .notes-content {
      color: #4b5563;
      font-size: 13px;
    }
    
    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      <h1>${settings.business_name || 'Invo'}</h1>
      ${settings.business_email ? `<p>${settings.business_email}</p>` : ''}
      ${settings.business_address ? `<p>${settings.business_address.replace(/\n/g, '<br>')}</p>` : ''}
    </div>
    <div class="invoice-info">
      <div class="invoice-number">${invoice.invoice_number}</div>
      <div class="invoice-dates">
        <span>Issue Date: ${formatDateForTimezone(invoice.issue_date, timezone)}</span>
        <span>Due Date: ${formatDateForTimezone(invoice.due_date, timezone)}</span>
      </div>
      <div style="margin-top: 12px;">
        <span class="status-badge status-${invoice.status}">${invoice.status}</span>
      </div>
    </div>
  </div>
  
  <div class="parties">
    <div class="party">
      <div class="party-label">From</div>
      <div class="party-name">${settings.business_name || 'Your Business'}</div>
      <div class="party-details">
        ${settings.business_email || ''}<br>
        ${settings.business_address ? settings.business_address.replace(/\n/g, '<br>') : ''}
      </div>
    </div>
    <div class="party">
      <div class="party-label">Bill To</div>
      <div class="party-name">${invoice.client.name}</div>
      <div class="party-details">
        ${invoice.client.company ? `${invoice.client.company}<br>` : ''}
        ${invoice.client.email}<br>
        ${invoice.client.address ? invoice.client.address.replace(/\n/g, '<br>') : ''}
      </div>
    </div>
  </div>
  
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 50%">Description</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Tax</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map(item => `
        <tr>
          <td class="item-description">${item.description}</td>
          <td>${item.quantity}</td>
          <td>${formatCurrency(item.unit_price, invoice.currency as any)}</td>
          <td>${item.tax_rate ? `${item.tax_rate}%` : '-'}</td>
          <td>${formatCurrency(item.amount, invoice.currency as any)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="totals">
    <div class="totals-table">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${formatCurrency(invoice.subtotal, invoice.currency as any)}</span>
      </div>
      ${invoice.tax_total > 0 ? `
        <div class="totals-row">
          <span>Tax</span>
          <span>${formatCurrency(invoice.tax_total, invoice.currency as any)}</span>
        </div>
      ` : ''}
      ${invoice.discount_amount && invoice.discount_amount > 0 ? `
        <div class="totals-row">
          <span>Discount${invoice.discount_type === 'percentage' && invoice.discount_value ? ` (${invoice.discount_value}%)` : ''}</span>
          <span>-${formatCurrency(invoice.discount_amount, invoice.currency as any)}</span>
        </div>
      ` : ''}
      <div class="totals-row total">
        <span>Total</span>
        <span>${formatCurrency(invoice.total, invoice.currency as any)}</span>
      </div>
    </div>
  </div>
  
  ${invoice.notes ? `
    <div class="notes">
      <div class="notes-label">Notes</div>
      <div class="notes-content">${invoice.notes.replace(/\n/g, '<br>')}</div>
    </div>
  ` : ''}
  
  ${invoice.payment_terms ? `
    <div class="notes">
      <div class="notes-label">Payment Terms</div>
      <div class="notes-content">${invoice.payment_terms.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
    </div>
  ` : ''}
  
  <div class="footer">
    <p>Generated by Invo</p>
  </div>
</body>
</html>
    `;
  }

  async storePDF(
    userId: string,
    invoiceId: string,
    invoiceNumber: string,
    pdfData: ArrayBuffer,
    isPdf: boolean
  ): Promise<string> {
    const extension = isPdf ? 'pdf' : 'html';
    const contentType = isPdf ? 'application/pdf' : 'text/html';
    const key = `${userId}/invoices/${invoiceId}/${invoiceNumber}.${extension}`;
    
    await this.storage.put(key, pdfData, {
      httpMetadata: {
        contentType,
        contentDisposition: `inline; filename="${invoiceNumber}.${extension}"`,
      },
    });

    return key;
  }

  async getPDF(userId: string, invoiceId: string, invoiceNumber: string): Promise<PDFResult | null> {
    const pdfKey = `${userId}/invoices/${invoiceId}/${invoiceNumber}.pdf`;
    let file = await this.storage.get(pdfKey);
    
    if (file) {
      return {
        body: file.body,
        contentType: 'application/pdf',
        filename: `${invoiceNumber}.pdf`,
      };
    }

    const htmlKey = `${userId}/invoices/${invoiceId}/${invoiceNumber}.html`;
    file = await this.storage.get(htmlKey);
    
    if (file) {
      return {
        body: file.body,
        contentType: 'text/html',
        filename: `${invoiceNumber}.html`,
      };
    }

    return null;
  }

  async deletePDF(userId: string, invoiceId: string, invoiceNumber: string): Promise<void> {
    const pdfKey = `${userId}/invoices/${invoiceId}/${invoiceNumber}.pdf`;
    const htmlKey = `${userId}/invoices/${invoiceId}/${invoiceNumber}.html`;
    
    await Promise.all([
      this.storage.delete(pdfKey),
      this.storage.delete(htmlKey),
    ]);
  }

  getDownloadURL(key: string, apiUrl: string, token: string): string {
    return `${apiUrl}/api/invoices/pdf/${encodeURIComponent(key)}?token=${token}`;
  }
}