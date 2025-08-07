import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Charge {
  id: number;
  name: string;
  description?: string;
  amount: number;
  charge_type: 'tuition' | 'books' | 'uniform' | 'activities' | 'other';
  grade_level?: number;
  is_mandatory: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChargeListResponse {
  success: boolean;
  data: Charge[];
}

export interface ChargeResponse {
  success: boolean;
  data: Charge;
}

export interface StudentChargeSummary {
  student_id: number;
  student_number: string;
  first_name: string;
  last_name: string;
  grade_level: number;
  status: string;
  mandatory_charges: number;
  total_charges: number;
  total_payments: number;
  remaining_balance: number;
}

export interface StudentChargeBreakdown {
  student: any;
  charges: Charge[];
  payments: any[];
  summary: {
    total_charges: number;
    mandatory_charges: number;
    total_payments: number;
    remaining_balance: number;
  };
}

export interface StudentChargeSummaryResponse {
  success: boolean;
  data: StudentChargeSummary[];
}

export interface StudentChargeBreakdownResponse {
  success: boolean;
  data: StudentChargeBreakdown;
}

@Injectable({
  providedIn: 'root'
})
export class ChargeService {
  private apiUrl = 'http://localhost:3000/api/charges';

  constructor(private http: HttpClient) { }

  getCharges(params?: { 
    charge_type?: string; 
    grade_level?: number; 
    is_active?: boolean 
  }): Observable<ChargeListResponse> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        const value = (params as any)[key];
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http.get<ChargeListResponse>(this.apiUrl, { params: httpParams });
  }

  getCharge(id: number): Observable<ChargeResponse> {
    return this.http.get<ChargeResponse>(`${this.apiUrl}/${id}`);
  }

  createCharge(charge: Partial<Charge>): Observable<any> {
    return this.http.post(this.apiUrl, charge);
  }

  updateCharge(id: number, charge: Partial<Charge>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, charge);
  }

  deleteCharge(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getChargesByGrade(gradeLevel: number): Observable<ChargeListResponse> {
    return this.http.get<ChargeListResponse>(`${this.apiUrl}/grade/${gradeLevel}`);
  }

  // Student charges methods
  getStudentChargesSummary(params?: { 
    grade_level?: number; 
    status?: string 
  }): Observable<StudentChargeSummaryResponse> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        const value = (params as any)[key];
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http.get<StudentChargeSummaryResponse>(`${this.apiUrl}/students/summary`, { params: httpParams });
  }

  getStudentChargeBreakdown(studentId: number): Observable<StudentChargeBreakdownResponse> {
    return this.http.get<StudentChargeBreakdownResponse>(`${this.apiUrl}/students/${studentId}/breakdown`);
  }
}
