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
        <title>Payment Invoice ${payment.invoice_number || payment.id}</title>
        <style>
          @page {
            size: A5;
            margin: 0.5in;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 0;
          }
          
          .invoice-container {
            max-width: 100%;
            margin: 0 auto;
            padding: 10px;
          }
          
          .header {
            text-align: center;
            border-bottom: 2px solid #2c5aa0;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          
          .school-name {
            font-size: 18px;
            font-weight: bold;
            color: #2c5aa0;
            margin: 0;
          }
          
          .school-address {
            font-size: 10px;
            color: #666;
            margin: 2px 0;
          }
          
          .invoice-title {
            font-size: 16px;
            font-weight: bold;
            margin: 10px 0 5px 0;
            color: #2c5aa0;
          }
          
          .invoice-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-size: 11px;
          }
          
          .student-info {
            background: #f8f9fa;
            padding: 8px;
            border-radius: 4px;
            margin-bottom: 15px;
          }
          
          .student-info h4 {
            margin: 0 0 5px 0;
            font-size: 13px;
            color: #2c5aa0;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          
          .payment-details {
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 15px;
          }
          
          .payment-header {
            background: #2c5aa0;
            color: white;
            padding: 8px;
            font-weight: bold;
            font-size: 12px;
          }
          
          .payment-body {
            padding: 10px;
          }
          
          .payment-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px dotted #ddd;
          }
          
          .payment-row:last-child {
            border-bottom: none;
            font-weight: bold;
            margin-top: 5px;
            padding-top: 8px;
            border-top: 1px solid #2c5aa0;
          }
          
          .amount {
            font-weight: bold;
            color: #28a745;
          }
          
          .footer {
            text-align: center;
            font-size: 10px;
            color: #666;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #eee;
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
        <div class="invoice-container">
          <div class="header">
            <h1 class="school-name">Eager Minds School</h1>
            <div class="school-address">123 Education Street, Knowledge City, Philippines</div>
            <div class="school-address">Phone: (02) 123-4567 | Email: info@eagerminds.edu.ph</div>
            <div class="invoice-title">PAYMENT RECEIPT</div>
          </div>

          <div class="invoice-info">
            <div>
              <strong>Invoice #:</strong> ${payment.invoice_number || 'N/A'}<br>
              <strong>Date:</strong> ${paymentDate}
            </div>
            <div>
              <strong>Payment Method:</strong> ${payment.payment_method?.toUpperCase() || 'N/A'}<br>
              ${payment.reference_number ? `<strong>Reference:</strong> ${payment.reference_number}` : ''}
            </div>
          </div>

          <div class="student-info">
            <h4>Student Information</h4>
            <div class="info-row">
              <span><strong>Name:</strong> ${studentName}</span>
              <span><strong>Student #:</strong> ${payment.student_number || 'N/A'}</span>
            </div>
          </div>

          <div class="payment-details">
            <div class="payment-header">
              Payment Details
            </div>
            <div class="payment-body">
              ${payment.items && payment.items.length > 0 ? 
                payment.items.map(item => `
                  <div class="payment-row">
                    <span>${item.description}</span>
                    <span class="amount">₱${this.formatCurrencyValue(item.amount)}</span>
                  </div>
                `).join('') : 
                `<div class="payment-row">
                  <span>Payment Received</span>
                  <span class="amount">₱${this.formatCurrencyValue(payment.total_amount)}</span>
                </div>`
              }
              <div class="payment-row">
                <span><strong>TOTAL AMOUNT PAID</strong></span>
                <span class="amount"><strong>₱${this.formatCurrencyValue(payment.total_amount)}</strong></span>
              </div>
            </div>
          </div>

          ${payment.notes ? `
            <div style="margin-bottom: 15px;">
              <strong>Notes:</strong> ${payment.notes}
            </div>
          ` : ''}

          <div class="footer">
            <div>Processed by: ${payment.created_by_username || 'System'}</div>
            <div>Generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            <div style="margin-top: 8px; font-style: italic;">Thank you for your payment!</div>
          </div>
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
