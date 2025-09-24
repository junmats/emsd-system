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
  selectedGrade: number | null = null;
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
      
      const matchesGrade = !this.selectedGrade || student.grade_level === this.selectedGrade;
      
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
    const totalCharges = charges.reduce((sum, charge) => sum + charge.amount, 0);
    const totalPaid = payments.reduce((sum, payment) => sum + payment.total_amount, 0);
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
        <title>Monthly Assessment - ${studentName}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
          }
          .school-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .assessment-title {
            font-size: 18px;
            color: #666;
          }
          .student-info {
            margin-bottom: 25px;
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .info-label {
            font-weight: bold;
            width: 150px;
          }
          .charges-section, .payments-section, .summary-section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          th, td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #f8f9fa;
            font-weight: bold;
          }
          .amount {
            text-align: right;
            font-family: monospace;
          }
          .summary-table {
            width: 100%;
            max-width: 400px;
            margin-left: auto;
          }
          .summary-table th,
          .summary-table td {
            padding: 10px 15px;
          }
          .total-row {
            font-weight: bold;
            font-size: 16px;
            border-top: 2px solid #333;
          }
          .current-due {
            background-color: #fff3cd;
            border: 2px solid #ffc107;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
            margin-top: 20px;
          }
          .current-due-amount {
            font-size: 24px;
            font-weight: bold;
            color: #856404;
          }
          .dates {
            margin-top: 30px;
            text-align: right;
            font-size: 12px;
            color: #666;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">East Mindanao School District</div>
          <div class="assessment-title">Monthly Assessment Statement</div>
        </div>

        <div class="student-info">
          <div class="info-row">
            <span class="info-label">Student Name:</span>
            <span>${studentName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Student Number:</span>
            <span>${student.student_number}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Grade Level:</span>
            <span>Grade ${student.grade_level}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Assessment Date:</span>
            <span>${new Date(this.assessment.assessmentDate).toLocaleDateString()}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Due Date:</span>
            <span>${new Date(this.assessment.dueDate).toLocaleDateString()}</span>
          </div>
        </div>

        <div class="charges-section">
          <div class="section-title">Charge Breakdown</div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Type</th>
                <th>Mandatory</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${this.assessment.charges.map(charge => `
                <tr>
                  <td>${charge.name}${charge.description ? ` - ${charge.description}` : ''}</td>
                  <td>${this.formatChargeType(charge.charge_type)}</td>
                  <td>${charge.is_mandatory ? 'Yes' : 'No'}</td>
                  <td class="amount">₱${charge.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="payments-section">
          <div class="section-title">Payment History</div>
          ${this.assessment.payments.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Notes</th>
                  <th class="amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${this.assessment.payments.map(payment => `
                  <tr>
                    <td>${new Date(payment.payment_date).toLocaleDateString()}</td>
                    <td>${payment.notes || '-'}</td>
                    <td class="amount">₱${payment.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
            <p style="text-align: center; color: #666; font-style: italic;">No payments recorded</p>
          `}
        </div>

        <div class="summary-section">
          <div class="section-title">Assessment Summary</div>
          <table class="summary-table">
            <tr>
              <th>Total Charges:</th>
              <td class="amount">₱${this.assessment.totalCharges.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <th>Total Paid:</th>
              <td class="amount">₱${this.assessment.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr class="total-row">
              <th>Total Payable:</th>
              <td class="amount">₱${this.assessment.totalPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </table>
        </div>

        <div class="current-due">
          <div style="margin-bottom: 10px; font-weight: bold;">CURRENT AMOUNT DUE</div>
          <div class="current-due-amount">₱${this.assessment.currentDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>

        <div class="dates">
          <div>Generated on: ${new Date().toLocaleString()}</div>
        </div>
      </body>
      </html>
    `;
  }

  formatChargeType(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  resetAssessment() {
    this.selectedStudent = null;
    this.assessment = null;
    this.currentDue = 0;
  }
}
