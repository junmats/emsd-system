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

  resetAssessment() {
    this.selectedStudent = null;
    this.assessment = null;
    this.currentDue = 0;
  }
}
