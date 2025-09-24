import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService, Payment, PaymentItem } from '../../services/payment.service';
import { StudentService, Student } from '../../services/student.service';
import { ChargeService, StudentChargeSummary, StudentChargeBreakdown } from '../../services/charge.service';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss'
})
export class PaymentsComponent implements OnInit {
  
  // Active tab management
  activeTab: 'create' | 'history' = 'create';
  
  // Loading states
  loading = false;
  studentsLoading = false;
  studentChargesLoading = false;
  submitting = false;
  
  // Data
  students: Student[] = [];
  filteredStudents: Student[] = [];
  payments: Payment[] = [];
  studentChargeBreakdown: StudentChargeBreakdown | null = null;
  
  // Form data
  selectedStudent: Student | null = null;
  selectedStudentCharges: StudentChargeSummary | null = null;
  paymentForm = {
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash' as 'cash' | 'card' | 'bank_transfer' | 'check',
    reference_number: '',
    notes: '',
    items: [] as PaymentItem[]
  };
  
  // Payment methods
  paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Credit/Debit Card' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'check', label: 'Check' }
  ];
  
  // Search and filters
  studentSearchTerm = '';
  studentSearchInput = '';
  paymentSearchTerm = '';
  selectedPaymentDateFilter = '';
  selectedPaymentMethodFilter = '';
  
  // Autocomplete properties
  showStudentDropdown = false;
  selectedDropdownIndex = -1;
  
  // Modal states
  showStudentSelector = false;
  showPaymentDetails = false;
  
  // Error handling
  error: string | null = null;

  constructor(
    private paymentService: PaymentService,
    private studentService: StudentService,
    private chargeService: ChargeService
  ) {}

  ngOnInit() {
    this.loadStudents();
    this.loadPayments();
  }

  // Data loading methods
  async loadStudents() {
    this.studentsLoading = true;
    this.error = null;
    
    try {
      const response = await this.studentService.getStudents({}).toPromise();
      if (response?.success) {
        this.students = response.data.filter(student => student.status === 'active');
        this.filteredStudents = [...this.students];
      }
    } catch (error) {
      console.error('Error loading students:', error);
      this.error = 'Failed to load students';
      this.showToast('Failed to load students', 'error');
    } finally {
      this.studentsLoading = false;
    }
  }

  async loadPayments() {
    this.loading = true;
    this.error = null;
    
    try {
      const response = await this.paymentService.getPayments({ limit: 100 }).toPromise();
      if (response?.success) {
        this.payments = response.data;
      }
    } catch (error) {
      console.error('Error loading payments:', error);
      this.error = 'Failed to load payment history';
      this.showToast('Failed to load payment history', 'error');
    } finally {
      this.loading = false;
    }
  }

  async loadStudentChargeBreakdown(studentId: number) {
    this.studentChargesLoading = true;
    this.error = null;
    
    try {
      const response = await this.chargeService.getStudentChargeBreakdown(studentId).toPromise();
      if (response?.success) {
        this.studentChargeBreakdown = response.data;
        this.preparePaymentItems();
      }
    } catch (error) {
      console.error('Error loading student charges:', error);
      this.error = 'Failed to load student charges';
      this.showToast('Failed to load student charges', 'error');
    } finally {
      this.studentChargesLoading = false;
    }
  }

  // Tab management
  switchTab(tab: 'create' | 'history') {
    this.activeTab = tab;
    if (tab === 'history' && this.payments.length === 0) {
      this.loadPayments();
    }
  }

  // Student selection
  onStudentSearch() {
    if (!this.studentSearchTerm.trim()) {
      this.filteredStudents = [...this.students];
      return;
    }
    
    const term = this.studentSearchTerm.toLowerCase();
    this.filteredStudents = this.students.filter(student =>
      student.first_name.toLowerCase().includes(term) ||
      student.last_name.toLowerCase().includes(term) ||
      student.student_number.toLowerCase().includes(term)
    );
  }

  selectStudent(student: Student) {
    this.selectedStudent = student;
    this.showStudentSelector = false;
    this.studentSearchTerm = '';
    this.filteredStudents = [...this.students];
    this.loadStudentChargeBreakdown(student.id);
    this.resetPaymentForm();
  }

  clearSelectedStudent() {
    this.selectedStudent = null;
    this.studentChargeBreakdown = null;
    this.studentSearchInput = '';
    this.showStudentDropdown = false;
    this.resetPaymentForm();
  }

  // Autocomplete methods
  onStudentSearchInput() {
    if (!this.studentSearchInput.trim()) {
      this.filteredStudents = [];
      this.showStudentDropdown = false;
      this.selectedStudent = null;
      this.studentChargeBreakdown = null;
      return;
    }
    
    const term = this.studentSearchInput.toLowerCase();
    this.filteredStudents = this.students.filter(student =>
      student.first_name.toLowerCase().includes(term) ||
      student.last_name.toLowerCase().includes(term) ||
      student.student_number.toLowerCase().includes(term)
    );
    
    this.showStudentDropdown = true;
    this.selectedDropdownIndex = -1;
  }

  onStudentInputFocus() {
    if (this.studentSearchInput.trim() && this.filteredStudents.length > 0) {
      this.showStudentDropdown = true;
    }
  }

  onStudentInputBlur() {
    // Delay hiding to allow for click events on dropdown items
    setTimeout(() => {
      this.showStudentDropdown = false;
    }, 200);
  }

  showAllStudents() {
    this.filteredStudents = [...this.students];
    this.showStudentDropdown = true;
    this.studentSearchInput = '';
  }

  selectStudentFromDropdown(student: Student) {
    this.selectedStudent = student;
    this.studentSearchInput = this.getStudentFullName(student);
    this.showStudentDropdown = false;
    this.loadStudentChargeBreakdown(student.id);
    this.resetPaymentForm();
  }

  // Payment form management
  preparePaymentItems() {
    if (!this.studentChargeBreakdown) return;
    
    this.paymentForm.items = [];
    
    // Add current charges
    this.studentChargeBreakdown.charges.forEach((charge: any) => {
      const unpaidAmount = charge.amount - (charge.total_paid || 0);
      if (unpaidAmount > 0) {
        this.paymentForm.items.push({
          charge_id: charge.id,
          description: charge.name,
          amount: 0, // User will enter amount
          is_manual_charge: false,
          charge_name: charge.name,
          charge_type: charge.charge_type
        });
      }
    });
    
    // Add back payments
    this.studentChargeBreakdown.backPayments.forEach((backPayment: any) => {
      const unpaidAmount = (backPayment.amount_due || 0) - (backPayment.amount_paid || 0);
      if (unpaidAmount > 0) {
        this.paymentForm.items.push({
          description: `Back Payment: ${backPayment.charge_name} (Grade ${backPayment.original_grade_level} → ${backPayment.current_grade_level})`,
          amount: 0, // User will enter amount
          is_manual_charge: true,
          charge_name: backPayment.charge_name
        });
      }
    });
  }

  addManualCharge() {
    this.paymentForm.items.push({
      description: '',
      amount: 0,
      is_manual_charge: true
    });
  }

  removePaymentItem(index: number) {
    this.paymentForm.items.splice(index, 1);
  }

  resetPaymentForm() {
    this.paymentForm = {
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      reference_number: '',
      notes: '',
      items: []
    };
  }

  // Payment processing
  async processPayment() {
    if (!this.selectedStudent || !this.validatePaymentForm()) {
      return;
    }
    
    this.submitting = true;
    this.error = null;
    
    try {
      const payment = {
        student_id: this.selectedStudent.id,
        payment_date: this.paymentForm.payment_date,
        payment_method: this.paymentForm.payment_method,
        reference_number: this.paymentForm.reference_number || undefined,
        notes: this.paymentForm.notes || undefined,
        items: this.paymentForm.items.filter(item => item.amount > 0)
      };
      
      const response = await this.paymentService.createPayment(payment).toPromise();
      
      if (response?.success) {
        this.showToast('Payment processed successfully', 'success');
        this.resetPaymentForm();
        this.clearSelectedStudent();
        this.loadPayments(); // Refresh payment history
      } else {
        throw new Error(response?.message || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      this.error = error.message || 'Failed to process payment';
      this.showToast(this.error || 'Failed to process payment', 'error');
    } finally {
      this.submitting = false;
    }
  }

  validatePaymentForm(): boolean {
    if (!this.selectedStudent) {
      this.showToast('Please select a student', 'warning');
      return false;
    }
    
    if (!this.paymentForm.payment_date) {
      this.showToast('Please select a payment date', 'warning');
      return false;
    }
    
    const validItems = this.paymentForm.items.filter(item => item.amount > 0);
    if (validItems.length === 0) {
      this.showToast('Please add at least one payment item with an amount', 'warning');
      return false;
    }
    
    // Validate descriptions for manual charges
    const invalidItems = validItems.filter(item => 
      item.is_manual_charge && !item.description.trim()
    );
    if (invalidItems.length > 0) {
      this.showToast('Please provide descriptions for all manual charges', 'warning');
      return false;
    }
    
    return true;
  }

  // Payment history filters
  onPaymentSearch() {
    // Implementation for payment search
  }

  applyPaymentFilters() {
    // Implementation for payment filters
  }

  clearPaymentFilters() {
    this.paymentSearchTerm = '';
    this.selectedPaymentDateFilter = '';
    this.selectedPaymentMethodFilter = '';
  }

  // Utility methods
  getTotalPaymentAmount(): number {
    return this.paymentForm.items.reduce((total, item) => total + (item.amount || 0), 0);
  }

  getStudentFullName(student: Student): string {
    return `${student.first_name} ${student.last_name}`;
  }

  formatCurrency(amount: number): string {
    if (amount == null || isNaN(amount)) return '₱0.00';
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  getUnpaidAmount(charge: any): number {
    return (charge.amount || 0) - (charge.total_paid || 0);
  }

  getBackPaymentUnpaidAmount(backPayment: any): number {
    return (backPayment.amount_due || 0) - (backPayment.amount_paid || 0);
  }
  // Toast notifications
  toasts: { message: string; type: 'success' | 'error' | 'warning' | 'info'; id: number; isRemoving?: boolean }[] = [];
  toastIdCounter = 0;

  // Toast Methods
  showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    const toast = {
      message,
      type,
      id: this.toastIdCounter++
    };
    this.toasts.push(toast);
    
    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      this.removeToast(toast.id);
    }, 5000);
  }

  removeToast(id: number) {
    const toast = this.toasts.find(t => t.id === id);
    if (toast) {
      toast.isRemoving = true;
      // Remove after animation completes
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id);
      }, 300);
    }
  }

  printInvoice(payment: Payment) {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) {
      this.showToast('Error: Unable to open print window', 'error');
      return;
    }

    // Generate invoice HTML
    const invoiceHtml = this.generateInvoiceHtml(payment);
    
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
    
    // Print after the content loads
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }

  private generateInvoiceHtml(payment: Payment): string {
    const studentName = `${payment.first_name || ''} ${payment.middle_name ? payment.middle_name + ' ' : ''}${payment.last_name || ''}`.trim();
    const paymentDate = new Date(payment.payment_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Payment Receipt ${payment.invoice_number || payment.id}</title>
        <style>
          @page {
            size: A4;
            margin: 0.5in;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            font-size: 14px;
            line-height: 1.3;
            color: #333;
            margin: 0;
            padding: 15px;
            max-width: 4in;
          }
          
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 8px;
            margin-bottom: 15px;
          }
          
          .school-name {
            font-size: 16px;
            font-weight: bold;
            color: #000;
            margin: 0;
            line-height: 1.2;
          }
          
          .school-address {
            font-size: 12px;
            color: #333;
            margin: 4px 0;
            line-height: 1.2;
          }
          
          .statement-title {
            font-size: 14px;
            font-weight: bold;
            margin: 8px 0 0 0;
            color: #000;
          }
          
          .student-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-size: 12px;
          }
          
          .student-left, .student-right {
            flex: 1;
          }
          
          .info-line {
            margin-bottom: 3px;
            line-height: 1.3;
          }
          
          .info-label {
            font-weight: bold;
            display: inline-block;
            min-width: 70px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 12px;
          }
          
          th, td {
            border: 1px solid #000;
            padding: 6px 8px;
            text-align: left;
          }
          
          th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
          }
          
          .amount-col {
            text-align: right;
            width: 25%;
          }
          
          .total-row {
            font-weight: bold;
            background-color: #f5f5f5;
          }
          
          .footer {
            text-align: center;
            font-size: 10px;
            color: #666;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #000;
          }
          
          .print-only {
            display: block;
          }
          
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">Eager Minds School Of Dalaguete</div>
          <div class="school-address">Poblacion, Dalaguete, Cebu 6022</div>
          <div class="statement-title">PAYMENT RECEIPT</div>
        </div>

        <div class="student-info">
          <div class="student-left">
            <div class="info-line"><span class="info-label">Student:</span> ${studentName}</div>
            <div class="info-line"><span class="info-label">Number:</span> ${payment.student_number || 'N/A'}</div>
            <div class="info-line"><span class="info-label">Invoice #:</span> ${payment.invoice_number || 'N/A'}</div>
          </div>
          <div class="student-right">
            <div class="info-line"><span class="info-label">Date:</span> ${paymentDate}</div>
            <div class="info-line"><span class="info-label">Method:</span> ${payment.payment_method?.toUpperCase() || 'N/A'}</div>
            ${payment.reference_number ? `<div class="info-line"><span class="info-label">Reference:</span> ${payment.reference_number}</div>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="amount-col">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${payment.items && payment.items.length > 0 ? 
              payment.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td class="amount-col">₱${this.formatCurrencyValue(item.amount)}</td>
                </tr>
              `).join('') : 
              `<tr>
                <td>Payment Received</td>
                <td class="amount-col">₱${this.formatCurrencyValue(payment.total_amount)}</td>
              </tr>`
            }
            <tr class="total-row">
              <td><strong>TOTAL AMOUNT PAID</strong></td>
              <td class="amount-col"><strong>₱${this.formatCurrencyValue(payment.total_amount)}</strong></td>
            </tr>
          </tbody>
        </table>

        ${payment.notes ? `
          <div style="margin-bottom: 15px; font-size: 12px;">
            <strong>Notes:</strong> ${payment.notes}
          </div>
        ` : ''}

        <div class="footer">
          <div>Processed by: ${payment.created_by_username || 'System'}</div>
          <div>Generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          <div style="margin-top: 5px; font-style: italic;">Thank you for your payment!</div>
        </div>
      </body>
      </html>
    `;
  }

  private formatCurrencyValue(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
}
