import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AssessmentFlag {
  student_id: number;
  assessment_date: string;
  flagged_at: string;
  student_number?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  grade_level?: number;
}

export interface AssessmentFlagsResponse {
  success: boolean;
  data: AssessmentFlag[];
  message?: string;
}

export interface AssessmentFlagResponse {
  success: boolean;
  data: {
    student_count: number;
    assessment_date: string;
  };
  message?: string;
}

export interface ClearFlagsResponse {
  success: boolean;
  data: {
    deleted_count: number;
  };
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AssessmentFlagsService {
  private apiUrl = `${environment.apiUrl}/assessment-flags`;

  constructor(private http: HttpClient) { }

  // Get assessment flags for a specific date
  getAssessmentFlags(assessmentDate: string): Observable<AssessmentFlagsResponse> {
    return this.http.get<AssessmentFlagsResponse>(`${this.apiUrl}/flags/${assessmentDate}`);
  }

  // Set assessment flags for multiple students
  setAssessmentFlags(studentIds: number[], assessmentDate: string): Observable<AssessmentFlagResponse> {
    return this.http.post<AssessmentFlagResponse>(`${this.apiUrl}/flags`, {
      student_ids: studentIds,
      assessment_date: assessmentDate
    });
  }

  // Clear assessment flags for a specific date
  clearAssessmentFlags(assessmentDate: string): Observable<ClearFlagsResponse> {
    return this.http.delete<ClearFlagsResponse>(`${this.apiUrl}/flags/${assessmentDate}`);
  }

  // Clear all assessment flags (for new assessment period)
  clearAllAssessmentFlags(): Observable<ClearFlagsResponse> {
    return this.http.delete<ClearFlagsResponse>(`${this.apiUrl}/flags`);
  }
}
