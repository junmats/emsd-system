import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

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
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http.get<StudentListResponse>(this.apiUrl, { params: httpParams });
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
