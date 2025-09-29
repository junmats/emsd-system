import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { StudentService } from '../../services/student.service';
import { ChargeService } from '../../services/charge.service';
import { PaymentService } from '../../services/payment.service';

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
  students: Student[] = [];
  selectedStudent: Student | null = null;
  assessment: Assessment | null = null;
  currentDue: number = 0;
  assessmentDate: string = '';
  dueDate: string = '';
  isLoading = false;
  searchTerm = '';
  
  // Batch functionality
  currentMode: 'single' | 'batch' = 'single';
  selectedStudents: Student[] = [];
  batchAssessments: Assessment[] = [];
  
  // Filters
  selectedGrade: number | string = '';
  grades = [1, 2, 3, 4, 5, 6];

  constructor(
    private studentService: StudentService,
    private chargeService: ChargeService,
    private paymentService: PaymentService
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

  get calculatedCurrentDue(): number {
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

  public formatCurrency(amount: number): string {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }

  resetAssessment() {
    this.selectedStudent = null;
    this.assessment = null;
    this.currentDue = 0;
  }

  // Batch functionality methods
  switchMode(mode: 'single' | 'batch') {
    this.currentMode = mode;
    if (mode === 'single') {
      this.selectedStudents = [];
      this.batchAssessments = [];
    } else {
      this.selectedStudent = null;
      this.assessment = null;
    }
  }

  toggleStudentSelection(student: Student) {
    const index = this.selectedStudents.findIndex(s => s.id === student.id);
    if (index > -1) {
      this.selectedStudents.splice(index, 1);
    } else if (this.selectedStudents.length < 6) {
      this.selectedStudents.push(student);
    }
  }

  isStudentSelected(student: Student): boolean {
    return this.selectedStudents.some(s => s.id === student.id);
  }

  canSelectMore(): boolean {
    return this.selectedStudents.length < 6;
  }

  isCheckboxDisabled(student: Student): boolean {
    return !this.isStudentSelected(student) && this.selectedStudents.length >= 6;
  }

  clearBatchSelection() {
    this.selectedStudents = [];
    this.batchAssessments = [];
  }

  async generateBatchAssessments() {
    if (this.selectedStudents.length === 0) return;

    this.isLoading = true;
    this.batchAssessments = [];

    try {
      for (const student of this.selectedStudents) {
        const assessment = await this.createAssessmentForStudent(student);
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

  private async createAssessmentForStudent(student: Student): Promise<Assessment | null> {
    try {
      // Get charges for this student's grade level  
      const chargesResponse = await this.chargeService.getChargesByGrade(student.grade_level).toPromise();
      const charges = chargesResponse?.data || [];

      // Get payment history for this student
      const paymentsResponse = await this.paymentService.getPayments({ student_id: student.id }).toPromise();
      const payments = paymentsResponse?.data || [];

      // Calculate totals 
      const totalCharges = charges.reduce((sum: number, charge: any) => sum + charge.amount, 0);
      const totalPaid = payments.reduce((sum: number, payment: any) => sum + payment.total_amount, 0);
      const totalPayable = totalCharges - totalPaid;

      // Map payments to PaymentRecord format
      const mappedPayments: PaymentRecord[] = payments.map(payment => ({
        id: payment.id,
        total_amount: payment.total_amount,
        payment_date: payment.payment_date,
        notes: payment.notes || '',
        items: payment.items?.map(item => ({
          id: item.id || 0,
          payment_id: payment.id,
          charge_id: item.charge_id || null,
          description: item.description,
          amount: item.amount,
          is_manual_charge: item.is_manual_charge ? 1 : 0,
          created_at: payment.created_at,
          charge_name: item.charge_name,
          charge_type: item.charge_type
        })) || []
      }));

      return {
        student,
        charges,
        payments: mappedPayments,
        totalCharges,
        totalPaid,
        totalPayable,
        currentDue: Math.max(0, totalPayable),
        assessmentDate: this.assessmentDate,
        dueDate: this.dueDate
      };
    } catch (error) {
      console.error(`Error creating assessment for student ${student.student_number}:`, error);
      return null;
    }
  }

  updateBatchCurrentDue(index: number, value: number) {
    if (this.batchAssessments[index]) {
      this.batchAssessments[index].currentDue = Math.max(0, value);
    }
  }

  printBatchAssessments() {
    if (this.batchAssessments.length === 0) return;

    const printContent = this.generateBatchPrintHTML();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  }

  private generateBatchPrintHTML(): string {
    const assessmentsPerPage = 6;
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Batch Assessment</title>
        <style>
          @media print {
            body { margin: 0; }
            .page-break { page-break-after: always; }
          }
          
          body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            margin: 10px;
          }
          
          .assessment-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 20px;
          }
          
          .assessment-card {
            border: 2px solid #333;
            padding: 10px;
            background: white;
            min-height: 250px;
          }
          
          .header {
            text-align: center;
            border-bottom: 1px solid #333;
            padding-bottom: 5px;
            margin-bottom: 8px;
          }
          
          .school-name {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 2px;
          }
          
          .document-title {
            font-weight: bold;
            font-size: 11px;
          }
          
          .student-info {
            margin-bottom: 8px;
            font-size: 10px;
          }
          
          .charges-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
            font-size: 9px;
          }
          
          .charges-table th,
          .charges-table td {
            border: 1px solid #333;
            padding: 2px 4px;
            text-align: left;
          }
          
          .charges-table th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          
          .amount {
            text-align: right;
          }
          
          .totals {
            margin: 8px 0;
            font-size: 10px;
          }
          
          .current-due {
            text-align: center;
            border: 2px solid #333;
            padding: 5px;
            margin: 8px 0;
            background-color: #f9f9f9;
          }
          
          .current-due-amount {
            font-size: 14px;
            font-weight: bold;
          }
          
          .dates {
            text-align: center;
            font-size: 8px;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
    `;

    // Process assessments in chunks of 6
    for (let i = 0; i < this.batchAssessments.length; i += assessmentsPerPage) {
      const pageAssessments = this.batchAssessments.slice(i, i + assessmentsPerPage);
      
      html += '<div class="assessment-grid">';
      
      for (const assessment of pageAssessments) {
        html += this.generateSingleAssessmentHTML(assessment);
      }
      
      // Add empty cells to complete the grid if needed
      const remainingCells = assessmentsPerPage - pageAssessments.length;
      for (let j = 0; j < remainingCells; j++) {
        html += '<div class="assessment-card" style="visibility: hidden;"></div>';
      }
      
      html += '</div>';
      
      // Add page break if there are more assessments
      if (i + assessmentsPerPage < this.batchAssessments.length) {
        html += '<div class="page-break"></div>';
      }
    }

    html += `
      </body>
      </html>
    `;

    return html;
  }

  private generateSingleAssessmentHTML(assessment: Assessment): string {
    return `
      <div class="assessment-card">
        <div class="header">
          <div class="school-name">ELEMENTARY SCHOOL</div>
          <div class="document-title">STUDENT ASSESSMENT</div>
        </div>

        <div class="student-info">
          <strong>Student:</strong> ${this.getStudentFullName(assessment.student)}<br>
          <strong>ID:</strong> ${assessment.student.student_number} | 
          <strong>Grade:</strong> ${assessment.student.grade_level}<br>
          <strong>Assessment Date:</strong> ${new Date(assessment.assessmentDate).toLocaleDateString()}<br>
          <strong>Due Date:</strong> ${new Date(assessment.dueDate).toLocaleDateString()}
        </div>

        <table class="charges-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${assessment.charges.map(charge => `
              <tr>
                <td>${charge.name}</td>
                <td class="amount">₱${charge.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div><strong>Total Charges:</strong> ₱${assessment.totalCharges.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <div><strong>Total Paid:</strong> ₱${assessment.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <div><strong>Balance:</strong> ₱${assessment.totalPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>

        <div class="current-due">
          <div style="margin-bottom: 5px; font-weight: bold; font-size: 10px;">CURRENT AMOUNT DUE</div>
          <div class="current-due-amount">₱${assessment.currentDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>

        <div class="dates">
          <div>Generated: ${new Date().toLocaleString()}</div>
        </div>
      </div>
    `;
  }
}
