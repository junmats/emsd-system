import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService, Student, StudentUpdateResponse, BackPaymentInfo } from '../../services/student.service';

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
  toasts: { message: string; type: 'success' | 'error' | 'warning' | 'info'; id: number; isRemoving?: boolean }[] = [];
  toastIdCounter = 0;

  // Form validation errors
  formErrors: { [key: string]: string } = {};

  // Confirmation modal
  showConfirmationModal = false;
  confirmationTitle = '';
  confirmationMessage = '';
  confirmationAction: (() => void) | null = null;
  confirmationButtonText = 'Confirm';
  confirmationButtonClass = 'btn-primary';

  // Back payment confirmation
  showBackPaymentModal = false;
  backPaymentInfo: BackPaymentInfo | null = null;
  pendingUpgradeAction: (() => void) | null = null;
  existingBackPayments: any[] = [];
  loadingBackPayments = false;

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
    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    this.formStudent = {
      enrollment_date: today,
      status: 'active'
    };
    this.formErrors = {}; // Clear validation errors
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
    this.formErrors = {}; // Clear validation errors
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
    this.showBackPaymentModal = false;
    this.selectedStudent = null;
    this.formStudent = {};
    this.confirmationAction = null;
    this.pendingUpgradeAction = null;
    this.existingBackPayments = [];
    this.loadingBackPayments = false;
    this.backPaymentInfo = null;
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

    const originalGrade = this.selectedStudent.grade_level;
    const newGrade = this.formStudent.grade_level;

    // Check if grade level is being upgraded
    if (newGrade && newGrade > originalGrade) {
      // Check for back payments first
      this.submitting = true;
      this.studentService.checkBackPayments(this.selectedStudent.id, newGrade).subscribe({
        next: (response: any) => {
          if (response.success && response.hasBackPayments) {
            // Load existing back payments before showing the modal
            this.studentService.getBackPayments(this.selectedStudent!.id).subscribe({
              next: (existingResponse: any) => {
                this.submitting = false;
                this.existingBackPayments = existingResponse.success ? existingResponse.data : [];
                // Show back payment confirmation with existing payments
                this.backPaymentInfo = response.backPaymentInfo;
                this.pendingUpgradeAction = () => this.proceedWithEditUpgrade();
                this.showBackPaymentModal = true;
              },
              error: (err: any) => {
                this.submitting = false;
                this.existingBackPayments = [];
                // Still show the modal even if we can't load existing payments
                this.backPaymentInfo = response.backPaymentInfo;
                this.pendingUpgradeAction = () => this.proceedWithEditUpgrade();
                this.showBackPaymentModal = true;
              }
            });
          } else {
            // No back payments, proceed with regular edit
            this.submitting = false;
            this.proceedWithEditUpgrade();
          }
        },
        error: (err: any) => {
          this.submitting = false;
          this.showToast('Failed to check back payments. Please try again.', 'error');
          console.error('Error checking back payments:', err);
        }
      });
    } else {
      // Regular edit without grade upgrade
      this.proceedWithEditUpgrade();
    }
  }

  proceedWithEditUpgrade() {
    if (!this.selectedStudent) return;

    this.submitting = true;
    this.studentService.updateStudent(this.selectedStudent.id, this.formStudent).subscribe({
      next: (response: StudentUpdateResponse) => {
        if (response.success) {
          this.loadStudents();
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
    this.formErrors = {}; // Clear previous errors
    let isValid = true;

    if (!this.formStudent.student_number?.trim()) {
      this.formErrors['student_number'] = 'Student number is required';
      isValid = false;
    }
    if (!this.formStudent.first_name?.trim()) {
      this.formErrors['first_name'] = 'First name is required';
      isValid = false;
    }
    if (!this.formStudent.last_name?.trim()) {
      this.formErrors['last_name'] = 'Last name is required';
      isValid = false;
    }
    if (!this.formStudent.grade_level || this.formStudent.grade_level < 1 || this.formStudent.grade_level > 6) {
      this.formErrors['grade_level'] = 'Valid grade level (1-6) is required';
      isValid = false;
    }
    if (!this.formStudent.enrollment_date?.trim()) {
      this.formErrors['enrollment_date'] = 'Enrollment date is required';
      isValid = false;
    }
    if (this.formStudent.parent_email && !this.isValidEmail(this.formStudent.parent_email)) {
      this.formErrors['parent_email'] = 'Please enter a valid email address';
      isValid = false;
    }

    // Show first error as toast
    if (!isValid) {
      const firstError = Object.values(this.formErrors)[0];
      this.showToast(firstError, 'error');
    }

    return isValid;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  confirmUpgrade() {
    if (!this.selectedStudent) return;

    const isGraduating = this.selectedStudent.grade_level === 6;
    const newGradeLevel = isGraduating ? 6 : this.selectedStudent.grade_level + 1;
    const newStatus = isGraduating ? 'graduated' : 'active';

    // First check for back payments
    this.submitting = true;
    this.studentService.checkBackPayments(this.selectedStudent.id, newGradeLevel).subscribe({
      next: (response: any) => {
        if (response.success && response.hasBackPayments) {
          // Load existing back payments before showing the modal
          this.studentService.getBackPayments(this.selectedStudent!.id).subscribe({
            next: (existingResponse: any) => {
              this.submitting = false;
              this.existingBackPayments = existingResponse.success ? existingResponse.data : [];
              // Show back payment confirmation with existing payments
              this.backPaymentInfo = response.backPaymentInfo;
              this.pendingUpgradeAction = () => this.proceedWithUpgrade(newGradeLevel, newStatus, response.backPaymentInfo.unpaidCharges);
              this.showBackPaymentModal = true;
            },
            error: (err: any) => {
              this.submitting = false;
              this.existingBackPayments = [];
              // Still show the modal even if we can't load existing payments
              this.backPaymentInfo = response.backPaymentInfo;
              this.pendingUpgradeAction = () => this.proceedWithUpgrade(newGradeLevel, newStatus, response.backPaymentInfo.unpaidCharges);
              this.showBackPaymentModal = true;
            }
          });
        } else {
          // No back payments, proceed directly
          this.submitting = false;
          this.proceedWithUpgrade(newGradeLevel, newStatus, []);
        }
      },
      error: (err: any) => {
        this.submitting = false;
        this.showToast('Failed to check back payments. Please try again.', 'error');
        console.error('Error checking back payments:', err);
      }
    });
  }

  proceedWithUpgrade(newGradeLevel: number, newStatus: string, unpaidCharges: any[]) {
    if (!this.selectedStudent) return;

    this.submitting = true;
    const studentName = this.getStudentFullName(this.selectedStudent);
    const isGraduating = newStatus === 'graduated';

    if (unpaidCharges.length > 0) {
      // Use the new upgrade with back payments endpoint
      this.studentService.upgradeWithBackPayments(this.selectedStudent.id, newGradeLevel, newStatus, unpaidCharges).subscribe({
        next: (response) => {
          this.submitting = false;
          if (response.success) {
            this.loadStudents();
            this.closeModals();
            
            const totalAmount = unpaidCharges.reduce((sum, charge) => sum + (charge.amount_due - charge.amount_paid), 0);
            let message = isGraduating 
              ? `${studentName} has been graduated!`
              : `${studentName} has been upgraded to Grade ${newGradeLevel}!`;
            message += ` Back payments of ₱${totalAmount.toFixed(2)} have been carried over.`;
            
            this.showToast(message, 'success');
          } else {
            this.showToast('Failed to upgrade student: ' + (response.message || 'Unknown error'), 'error');
          }
        },
        error: (err) => {
          this.submitting = false;
          this.showToast('Failed to upgrade student. Please try again.', 'error');
          console.error('Error upgrading student:', err);
        }
      });
    } else {
      // Regular upgrade without back payments
      const updateData: Partial<Student> = { 
        grade_level: newGradeLevel, 
        status: newStatus as 'active' | 'inactive' | 'graduated'
      };
      this.studentService.updateStudent(this.selectedStudent.id, updateData).subscribe({
        next: (response) => {
          this.submitting = false;
          if (response.success) {
            this.loadStudents();
            this.closeModals();
            
            const message = isGraduating 
              ? `${studentName} has been graduated!`
              : `${studentName} has been upgraded to Grade ${newGradeLevel}!`;
            
            this.showToast(message, 'success');
          } else {
            this.showToast('Failed to upgrade student: ' + (response.message || 'Unknown error'), 'error');
          }
        },
        error: (err) => {
          this.submitting = false;
          this.showToast('Failed to upgrade student. Please try again.', 'error');
          console.error('Error upgrading student:', err);
        }
      });
    }
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

    // Check for back payments for all students
    this.bulkUpgrading = true;
    const backPaymentChecks = activeStudents.map(student => {
      const isGraduating = student.grade_level === 6;
      const newGradeLevel = isGraduating ? 6 : student.grade_level + 1;
      
      return this.studentService.checkBackPayments(student.id, newGradeLevel).toPromise()
        .then(response => ({
          student,
          newGradeLevel,
          isGraduating,
          hasBackPayments: response?.hasBackPayments || false,
          backPaymentInfo: response?.backPaymentInfo || null
        }));
    });

    Promise.all(backPaymentChecks).then(results => {
      this.bulkUpgrading = false;
      
      const studentsWithBackPayments = results.filter(r => r.hasBackPayments);
      const graduatingStudents = results.filter(r => r.isGraduating);
      const upgradingStudents = results.filter(r => !r.isGraduating);

      let confirmMessage = `Are you sure you want to upgrade ${activeStudents.length} student(s)?\n\n`;
      
      if (upgradingStudents.length > 0) {
        confirmMessage += `Students to be upgraded to next grade:\n`;
        upgradingStudents.forEach(r => {
          const backPaymentNote = r.hasBackPayments ? ` (⚠️ Has back payments)` : '';
          confirmMessage += `• ${this.getStudentFullName(r.student)} (Grade ${r.student.grade_level} → Grade ${r.newGradeLevel})${backPaymentNote}\n`;
        });
      }

      if (graduatingStudents.length > 0) {
        confirmMessage += `\nStudents to be graduated:\n`;
        graduatingStudents.forEach(r => {
          const backPaymentNote = r.hasBackPayments ? ` (⚠️ Has back payments)` : '';
          confirmMessage += `• ${this.getStudentFullName(r.student)} (Grade ${r.student.grade_level} → Graduated)${backPaymentNote}\n`;
        });
      }

      if (studentsWithBackPayments.length > 0) {
        const totalBackPayments = studentsWithBackPayments.reduce((sum, r) => 
          sum + (r.backPaymentInfo?.totalAmount || 0), 0);
        confirmMessage += `\n⚠️ WARNING: ${studentsWithBackPayments.length} student(s) have unpaid charges that will become back payments (Total: ₱${totalBackPayments.toFixed(2)})`;
      }

      this.showConfirmation(
        'Bulk Upgrade Students',
        confirmMessage,
        () => this.executeBulkUpgrade(results),
        'Upgrade All',
        'btn-success'
      );
    }).catch(error => {
      this.bulkUpgrading = false;
      this.showToast('An error occurred while checking for back payments. Please try again.', 'error');
      console.error('Bulk back payment check error:', error);
    });
  }

  private executeBulkUpgrade(studentResults: any[]) {
    this.bulkUpgrading = true;
    const upgradePromises = studentResults.map(result => {
      const student = result.student;
      const newGradeLevel = result.newGradeLevel;
      const isGraduating = result.isGraduating;
      const newStatus = isGraduating ? 'graduated' : 'active';
      
      if (result.hasBackPayments && result.backPaymentInfo?.unpaidCharges) {
        // Use upgrade with back payments
        return this.studentService.upgradeWithBackPayments(
          student.id, 
          newGradeLevel, 
          newStatus, 
          result.backPaymentInfo.unpaidCharges
        ).toPromise();
      } else {
        // Regular upgrade
        const updateData = isGraduating 
          ? { status: 'graduated' as const }
          : { grade_level: newGradeLevel };
        
        return this.studentService.updateStudent(student.id, updateData).toPromise();
      }
    });

    Promise.all(upgradePromises).then(results => {
      this.bulkUpgrading = false;
      const successCount = results.filter(result => result?.success).length;
      const failCount = results.length - successCount;

      // Check for back payments in results
      const backPaymentStudents = studentResults.filter(sr => sr.hasBackPayments);

      if (successCount > 0) {
        this.loadStudents();
        this.clearSelection();
      }

      if (failCount === 0) {
        let message = `Successfully upgraded ${successCount} student(s).`;
        if (backPaymentStudents.length > 0) {
          message += ` Note: ${backPaymentStudents.length} student(s) have back payments that were carried over.`;
        }
        this.showToast(message, 'success');
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
    const toast = this.toasts.find(t => t.id === id);
    if (toast) {
      toast.isRemoving = true;
      // Remove after animation completes
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id);
      }, 300);
    }
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

  // Back Payment Methods
  showBackPaymentNotification() {
    this.showBackPaymentModal = true;
  }

  closeBackPaymentModal() {
    this.showBackPaymentModal = false;
    this.backPaymentInfo = null;
    this.pendingUpgradeAction = null;
  }

  confirmBackPaymentUpgrade() {
    if (this.pendingUpgradeAction) {
      this.pendingUpgradeAction();
    }
    this.closeBackPaymentModal();
  }

  getTotalOutstanding(): number {
    return this.existingBackPayments.reduce((total, payment) => {
      return total + (payment.amount_due - payment.amount_paid);
    }, 0);
  }
}
