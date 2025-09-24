import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StudentService } from '../../services/student.service';
import { PaymentService } from '../../services/payment.service';
import { ChargeService } from '../../services/charge.service';

interface DashboardStats {
  totalStudents: number;
  totalPayments: number;
  outstandingBalance: number;
  activeCharges: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats = {
    totalStudents: 0,
    totalPayments: 0,
    outstandingBalance: 0,
    activeCharges: 0
  };

  recentStudents: any[] = [];
  recentPayments: any[] = [];

  constructor(
    private studentService: StudentService,
    private paymentService: PaymentService,
    private chargeService: ChargeService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loadStats();
    this.loadRecentStudents();
    this.loadRecentPayments();
  }

  loadStats() {
    // Load total students
    this.studentService.getStudents().subscribe({
      next: (response) => {
        this.stats.totalStudents = response.data.length;
      },
      error: (error) => console.error('Error loading students:', error)
    });

    // Load total payments
    this.paymentService.getPayments().subscribe({
      next: (response) => {
        this.stats.totalPayments = response.data.reduce((total: number, payment: any) => {
          return total + parseFloat(payment.total_amount || 0);
        }, 0);
      },
      error: (error) => console.error('Error loading payments:', error)
    });

    // Load outstanding balance (simplified calculation for now)
    this.chargeService.getStudentChargesSummary().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.stats.outstandingBalance = response.data.reduce((total: number, student: any) => {
            return total + parseFloat(student.remaining_balance || 0);
          }, 0);
        }
      },
      error: (error: any) => {
        console.error('Error loading outstanding balance:', error);
        this.stats.outstandingBalance = 0;
      }
    });

    // Load active charges
    this.chargeService.getCharges().subscribe({
      next: (response) => {
        this.stats.activeCharges = response.data.filter((charge: any) => charge.is_active).length;
      },
      error: (error) => console.error('Error loading charges:', error)
    });
  }

  loadRecentStudents() {
    this.studentService.getStudents().subscribe({
      next: (response) => {
        // Get the 5 most recent students
        this.recentStudents = response.data
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5);
      },
      error: (error) => console.error('Error loading recent students:', error)
    });
  }

  loadRecentPayments() {
    this.paymentService.getPayments().subscribe({
      next: (response) => {
        // Get the 5 most recent payments with proper student names
        this.recentPayments = response.data
          .sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
          .slice(0, 5)
          .map((payment: any) => ({
            ...payment,
            student_name: payment.first_name && payment.last_name 
              ? `${payment.first_name}${payment.middle_name ? ' ' + payment.middle_name : ''} ${payment.last_name}`
              : 'Unknown Student',
            amount: parseFloat(payment.total_amount || 0),
            status: 'completed' // All recorded payments are completed
          }));
      },
      error: (error) => console.error('Error loading recent payments:', error)
    });
  }

  refreshData() {
    this.loadDashboardData();
  }
}
