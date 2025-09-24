import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Payment } from '../../services/payment.service';

@Component({
  selector: 'app-invoice-print',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="invoice-print-container" *ngIf="payment">
      <!-- Half Page Invoice Layout -->
      <div class="invoice-half-page">
        <!-- Header Section -->
        <div class="invoice-header">
          <div class="school-info">
            <h3 class="school-name">Eager Minds School</h3>
            <p class="school-address">
              567 Learning Lane<br>
              Education City, EC 12345<br>
              Phone: (555) 123-4567
            </p>
          </div>
          <div class="invoice-details">
            <h4 class="invoice-title">PAYMENT INVOICE</h4>
            <p class="invoice-number">Invoice #: <strong>{{ payment.invoice_number || 'N/A' }}</strong></p>
            <p class="invoice-date">Date: <strong>{{ payment.payment_date | date:'mediumDate' }}</strong></p>
          </div>
        </div>

        <!-- Student Information -->
        <div class="student-section">
          <h5>Student Information</h5>
          <div class="student-details">
            <p><strong>Name:</strong> {{ getFullName() }}</p>
            <p><strong>Student Number:</strong> {{ payment.student_number }}</p>
            <p><strong>Payment Date:</strong> {{ payment.payment_date | date:'mediumDate' }}</p>
          </div>
        </div>

        <!-- Payment Details -->
        <div class="payment-section">
          <h5>Payment Details</h5>
          <table class="payment-table">
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-end">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of payment.items">
                <td>{{ item.description }}</td>
                <td class="text-end">{{ formatCurrency(item.amount) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td><strong>Total Amount</strong></td>
                <td class="text-end"><strong>{{ formatCurrency(payment.total_amount) }}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Payment Method & Reference -->
        <div class="payment-info">
          <div class="payment-method">
            <p><strong>Payment Method:</strong> {{ payment.payment_method | titlecase }}</p>
            <p *ngIf="payment.reference_number"><strong>Reference Number:</strong> {{ payment.reference_number }}</p>
          </div>
          <div class="processed-by">
            <p><strong>Processed By:</strong> {{ payment.created_by_username }}</p>
            <p><strong>Processed On:</strong> {{ payment.created_at | date:'medium' }}</p>
          </div>
        </div>

        <!-- Notes -->
        <div class="notes-section" *ngIf="payment.notes">
          <h6>Notes</h6>
          <p class="notes">{{ payment.notes }}</p>
        </div>

        <!-- Footer -->
        <div class="invoice-footer">
          <div class="footer-line"></div>
          <p class="footer-text">Thank you for your payment!</p>
          <p class="footer-small">This is an official payment receipt. Please keep for your records.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .invoice-print-container {
      width: 100%;
      background: white;
    }

    .invoice-half-page {
      width: 8.5in;
      height: 5.5in;
      margin: 0 auto;
      padding: 0.5in;
      font-family: 'Arial', sans-serif;
      font-size: 12pt;
      line-height: 1.3;
      background: white;
      border: 1px solid #ddd;
      box-sizing: border-box;
    }

    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #333;
    }

    .school-name {
      font-size: 18pt;
      font-weight: bold;
      color: #2c3e50;
      margin: 0 0 5px 0;
    }

    .school-address {
      font-size: 10pt;
      color: #666;
      margin: 0;
      line-height: 1.4;
    }

    .invoice-title {
      font-size: 16pt;
      font-weight: bold;
      color: #27ae60;
      margin: 0 0 5px 0;
      text-align: right;
    }

    .invoice-number, .invoice-date {
      font-size: 10pt;
      margin: 2px 0;
      text-align: right;
    }

    .student-section {
      margin-bottom: 15px;
    }

    .student-section h5 {
      font-size: 12pt;
      font-weight: bold;
      color: #2c3e50;
      margin: 0 0 8px 0;
      border-bottom: 1px solid #bdc3c7;
      padding-bottom: 3px;
    }

    .student-details p {
      font-size: 10pt;
      margin: 3px 0;
    }

    .payment-section {
      margin-bottom: 15px;
    }

    .payment-section h5 {
      font-size: 12pt;
      font-weight: bold;
      color: #2c3e50;
      margin: 0 0 8px 0;
      border-bottom: 1px solid #bdc3c7;
      padding-bottom: 3px;
    }

    .payment-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
    }

    .payment-table th,
    .payment-table td {
      padding: 6px 8px;
      border: 1px solid #ddd;
      text-align: left;
    }

    .payment-table th {
      background-color: #f8f9fa;
      font-weight: bold;
      color: #2c3e50;
    }

    .payment-table .text-end {
      text-align: right;
    }

    .total-row {
      background-color: #e8f5e8;
      font-weight: bold;
    }

    .payment-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      font-size: 10pt;
    }

    .payment-info p {
      margin: 3px 0;
    }

    .notes-section {
      margin-bottom: 15px;
    }

    .notes-section h6 {
      font-size: 11pt;
      font-weight: bold;
      margin: 0 0 5px 0;
      color: #2c3e50;
    }

    .notes {
      font-size: 10pt;
      font-style: italic;
      color: #666;
      margin: 0;
    }

    .invoice-footer {
      text-align: center;
      margin-top: auto;
      padding-top: 10px;
    }

    .footer-line {
      height: 2px;
      background-color: #27ae60;
      margin-bottom: 8px;
    }

    .footer-text {
      font-size: 12pt;
      font-weight: bold;
      color: #27ae60;
      margin: 5px 0;
    }

    .footer-small {
      font-size: 9pt;
      color: #666;
      margin: 0;
    }

    /* Print Styles */
    @media print {
      .invoice-print-container {
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .invoice-half-page {
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
        padding: 0.5in !important;
        border: none !important;
        box-shadow: none !important;
        page-break-inside: avoid;
      }

      body * {
        visibility: hidden;
      }

      .invoice-print-container,
      .invoice-print-container * {
        visibility: visible;
      }

      .invoice-print-container {
        position: absolute;
        left: 0;
        top: 0;
      }
    }
  `]
})
export class InvoicePrintComponent {
  @Input() payment!: Payment;

  getFullName(): string {
    if (!this.payment) return '';
    
    const parts = [
      this.payment.first_name,
      this.payment.middle_name,
      this.payment.last_name
    ].filter(part => part && part.trim());
    
    return parts.join(' ');
  }

  formatCurrency(amount: number | string): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(numAmount);
  }
}
