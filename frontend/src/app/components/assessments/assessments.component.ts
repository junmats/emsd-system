import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { StudentService } from '../../services/student.service';
import { ChargeService } from '../../services/charge.service';
import { PaymentService } from '../../services/payment.service';
import { AssessmentService, SavedAssessment, AssessmentBatch } from '../../services/assessment.service';

interface Student {
  id: number;
  student_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  grade_level: number;
  status: string;
}

interface ChargeBreakdown {
  id: number;
  name: string;
  description?: string;
  amount: number;
  charge_type: string;
  is_mandatory: boolean;
}

interface PaymentRecord {
  id: number;
  total_amount: number;
  payment_date: string;
  notes: string;
  items?: PaymentItem[];
}

interface PaymentItem {
  id: number;
  payment_id: number;
  charge_id: number | null;
  description: string;
  amount: number | string;
  is_manual_charge: number;
  created_at: string;
  charge_name?: string;
  charge_type?: string;
}

interface Assessment {
  student: Student;
  charges: ChargeBreakdown[];
  payments: PaymentRecord[];
  totalCharges: number;
  totalPaid: number;
  totalPayable: number;
  currentDue: number;
  assessmentDate: string;
  dueDate: string;
}

@Component({
  selector: 'app-assessments',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModule],
  templateUrl: './assessments.component.html',
  styleUrls: ['./assessments.component.scss']
})
export class AssessmentsComponent implements OnInit {
  // Current mode: 'single' or 'batch'
  currentMode: 'single' | 'batch' | 'saved' = 'batch';
  
  // Single assessment mode
  students: Student[] = [];
  selectedStudent: Student | null = null;
  assessment: Assessment | null = null;
  currentDue: number = 0;
  assessmentDate: string = '';
  dueDate: string = '';
  isLoading = false;
  searchTerm = '';
  
  // Batch assessment mode
  selectedStudents: Student[] = [];
  batchAssessments: Assessment[] = [];
  batchName: string = '';
  showBatchSelector = false;
  
  // Saved assessments mode
  savedBatches: AssessmentBatch[] = [];
  selectedBatch: AssessmentBatch | null = null;
  
  // Filters
  selectedGrade: number | string = '';
  grades = [1, 2, 3, 4, 5, 6];

  constructor(
    private studentService: StudentService,
    private chargeService: ChargeService,
    private paymentService: PaymentService,
    private assessmentService: AssessmentService
  ) {
    // Set default dates
    const today = new Date();
    this.assessmentDate = today.toISOString().split('T')[0];
    
    // Set due date to end of next month
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    this.dueDate = nextMonth.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.loadStudents();
  }

  loadStudents() {
    this.isLoading = true;
    this.studentService.getStudents({ limit: 200 }).subscribe({
      next: (response) => {
        this.students = response.data.sort((a: Student, b: Student) => {
          return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
        });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading students:', error);
        this.isLoading = false;
      }
    });
  }

  get filteredStudents(): Student[] {
    return this.students.filter(student => {
      const matchesSearch = !this.searchTerm || 
        `${student.first_name} ${student.middle_name || ''} ${student.last_name}`
          .toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        student.student_number.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesGrade = !this.selectedGrade || this.selectedGrade === '' || student.grade_level === Number(this.selectedGrade);
      
      return matchesSearch && matchesGrade;
    });
  }

  selectStudent(student: Student) {
    this.selectedStudent = student;
    this.loadStudentAssessment(student);
  }

  loadStudentAssessment(student: Student) {
    this.isLoading = true;
    
    // Load student's charge breakdown
    this.chargeService.getStudentChargeBreakdown(student.id).subscribe({
      next: (chargeResponse) => {
        // Load student's payment history
        this.paymentService.getStudentPaymentHistory(student.id, 1, 100).subscribe({
          next: (paymentResponse: any) => {
            this.createAssessment(student, chargeResponse.data.charges, paymentResponse.data.payments);
            this.isLoading = false;
          },
          error: (error: any) => {
            console.error('Error loading payments:', error);
            this.createAssessment(student, chargeResponse.data.charges, []);
            this.isLoading = false;
          }
        });
      },
      error: (error: any) => {
        console.error('Error loading charges:', error);
        this.isLoading = false;
      }
    });
  }

