import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AssessmentStudent {
  id: number;
  student_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  grade_level: number;
  status: string;
}

export interface AssessmentCharge {
  id: number;
  name: string;
  description?: string;
  amount: number;
  charge_type: string;
  is_mandatory: boolean;
}

export interface AssessmentPayment {
  id: number;
  total_amount: number;
  payment_date: string;
  notes: string;
  charge_breakdown?: { [charge_id: number]: number };
}

export interface SavedAssessment {
  id?: number;
  student_id: number;
  assessment_date: string;
  due_date: string;
  total_charges: number;
  total_paid: number;
  current_due: number;
  created_at?: string;
  updated_at?: string;
  student?: AssessmentStudent;
  charges?: AssessmentCharge[];
  payments?: AssessmentPayment[];
}

export interface AssessmentBatch {
  id?: number;
  batch_name: string;
  assessment_date: string;
  due_date: string;
  created_at?: string;
  assessments?: SavedAssessment[];
}

export interface AssessmentBatchResponse {
  success: boolean;
  data: AssessmentBatch;
  message?: string;
}

export interface AssessmentListResponse {
  success: boolean;
  data: AssessmentBatch[];
  message?: string;
}

export interface AssessmentResponse {
  success: boolean;
  data: SavedAssessment;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AssessmentService {
  private apiUrl = `${environment.apiUrl}/assessments`;

  constructor(private http: HttpClient) { }

  // Batch operations
  createAssessmentBatch(batch: {
    batch_name: string;
    assessment_date: string;
    due_date: string;
    assessments: {
      student_id: number;
      current_due: number;
    }[];
  }): Observable<AssessmentBatchResponse> {
    return this.http.post<AssessmentBatchResponse>(`${this.apiUrl}/batch`, batch);
  }

  getAssessmentBatches(): Observable<AssessmentListResponse> {
    return this.http.get<AssessmentListResponse>(`${this.apiUrl}/batches`);
  }

  getAssessmentBatch(batchId: number): Observable<AssessmentBatchResponse> {
    return this.http.get<AssessmentBatchResponse>(`${this.apiUrl}/batch/${batchId}`);
  }

  deleteAssessmentBatch(batchId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/batch/${batchId}`);
  }

  // Individual assessment operations
  getAssessment(assessmentId: number): Observable<AssessmentResponse> {
    return this.http.get<AssessmentResponse>(`${this.apiUrl}/${assessmentId}`);
  }

  updateAssessment(assessmentId: number, updates: {
    current_due?: number;
    due_date?: string;
  }): Observable<AssessmentResponse> {
    return this.http.put<AssessmentResponse>(`${this.apiUrl}/${assessmentId}`, updates);
  }

  deleteAssessment(assessmentId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${assessmentId}`);
  }

  // Clear all assessments (reset functionality)
  clearAllAssessments(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/clear-all`);
  }
}
