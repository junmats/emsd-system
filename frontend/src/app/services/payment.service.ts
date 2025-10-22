import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PaymentItem {
  id?: number;
  charge_id?: number;
  description: string;
  amount: number;
  is_manual_charge: boolean;
  charge_name?: string;
  charge_type?: string;
}

export interface Payment {
  id: number;
  student_id: number;
  payment_date: string;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'check';
  reference_number?: string;
  notes?: string;
  created_by: number;
  created_at: string;
  invoice_number?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  student_number?: string;
  created_by_username?: string;
  reverted?: boolean;
  reverted_date?: string;
  reverted_reason?: string;
  items?: PaymentItem[];
}

export interface PaymentListResponse {
  success: boolean;
  data: Payment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PaymentResponse {
  success: boolean;
  data: Payment;
}

export interface StudentPaymentHistoryResponse {
  success: boolean;
  data: {
    student: any;
    payments: Payment[];
    summary: {
      total_payments: number;
      total_amount_paid: number;
    };
    pagination: {
      page: number;
      limit: number;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient) { }

  getPayments(params?: { 
    student_id?: number; 
    start_date?: string; 
    end_date?: string;
    payment_method?: string;
    page?: number; 
    limit?: number 
  }): Observable<PaymentListResponse> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        const value = (params as any)[key];
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http.get<PaymentListResponse>(this.apiUrl, { params: httpParams });
  }

  getPayment(id: number): Observable<PaymentResponse> {
    return this.http.get<PaymentResponse>(`${this.apiUrl}/${id}`);
  }

  createPayment(payment: {
    student_id: number;
    payment_date: string;
    payment_method: string;
    reference_number?: string;
    notes?: string;
    items: PaymentItem[];
  }): Observable<any> {
    return this.http.post(this.apiUrl, payment);
  }

  getStudentPaymentHistory(studentId: number, page: number = 1, limit: number = 20): Observable<StudentPaymentHistoryResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    return this.http.get<StudentPaymentHistoryResponse>(`${this.apiUrl}/student/${studentId}`, { params });
  }

  deletePayment(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  revertPayment(id: number, reason?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/revert`, { reason });
  }
}