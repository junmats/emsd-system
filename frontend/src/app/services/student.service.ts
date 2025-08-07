import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

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
  private apiUrl = 'http://localhost:3000/api/students';

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

  updateStudent(id: number, student: Partial<Student>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, student);
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