  createAssessment(student: Student, charges: ChargeBreakdown[], payments: PaymentRecord[]) {
    const totalCharges = charges.reduce((sum, charge) => sum + parseFloat(charge.amount.toString()), 0);
    const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.total_amount.toString()), 0);
    const totalPayable = totalCharges - totalPaid;

    // Set currentDue to calculated value (can be overridden by user input)
    this.currentDue = totalPayable;

    this.assessment = {
      student,
      charges,
      payments,
      totalCharges,
      totalPaid,
      totalPayable,
      currentDue: this.currentDue,
      assessmentDate: this.assessmentDate,
      dueDate: this.dueDate
    };
  }

  updateCurrentDue() {
    if (this.assessment) {
      this.assessment.currentDue = this.currentDue;
    }
  }

  resetToCalculatedAmount() {
    if (this.assessment) {
      this.currentDue = this.calculatedCurrentDue;
      this.updateCurrentDue();
    }
  }

  updateAssessmentDate() {
    if (this.assessment) {
      this.assessment.assessmentDate = this.assessmentDate;
    }
  }

  updateDueDate() {
    if (this.assessment) {
      this.assessment.dueDate = this.dueDate;
    }
  }

  getStudentFullName(student: Student): string {
    const middle = student.middle_name ? ` ${student.middle_name}` : '';
    return `${student.first_name}${middle} ${student.last_name}`;
  }

  getPaymentAmountForCharge(chargeId: number): number {
    if (!this.assessment?.payments) return 0;
    
    let totalPaidForCharge = 0;
    
    // Go through all payments and their items
    this.assessment.payments.forEach(payment => {
      if (payment.items) {
        payment.items.forEach((item: any) => {
          if (item.charge_id === chargeId) {
            totalPaidForCharge += parseFloat(item.amount.toString());
          }
        });
      }
    });

    return totalPaidForCharge;
  }

  getPaymentAmountForChargeInAssessment(assessment: Assessment, chargeId: number): number {
    if (!assessment?.payments) return 0;
    
    let totalPaidForCharge = 0;
    
    // Go through all payments and their items
    assessment.payments.forEach(payment => {
      if (payment.items) {
        payment.items.forEach((item: any) => {
          if (item.charge_id === chargeId) {
            totalPaidForCharge += parseFloat(item.amount.toString());
          }
        });
      }
    });

    return totalPaidForCharge;
  }  get calculatedCurrentDue(): number {
    if (!this.assessment) return 0;
    return this.assessment.totalPayable;
  }

  printAssessment() {
    if (!this.assessment) return;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const printContent = this.generatePrintHTML();
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }

  private generatePrintHTML(): string {
    if (!this.assessment) return '';

    const student = this.assessment.student;
    const studentName = this.getStudentFullName(student);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Statement of Account - ${studentName}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 15px;
            line-height: 1.3;
            font-size: 11px;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 1px solid #333;
            padding-bottom: 10px;
          }
          .school-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 2px;
          }
          .school-address {
            font-size: 10px;
            color: #666;
            margin-bottom: 5px;
          }
          .statement-title {
            font-size: 14px;
            font-weight: bold;
            color: #333;
          }
          .student-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-size: 10px;
          }
          .student-left, .student-right {
            flex: 1;
          }
          .info-line {
            margin-bottom: 3px;
          }
          .info-label {
            font-weight: bold;
            display: inline-block;
            width: 80px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 10px;
          }
          th, td {
            padding: 4px 6px;
            text-align: left;
            border: 1px solid #ddd;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
            font-size: 9px;
          }
          .amount {
            text-align: right;
            font-family: monospace;
            white-space: nowrap;
          }
          .total-row {
            font-weight: bold;
            background-color: #f8f9fa;
          }
          .current-due {
            background-color: #fff3cd;
            border: 2px solid #ffc107;
            padding: 8px;
            text-align: center;
            margin-top: 10px;
          }
          .current-due-amount {
            font-size: 18px;
            font-weight: bold;
            color: #856404;
          }
          .dates {
            margin-top: 15px;
            text-align: right;
            font-size: 9px;
            color: #666;
          }
          @media print {
            body { margin: 5px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">Eager Minds School Of Dalaguete</div>
          <div class="school-address">Poblacion, Dalaguete, Cebu 6022</div>
          <div class="statement-title">Statement of Account</div>
        </div>

        <div class="student-info">
          <div class="student-left">
            <div class="info-line"><span class="info-label">Student:</span> ${studentName}</div>
            <div class="info-line"><span class="info-label">Number:</span> ${student.student_number}</div>
            <div class="info-line"><span class="info-label">Grade:</span> ${student.grade_level}</div>
          </div>
          <div class="student-right">
            <div class="info-line"><span class="info-label">Date:</span> ${new Date(this.assessment.assessmentDate).toLocaleDateString()}</div>
            <div class="info-line"><span class="info-label">Due Date:</span> ${new Date(this.assessment.dueDate).toLocaleDateString()}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40%">Charge Description</th>
              <th style="width: 15%" class="amount">Amount</th>
              <th style="width: 15%" class="amount">Payments</th>
              <th style="width: 15%" class="amount">Balance</th>
              <th style="width: 15%" class="amount">Amount Due</th>
            </tr>
          </thead>
          <tbody>
            ${this.assessment.charges.map(charge => {
              const chargeAmount = parseFloat(charge.amount.toString());
              const chargePayments = this.assessment!.payments
                .filter(p => p.notes && p.notes.toLowerCase().includes(charge.name.toLowerCase()))
                .reduce((sum, p) => sum + parseFloat(p.total_amount.toString()), 0);
              const balance = chargeAmount - chargePayments;
              const amountDue = balance > 0 ? balance : 0;
              
              return `
                <tr>
                  <td>${charge.name} ${charge.is_mandatory ? '(Required)' : '(Optional)'}</td>
                  <td class="amount">₱${chargeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td class="amount">₱${chargePayments.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td class="amount">₱${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td class="amount">₱${amountDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td><strong>TOTALS:</strong></td>
              <td class="amount"><strong>₱${this.assessment.totalCharges.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
              <td class="amount"><strong>₱${this.assessment.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
              <td class="amount"><strong>₱${this.assessment.totalPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
              <td class="amount"><strong>₱${this.assessment.totalPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="current-due">
          <div style="margin-bottom: 5px; font-weight: bold; font-size: 12px;">CURRENT AMOUNT DUE</div>
          <div class="current-due-amount">₱${this.assessment.currentDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>

        <div class="dates">
          <div>Generated: ${new Date().toLocaleString()}</div>
        </div>
      </body>
      </html>
    `;
  }

  public formatChargeType(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  resetAssessment() {
    this.selectedStudent = null;
    this.assessment = null;
    this.currentDue = 0;
  }

  // Mode switching
  switchMode(mode: 'single' | 'batch' | 'saved') {
    this.currentMode = mode;
    if (mode === 'saved') {
      this.loadSavedBatches();
    }
  }

  // Batch assessment methods
  toggleStudentSelection(student: Student) {
    const index = this.selectedStudents.findIndex(s => s.id === student.id);
    if (index > -1) {
      this.selectedStudents.splice(index, 1);
      this.batchAssessments = this.batchAssessments.filter(a => a.student.id !== student.id);
    } else {
      if (this.selectedStudents.length < 6) {
        this.selectedStudents.push(student);
      }
    }
  }

  isStudentSelected(student: Student): boolean {
    return this.selectedStudents.some(s => s.id === student.id);
  }

  async generateBatchAssessments() {
    if (this.selectedStudents.length === 0) return;

    this.isLoading = true;
    this.batchAssessments = [];

    try {
      for (const student of this.selectedStudents) {
        const assessment = await this.generateSingleAssessment(student);
        if (assessment) {
          this.batchAssessments.push(assessment);
        }
      }
    } catch (error) {
      console.error('Error generating batch assessments:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private async generateSingleAssessment(student: Student): Promise<Assessment | null> {
    try {
      // Load charges
      const chargesResponse = await this.chargeService.getStudentChargeBreakdown(student.id).toPromise();
      if (!chargesResponse?.success) return null;

      // Load payments
      const paymentsResponse = await this.paymentService.getStudentPaymentHistory(student.id).toPromise();
      const payments = paymentsResponse?.success ? paymentsResponse.data.payments || [] : [];

      const charges = chargesResponse.data.charges;
      const totalCharges = charges.reduce((sum: number, charge: ChargeBreakdown) => sum + parseFloat(charge.amount.toString()), 0);
      const totalPaid = payments.reduce((sum: number, payment: any) => sum + parseFloat(payment.total_amount.toString()), 0);

      // Convert payments to PaymentRecord format
      const convertedPayments: PaymentRecord[] = payments.map((payment: any) => ({
        id: payment.id,
        total_amount: payment.total_amount,
        payment_date: payment.payment_date,
        notes: payment.notes || '',
        items: payment.items || []
      }));

      return {
        student,
        charges,
        payments: convertedPayments,
        totalCharges,
        totalPaid,
        totalPayable: totalCharges - totalPaid,
        currentDue: totalCharges - totalPaid,
        assessmentDate: this.assessmentDate,
        dueDate: this.dueDate
      };
    } catch (error) {
      console.error(`Error generating assessment for student ${student.id}:`, error);
      return null;
    }
  }

  updateBatchCurrentDue(assessmentIndex: number, newAmount: number) {
    if (this.batchAssessments[assessmentIndex]) {
      this.batchAssessments[assessmentIndex].currentDue = newAmount;
    }
  }

  // Save batch to database
  async saveBatchAssessments() {
    if (this.batchAssessments.length === 0 || !this.batchName.trim()) return;

    try {
      const batchData = {
        batch_name: this.batchName.trim(),
        assessment_date: this.assessmentDate,
        due_date: this.dueDate,
        assessments: this.batchAssessments.map(assessment => ({
          student_id: assessment.student.id,
          current_due: assessment.currentDue
        }))
      };

      const response = await this.assessmentService.createAssessmentBatch(batchData).toPromise();
      if (response?.success) {
        alert('Batch assessments saved successfully!');
        this.clearBatchSelection();
      } else {
        alert('Failed to save batch assessments');
      }
    } catch (error) {
      console.error('Error saving batch assessments:', error);
      alert('Error saving batch assessments');
    }
  }

  // Print batch assessments (6 per page)
  printBatchAssessments() {
    if (this.batchAssessments.length === 0) return;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const html = this.generateBatchPrintHTML();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  private generateBatchPrintHTML(): string {
    const assessmentsPerPage = 6;
    const pages: Assessment[][] = [];
    
    // Group assessments into pages of 6
    for (let i = 0; i < this.batchAssessments.length; i += assessmentsPerPage) {
      pages.push(this.batchAssessments.slice(i, i + assessmentsPerPage));
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Batch Assessment - ${this.batchName || 'Untitled'}</title>
        <style>
          @page {
            margin: 0.5in;
            size: A4;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 10px;
            margin: 0;
            padding: 0;
          }
          .page {
            page-break-after: always;
            min-height: 100vh;
          }
          .page:last-child {
            page-break-after: avoid;
          }
          .assessment-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            height: 100%;
          }
          .assessment-item {
            border: 1px solid #ddd;
            padding: 10px;
            background: white;
            page-break-inside: avoid;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .school-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 2px;
          }
          .assessment-title {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 4px;
          }
          .student-info {
            margin-bottom: 8px;
          }
          .student-name {
            font-size: 11px;
            font-weight: bold;
          }
          .student-details {
            font-size: 9px;
            color: #666;
          }
          .charges-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
          }
          .charges-table th,
          .charges-table td {
            border: 1px solid #ddd;
            padding: 3px;
            text-align: left;
            font-size: 8px;
          }
          .charges-table th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .amount {
            text-align: right !important;
          }
          .total-row {
            font-weight: bold;
            background-color: #f9f9f9;
          }
          .current-due {
            text-align: center;
            margin: 8px 0;
            padding: 5px;
            background-color: #e7f3ff;
            border: 1px solid #b3d9ff;
          }
          .current-due-amount {
            font-size: 14px;
            font-weight: bold;
            color: #0066cc;
          }
          .dates {
            font-size: 8px;
            text-align: center;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        ${pages.map((pageAssessments, pageIndex) => `
          <div class="page">
            <div class="assessment-grid">
              ${pageAssessments.map(assessment => `
                <div class="assessment-item">
                  <div class="header">
                    <div class="school-name">EMSD School</div>
                    <div class="assessment-title">MONTHLY ASSESSMENT</div>
                  </div>
                  
                  <div class="student-info">
                    <div class="student-name">${assessment.student.first_name} ${assessment.student.middle_name || ''} ${assessment.student.last_name}</div>
                    <div class="student-details">
                      ${assessment.student.student_number} | Grade ${assessment.student.grade_level}
                    </div>
                  </div>

                  <table class="charges-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th class="amount">Amount</th>
                        <th class="amount">Paid</th>
                        <th class="amount">Balance</th>
                        <th class="amount">Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${assessment.charges.map(charge => {
                        const chargeAmount = parseFloat(charge.amount.toString());
                        const chargePayments = this.getPaymentAmountForChargeInAssessment(assessment, charge.id);
                        const balance = chargeAmount - chargePayments;
                        const amountDue = balance > 0 ? balance : 0;
                        
                        return `
                          <tr>
                            <td>${charge.name} ${charge.is_mandatory ? '(Req)' : '(Opt)'}</td>
                            <td class="amount">₱${chargeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td class="amount">₱${chargePayments.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td class="amount">₱${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td class="amount">₱${amountDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        `;
                      }).join('')}
                      <tr class="total-row">
                        <td><strong>TOTALS:</strong></td>
                        <td class="amount"><strong>₱${assessment.totalCharges.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
                        <td class="amount"><strong>₱${assessment.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
                        <td class="amount"><strong>₱${assessment.totalPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
                        <td class="amount"><strong>₱${assessment.totalPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
                      </tr>
                    </tbody>
                  </table>

                  <div class="current-due">
                    <div style="margin-bottom: 3px; font-weight: bold; font-size: 10px;">CURRENT AMOUNT DUE</div>
                    <div class="current-due-amount">₱${assessment.currentDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                  </div>

                  <div class="dates">
                    <div>Generated: ${new Date().toLocaleString()}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </body>
      </html>
    `;
  }

  // Saved assessments methods
  async loadSavedBatches() {
    try {
      const response = await this.assessmentService.getAssessmentBatches().toPromise();
      if (response?.success) {
        this.savedBatches = response.data;
      }
    } catch (error) {
      console.error('Error loading saved batches:', error);
    }
  }

  async loadSavedBatch(batch: AssessmentBatch) {
    try {
      const response = await this.assessmentService.getAssessmentBatch(batch.id!).toPromise();
      if (response?.success) {
        this.selectedBatch = response.data;
        // Convert saved assessments to Assessment objects for printing
        this.batchAssessments = [];
        for (const savedAssessment of this.selectedBatch.assessments || []) {
          const assessment = await this.generateSingleAssessment(savedAssessment.student!);
          if (assessment) {
            assessment.currentDue = savedAssessment.current_due;
            this.batchAssessments.push(assessment);
          }
        }
      }
    } catch (error) {
      console.error('Error loading saved batch:', error);
    }
  }

  async deleteSavedBatch(batch: AssessmentBatch) {
    if (!confirm(`Are you sure you want to delete batch "${batch.batch_name}"?`)) return;

    try {
      await this.assessmentService.deleteAssessmentBatch(batch.id!).toPromise();
      this.loadSavedBatches();
      if (this.selectedBatch?.id === batch.id) {
        this.selectedBatch = null;
        this.batchAssessments = [];
      }
    } catch (error) {
      console.error('Error deleting batch:', error);
      alert('Error deleting batch');
    }
  }

  async clearAllAssessments() {
    if (!confirm('Are you sure you want to clear ALL saved assessments? This action cannot be undone.')) return;

    try {
      await this.assessmentService.clearAllAssessments().toPromise();
      this.loadSavedBatches();
      this.selectedBatch = null;
      this.batchAssessments = [];
      alert('All assessments cleared successfully');
    } catch (error) {
      console.error('Error clearing assessments:', error);
      alert('Error clearing assessments');
    }
  }

  clearBatchSelection() {
    this.selectedStudents = [];
    this.batchAssessments = [];
    this.batchName = '';
  }

  onSelectAllStudents(event: any) {
    if (event.target.checked) {
      this.selectAllStudents();
    } else {
      this.clearBatchSelection();
    }
  }

  selectAllStudents() {
    const availableStudents = this.filteredStudents.slice(0, 6);
    this.selectedStudents = [...availableStudents];
  }
}
