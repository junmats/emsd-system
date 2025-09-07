import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Student {
  id: number;
  student_number: string;
  first_name: string;
  last_name: string;
  grade_level: number;
  date_of_birth?: string;
  address?: string;
  parent_name?: string;
  parent_contact?: string;
  parent_email?: string;
  enrollment_date: string;
  status: 'active' | 'inactive' | 'graduated';
  created_at: string;
  updated_at: string;
}

export interface BackPayment {
  id: number;
  student_id: number;
  original_grade_level: number;
  current_grade_level: number;
  charge_id: number;
  charge_name: string;
  amount_due: number;
  amount_paid: number;
  status: 'pending' | 'partial' | 'paid';
  created_at: string;
  updated_at: string;
}

export interface BackPaymentInfo {
  hasBackPayments: boolean;
  unpaidCharges: any[];
  totalAmount: number;
  originalGrade: number;
  newGrade: number;
  student?: {
    id: number;
    first_name: string;
    last_name: string;
    grade_level: number;
  };
}

export interface StudentUpdateResponse {
  success: boolean;
  message: string;
  backPaymentInfo?: BackPaymentInfo;
}

export interface StudentListResponse {
  success: boolean;
  data: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface StudentResponse {
  success: boolean;
  data: Student;
}

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private apiUrl = `${environment.apiUrl}/students`;

  constructor(private http: HttpClient) { }

  getStudents(params?: { grade_level?: number; status?: string; page?: number; limit?: number }): Observable<StudentListResponse> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        const value = (params as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    // If no status is provided, we need to get all students regardless of status
    // The backend defaults to 'active' only, so we need to make multiple calls or modify the approach
    if (!params?.status) {
      // Make separate calls for each status and combine them
      return this.getAllStudentsAllStatuses();
    }

    return this.http.get<StudentListResponse>(this.apiUrl, { params: httpParams });
  }

  private getAllStudentsAllStatuses(): Observable<StudentListResponse> {
    const activeStudents$ = this.http.get<StudentListResponse>(this.apiUrl, { 
      params: new HttpParams().set('status', 'active').set('limit', '1000') 
    });
    const inactiveStudents$ = this.http.get<StudentListResponse>(this.apiUrl, { 
      params: new HttpParams().set('status', 'inactive').set('limit', '1000') 
    });
    const graduatedStudents$ = this.http.get<StudentListResponse>(this.apiUrl, { 
      params: new HttpParams().set('status', 'graduated').set('limit', '1000') 
    });

    return combineLatest([activeStudents$, inactiveStudents$, graduatedStudents$]).pipe(
      map(([active, inactive, graduated]: [StudentListResponse, StudentListResponse, StudentListResponse]) => {
        const allStudents = [
          ...(active.success ? active.data : []),
          ...(inactive.success ? inactive.data : []),
          ...(graduated.success ? graduated.data : [])
        ];
        
        return {
          success: true,
          data: allStudents,
          pagination: {
            page: 1,
            limit: allStudents.length,
            total: allStudents.length,
            pages: 1
          }
        };
      })
    );
  }

  getStudent(id: number): Observable<StudentResponse> {
    return this.http.get<StudentResponse>(`${this.apiUrl}/${id}`);
  }

  createStudent(student: Partial<Student>): Observable<any> {
    return this.http.post(this.apiUrl, student);
  }

  updateStudent(id: number, student: Partial<Student>): Observable<StudentUpdateResponse> {
    return this.http.put<StudentUpdateResponse>(`${this.apiUrl}/${id}`, student);
  }

  getStudentBackPayments(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/back-payments`);
  }

  checkBackPayments(id: number, newGradeLevel: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/check-back-payments`, { new_grade_level: newGradeLevel });
  }

  getBackPayments(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/back-payments`);
  }

  upgradeWithBackPayments(id: number, newGradeLevel: number, status: string, unpaidCharges: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/upgrade-with-back-payments`, {
      new_grade_level: newGradeLevel,
      status: status,
      unpaid_charges: unpaidCharges
    });
  }

  deleteStudent(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  batchUpgradeGrades(fromGrade: number, toGrade: number, studentIds?: number[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/batch-upgrade`, {
      from_grade: fromGrade,
      to_grade: toGrade,
      student_ids: studentIds
    });
  }
}
