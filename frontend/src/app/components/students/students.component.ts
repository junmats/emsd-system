import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService, Student } from '../../services/student.service';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './students.component.html',
  styleUrl: './students.component.scss'
})
export class StudentsComponent implements OnInit {
  activeTab: 'all' | 'grade' = 'all';
  students: Student[] = [];
  filteredStudents: Student[] = [];
  selectedGradeLevel: number | null = null;
  gradeLevels = [1, 2, 3, 4, 5, 6];
  loading = false;
  error: string | null = null;

  constructor(private studentService: StudentService) {}

  ngOnInit() {
    this.loadStudents();
  }

  loadStudents() {
    this.loading = true;
    this.error = null;
    
    this.studentService.getStudents().subscribe({
      next: (response) => {
        if (response.success) {
          this.students = response.data;
          this.updateFilteredStudents();
        } else {
          this.error = 'Failed to load students';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load students';
        this.loading = false;
        console.error('Error loading students:', err);
      }
    });
  }

  setActiveTab(tab: 'all' | 'grade') {
    this.activeTab = tab;
    if (tab === 'all') {
      this.selectedGradeLevel = null;
    }
    this.updateFilteredStudents();
  }

  onGradeLevelChange() {
    this.updateFilteredStudents();
  }

  updateFilteredStudents() {
    if (this.activeTab === 'all') {
      // Show all students sorted alphabetically by last name, then first name
      this.filteredStudents = [...this.students].sort((a, b) => {
        const lastNameCompare = a.last_name.localeCompare(b.last_name);
        if (lastNameCompare === 0) {
          return a.first_name.localeCompare(b.first_name);
        }
        return lastNameCompare;
      });
    } else if (this.activeTab === 'grade' && this.selectedGradeLevel) {
      // Filter by grade level and sort alphabetically
      this.filteredStudents = this.students
        .filter(student => student.grade_level === this.selectedGradeLevel)
        .sort((a, b) => {
          const lastNameCompare = a.last_name.localeCompare(b.last_name);
          if (lastNameCompare === 0) {
            return a.first_name.localeCompare(b.first_name);
          }
          return lastNameCompare;
        });
    } else {
      this.filteredStudents = [];
    }
  }

  getStudentFullName(student: Student): string {
    return `${student.first_name} ${student.last_name}`;
  }

  getGradeLevelText(gradeLevel: number): string {
    return `Grade ${gradeLevel}`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  trackByStudentId(index: number, student: Student): number {
    return student.id;
  }
}
