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
}
