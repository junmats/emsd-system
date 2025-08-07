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

  // Filter properties
  searchTerm: string = '';
  selectedGradeFilter: string = '';
  selectedStatusFilter: string = 'active';

  // CRUD properties
  showAddModal = false;
  showEditModal = false;
  showDeleteModal = false;
  showViewModal = false;
  showUpgradeModal = false;
  selectedStudent: Student | null = null;
  formStudent: Partial<Student> = {};
  submitting = false;

  // Bulk operations properties
  selectedStudents: Set<number> = new Set();
  selectAll = false;
  showBulkActions = false;
  bulkDeleting = false;
  bulkUpgrading = false;

  // Toast notifications
  toasts: { message: string; type: 'success' | 'error' | 'warning' | 'info'; id: number }[] = [];
  toastIdCounter = 0;

  // Confirmation modal
  showConfirmationModal = false;
  confirmationTitle = '';
  confirmationMessage = '';
  confirmationAction: (() => void) | null = null;
  confirmationButtonText = 'Confirm';
  confirmationButtonClass = 'btn-primary';

  constructor(private studentService: StudentService) {}

  ngOnInit() {
    this.loadStudents();
  }

  loadStudents() {
    this.loading = true;
    this.error = null;
    
    // Get all students regardless of status
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
    let filtered = [...this.students];

    // Apply search filter
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(student => 
        student.first_name.toLowerCase().includes(searchLower) ||
        student.last_name.toLowerCase().includes(searchLower) ||
        student.student_number.toLowerCase().includes(searchLower) ||
        (student.first_name + ' ' + student.last_name).toLowerCase().includes(searchLower)
      );
    }

    // Apply grade filter
    if (this.selectedGradeFilter) {
      filtered = filtered.filter(student => student.grade_level === Number(this.selectedGradeFilter));
    }

    // Apply status filter
    if (this.selectedStatusFilter) {
      filtered = filtered.filter(student => student.status === this.selectedStatusFilter);
    }

    // Sort alphabetically by last name, then first name
    this.filteredStudents = filtered.sort((a, b) => {
      const lastNameCompare = a.last_name.localeCompare(b.last_name);
      if (lastNameCompare === 0) {
        return a.first_name.localeCompare(b.first_name);
      }
      return lastNameCompare;
    });

    // Update selection state after filtering
    this.updateSelectAllState();
    this.updateBulkActionsVisibility();
  }

  // New filter methods
  onSearchChange() {
    this.clearSelection();
    this.updateFilteredStudents();
  }

  applyFilters() {
    this.clearSelection();
    this.updateFilteredStudents();
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedGradeFilter = '';
    this.selectedStatusFilter = '';
    this.clearSelection();
    this.updateFilteredStudents();
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

  // CRUD Methods
  openAddModal() {
    this.formStudent = {
      student_number: '',
      first_name: '',
      last_name: '',
      grade_level: 1,
      date_of_birth: '',
      address: '',
      parent_name: '',
      parent_contact: '',
      parent_email: '',
      status: 'active',
      enrollment_date: new Date().toISOString().split('T')[0] // Default to today
    };
    this.showAddModal = true;
  }

  openViewModal(student: Student) {
    this.selectedStudent = student;
    this.showViewModal = true;
  }

  formatDateForInput(dateString: string | null | undefined): string {
    if (!dateString) return '';
    
    // Create a date object and format it for HTML date input
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    // Format as YYYY-MM-DD for HTML date input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  openEditModal(student: Student) {
    this.selectedStudent = student;
    this.formStudent = {
      student_number: student.student_number,
      first_name: student.first_name,
      last_name: student.last_name,
      grade_level: student.grade_level,
      date_of_birth: this.formatDateForInput(student.date_of_birth),
      enrollment_date: this.formatDateForInput(student.enrollment_date),
      address: student.address || '',
      parent_name: student.parent_name || '',
      parent_contact: student.parent_contact || '',
      parent_email: student.parent_email || '',
      status: student.status
    };
    this.showEditModal = true;
  }

  openDeleteModal(student: Student) {
    this.selectedStudent = student;
    this.showDeleteModal = true;
  }

  openUpgradeModal(student: Student) {
    this.selectedStudent = student;
    this.showUpgradeModal = true;
  }

  closeModals() {
    this.showAddModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.showViewModal = false;
    this.showUpgradeModal = false;
    this.showConfirmationModal = false;
    this.selectedStudent = null;
    this.formStudent = {};
    this.confirmationAction = null;
  }

  submitAddStudent() {
    if (!this.validateForm()) return;

    this.submitting = true;
    this.studentService.createStudent(this.formStudent).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadStudents(); // Reload the list
          this.closeModals();
          this.showToast('Student added successfully!', 'success');
        } else {
          this.showToast('Failed to add student: ' + (response.message || 'Unknown error'), 'error');
        }
        this.submitting = false;
      },
      error: (err) => {
        this.showToast('Failed to add student. Please try again.', 'error');
        this.submitting = false;
        console.error('Error adding student:', err);
      }
    });
  }

  submitEditStudent() {
    if (!this.validateForm() || !this.selectedStudent) return;

    this.submitting = true;
    this.studentService.updateStudent(this.selectedStudent.id, this.formStudent).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadStudents(); // Reload the list
          this.closeModals();
          this.showToast('Student updated successfully!', 'success');
        } else {
          this.showToast('Failed to update student: ' + (response.message || 'Unknown error'), 'error');
        }
        this.submitting = false;
      },
      error: (err) => {
        this.showToast('Failed to update student. Please try again.', 'error');
        this.submitting = false;
        console.error('Error updating student:', err);
      }
    });
  }

  confirmDeleteStudent() {
    if (!this.selectedStudent) return;

    this.submitting = true;
    this.studentService.deleteStudent(this.selectedStudent.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadStudents(); // Reload the list
          this.closeModals();
          this.showToast('Student deleted successfully!', 'success');
        } else {
          this.showToast('Failed to delete student: ' + (response.message || 'Unknown error'), 'error');
        }
        this.submitting = false;
      },
      error: (err) => {
        this.showToast('Failed to delete student. Please try again.', 'error');
        this.submitting = false;
        console.error('Error deleting student:', err);
      }
    });
  }

  validateForm(): boolean {
    if (!this.formStudent.student_number?.trim()) {
      this.showToast('Student number is required', 'error');
      return false;
    }
    if (!this.formStudent.first_name?.trim()) {
      this.showToast('First name is required', 'error');
      return false;
    }
    if (!this.formStudent.last_name?.trim()) {
      this.showToast('Last name is required', 'error');
      return false;
    }
    if (!this.formStudent.grade_level || this.formStudent.grade_level < 1 || this.formStudent.grade_level > 6) {
      this.showToast('Valid grade level (1-6) is required', 'error');
      return false;
    }
    if (this.formStudent.parent_email && !this.isValidEmail(this.formStudent.parent_email)) {
      this.showToast('Please enter a valid email address', 'error');
      return false;
    }
    return true;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  confirmUpgrade() {
    if (!this.selectedStudent) return;

    this.submitting = true;
    const isGraduating = this.selectedStudent.grade_level === 6;
    
    const updateData: any = {
      grade_level: isGraduating ? 6 : this.selectedStudent.grade_level + 1,
      status: isGraduating ? 'graduated' : 'active'
    };

    this.studentService.updateStudent(this.selectedStudent.id, updateData).subscribe({
      next: (response) => {
        this.submitting = false; // Reset submitting first
        if (response.success) {
          this.loadStudents(); // Reload the list
          this.closeModals();
          const message = isGraduating 
            ? `${this.getStudentFullName(this.selectedStudent!)} has been graduated!`
            : `${this.getStudentFullName(this.selectedStudent!)} has been upgraded to Grade ${updateData.grade_level}!`;
          this.showToast(message, 'success');
        } else {
          this.showToast('Failed to upgrade student: ' + (response.message || 'Unknown error'), 'error');
        }
      },
      error: (err) => {
        this.submitting = false; // Reset submitting on error too
        this.showToast('Failed to upgrade student. Please try again.', 'error');
        console.error('Error upgrading student:', err);
      }
    });
  }

  // Bulk Operations Methods
  toggleStudentSelection(studentId: number) {
    if (this.selectedStudents.has(studentId)) {
      this.selectedStudents.delete(studentId);
    } else {
      this.selectedStudents.add(studentId);
    }
    this.updateBulkActionsVisibility();
    this.updateSelectAllState();
  }

  toggleSelectAll() {
    if (this.selectAll) {
      // Unselect all
      this.selectedStudents.clear();
      this.selectAll = false;
    } else {
      // Select all filtered students
      this.filteredStudents.forEach(student => {
        this.selectedStudents.add(student.id);
      });
      this.selectAll = true;
    }
    this.updateBulkActionsVisibility();
  }

  updateSelectAllState() {
    const allFilteredSelected = this.filteredStudents.every(student => 
      this.selectedStudents.has(student.id)
    );
    this.selectAll = allFilteredSelected && this.filteredStudents.length > 0;
  }

  updateBulkActionsVisibility() {
    this.showBulkActions = this.selectedStudents.size > 0;
  }

  clearSelection() {
    this.selectedStudents.clear();
    this.selectAll = false;
    this.showBulkActions = false;
  }

  getSelectedStudentObjects(): Student[] {
    return this.filteredStudents.filter(student => 
      this.selectedStudents.has(student.id)
    );
  }

  bulkDelete() {
    const selectedStudentObjects = this.getSelectedStudentObjects();
    if (selectedStudentObjects.length === 0) {
      this.showToast('No students selected for deletion.', 'warning');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedStudentObjects.length} student(s)?\n\n` +
      selectedStudentObjects.map(s => `${this.getStudentFullName(s)} (${s.student_number})`).join('\n') +
      '\n\nThis action cannot be undone.';

    this.showConfirmation(
      'Delete Selected Students',
      confirmMessage,
      () => this.executeBulkDelete(),
      'Delete All',
      'btn-danger'
    );
  }

  private executeBulkDelete() {
    const selectedStudentObjects = this.getSelectedStudentObjects();

    this.bulkDeleting = true;
    const deletePromises = selectedStudentObjects.map(student =>
      this.studentService.deleteStudent(student.id).toPromise()
    );

    Promise.all(deletePromises).then(results => {
      this.bulkDeleting = false;
      const successCount = results.filter(result => result?.success).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        this.loadStudents();
        this.clearSelection();
      }

      if (failCount === 0) {
        this.showToast(`Successfully deleted ${successCount} student(s).`, 'success');
      } else {
        this.showToast(`Deleted ${successCount} student(s). Failed to delete ${failCount} student(s).`, 'warning');
      }
    }).catch(error => {
      this.bulkDeleting = false;
      this.showToast('An error occurred during bulk deletion. Please try again.', 'error');
      console.error('Bulk delete error:', error);
    });
  }

  bulkUpgrade() {
    const selectedStudentObjects = this.getSelectedStudentObjects();
    if (selectedStudentObjects.length === 0) {
      this.showToast('No students selected for upgrade.', 'warning');
      return;
    }

    // Only allow upgrade for active students
    const activeStudents = selectedStudentObjects.filter(s => s.status === 'active');
    if (activeStudents.length === 0) {
      this.showToast('No active students selected. Only active students can be upgraded.', 'warning');
      return;
    }

    const graduatingStudents = activeStudents.filter(s => s.grade_level === 6);
    const upgradingStudents = activeStudents.filter(s => s.grade_level < 6);

    let confirmMessage = `Are you sure you want to upgrade ${activeStudents.length} student(s)?\n\n`;
    
    if (upgradingStudents.length > 0) {
      confirmMessage += `Students to be upgraded to next grade:\n`;
      upgradingStudents.forEach(s => {
        confirmMessage += `• ${this.getStudentFullName(s)} (Grade ${s.grade_level} → Grade ${s.grade_level + 1})\n`;
      });
    }

    if (graduatingStudents.length > 0) {
      confirmMessage += `\nStudents to be graduated:\n`;
      graduatingStudents.forEach(s => {
        confirmMessage += `• ${this.getStudentFullName(s)} (Grade ${s.grade_level} → Graduated)\n`;
      });
    }

    this.showConfirmation(
      'Upgrade Selected Students',
      confirmMessage,
      () => this.executeBulkUpgrade(activeStudents),
      'Upgrade All',
      'btn-success'
    );
  }

  private executeBulkUpgrade(activeStudents: Student[]) {
    const upgradePromises = activeStudents.map(student => {
      const isGraduating = student.grade_level === 6;
      const updateData = isGraduating 
        ? { status: 'graduated' as const }
        : { grade_level: student.grade_level + 1 };
      
      return this.studentService.updateStudent(student.id, updateData).toPromise();
    });

    Promise.all(upgradePromises).then(results => {
      this.bulkUpgrading = false;
      const successCount = results.filter(result => result?.success).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        this.loadStudents();
        this.clearSelection();
      }

      if (failCount === 0) {
        this.showToast(`Successfully upgraded ${successCount} student(s).`, 'success');
      } else {
        this.showToast(`Upgraded ${successCount} student(s). Failed to upgrade ${failCount} student(s).`, 'warning');
      }
    }).catch(error => {
      this.bulkUpgrading = false;
      this.showToast('An error occurred during bulk upgrade. Please try again.', 'error');
      console.error('Bulk upgrade error:', error);
    });
  }

  isStudentSelected(studentId: number): boolean {
    return this.selectedStudents.has(studentId);
  }

  // Toast Methods
  showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    const toast = {
      message,
      type,
      id: this.toastIdCounter++
    };
    this.toasts.push(toast);
    
    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      this.removeToast(toast.id);
    }, 5000);
  }

  removeToast(id: number) {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
  }

  // Confirmation Modal Methods
  showConfirmation(
    title: string, 
    message: string, 
    action: () => void, 
    buttonText: string = 'Confirm',
    buttonClass: string = 'btn-primary'
  ) {
    this.confirmationTitle = title;
    this.confirmationMessage = message;
    this.confirmationAction = action;
    this.confirmationButtonText = buttonText;
    this.confirmationButtonClass = buttonClass;
    this.showConfirmationModal = true;
  }

  executeConfirmationAction() {
    if (this.confirmationAction) {
      this.confirmationAction();
    }
    this.closeConfirmationModal();
  }

  closeConfirmationModal() {
    this.showConfirmationModal = false;
    this.confirmationAction = null;
  }
}
