import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChargeService, Charge, StudentChargeSummary, StudentChargeBreakdown } from '../../services/charge.service';

@Component({
  selector: 'app-charges',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './charges.component.html',
  styleUrl: './charges.component.scss'
})
export class ChargesComponent implements OnInit {
  gradeLevels = [1, 2, 3, 4, 5, 6];
  charges: Charge[] = [];
  filteredCharges: Charge[] = [];
  loading = false;
  error: string | null = null;

  // Filter properties
  searchTerm: string = '';
  selectedGradeFilter: string = '';
  selectedTypeFilter: string = '';
  selectedStatusFilter: string = 'active';

  // Modal properties
  showAddModal = false;
  showEditModal = false;
  showDeleteModal = false;
  selectedCharge: Charge | null = null;
  submitting = false;

  // Form data
  formCharge: Partial<Charge> = {};
  selectedGradeLevels: number[] = []; // For multi-select in add modal
  showDropdown = false; // Track dropdown visibility

  // Charge types
  chargeTypes = [
    { value: 'tuition', label: 'Tuition Fee' },
    { value: 'books', label: 'Books & Materials' },
    { value: 'uniform', label: 'Uniform' },
    { value: 'activities', label: 'Activities' },
    { value: 'other', label: 'Other' }
  ];

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

  // Student charges properties
  activeTab: 'charges' | 'students' = 'charges';
  studentCharges: StudentChargeSummary[] = [];
  filteredStudentCharges: StudentChargeSummary[] = [];
  studentChargesLoading = false;
  selectedStudent: StudentChargeSummary | null = null;
  studentBreakdown: StudentChargeBreakdown | null = null;
  showStudentBreakdownModal = false;

  // Student charges filters
  studentSearchTerm: string = '';
  selectedStudentGradeFilter: string = '';
  selectedStudentStatusFilter: string = 'active';

  constructor(private chargeService: ChargeService) {}

  ngOnInit() {
    this.loadCharges();
  }

  loadCharges() {
    this.loading = true;
    this.error = null;

    this.chargeService.getCharges({ is_active: true }).subscribe({
      next: (response) => {
        if (response.success) {
          this.charges = response.data;
          this.updateFilteredCharges();
        } else {
          this.error = 'Failed to load charges';
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Failed to load charges. Please try again.';
        console.error('Error loading charges:', err);
      }
    });
  }

  updateFilteredCharges() {
    let filtered = [...this.charges];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(charge =>
        charge.name.toLowerCase().includes(searchLower) ||
        (charge.description && charge.description.toLowerCase().includes(searchLower))
      );
    }

    // Apply grade filter
    if (this.selectedGradeFilter) {
      filtered = filtered.filter(charge => charge.grade_level === Number(this.selectedGradeFilter));
    }

    // Apply type filter
    if (this.selectedTypeFilter) {
      filtered = filtered.filter(charge => charge.charge_type === this.selectedTypeFilter);
    }

    // Apply status filter
    if (this.selectedStatusFilter === 'active') {
      filtered = filtered.filter(charge => charge.is_active);
    } else if (this.selectedStatusFilter === 'inactive') {
      filtered = filtered.filter(charge => !charge.is_active);
    }

    // Sort by grade level, then by charge type, then by name
    this.filteredCharges = filtered.sort((a, b) => {
      const gradeCompare = (a.grade_level || 0) - (b.grade_level || 0);
      if (gradeCompare !== 0) return gradeCompare;
      
      const typeCompare = a.charge_type.localeCompare(b.charge_type);
      if (typeCompare !== 0) return typeCompare;
      
      return a.name.localeCompare(b.name);
    });
  }

  // Filter methods
  onSearchChange() {
    this.updateFilteredCharges();
  }

  applyFilters() {
    this.updateFilteredCharges();
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedGradeFilter = '';
    this.selectedTypeFilter = '';
    this.selectedStatusFilter = 'active';
    this.updateFilteredCharges();
  }

  getChargeTypeLabel(type: string): string {
    const typeObj = this.chargeTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  }

  trackByChargeId(index: number, charge: Charge): number {
    return charge.id;
  }

  // Modal methods
  openAddModal() {
    this.formCharge = {
      name: '',
      description: '',
      amount: 0,
      charge_type: 'tuition',
      grade_level: 1, // This will be overridden by selectedGradeLevels
      is_mandatory: true,
      is_active: true
    };
    this.selectedGradeLevels = []; // Reset multi-select
    this.showDropdown = false; // Reset dropdown state
    this.showAddModal = true;
  }

  openEditModal(charge: Charge) {
    this.selectedCharge = charge;
    this.formCharge = {
      name: charge.name,
      description: charge.description || '',
      amount: charge.amount,
      charge_type: charge.charge_type,
      grade_level: charge.grade_level,
      is_mandatory: charge.is_mandatory,
      is_active: charge.is_active
    };
    this.showEditModal = true;
  }

  openDeleteModal(charge: Charge) {
    this.selectedCharge = charge;
    this.showDeleteModal = true;
  }

  closeModals() {
    this.showAddModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.showConfirmationModal = false;
    this.showStudentBreakdownModal = false;
    this.selectedCharge = null;
    this.selectedStudent = null;
    this.studentBreakdown = null;
    this.formCharge = {};
    this.selectedGradeLevels = []; // Reset multi-select
    this.showDropdown = false; // Close dropdown when closing modals
    this.confirmationAction = null;
  }

  // CRUD operations
  submitAddCharge() {
    if (!this.validateForm()) return;

    if (this.selectedGradeLevels.length === 0) {
      this.showToast('Please select at least one grade level', 'error');
      return;
    }

    this.submitting = true;
    const totalCharges = this.selectedGradeLevels.length;
    let completedCharges = 0;
    let hasErrors = false;

    // Create a charge for each selected grade level
    this.selectedGradeLevels.forEach(gradeLevel => {
      const chargeData = {
        ...this.formCharge,
        grade_level: gradeLevel
      };

      this.chargeService.createCharge(chargeData).subscribe({
        next: (response) => {
          completedCharges++;
          if (response.success) {
            // Success for this grade level
          } else {
            hasErrors = true;
            console.error(`Failed to add charge for grade ${gradeLevel}:`, response.message);
          }

          // Check if all charges have been processed
          if (completedCharges === totalCharges) {
            this.loadCharges();
            this.closeModals();
            this.submitting = false;

            if (!hasErrors) {
              this.showToast(`Charge added successfully for ${totalCharges} grade level${totalCharges > 1 ? 's' : ''}!`, 'success');
            } else {
              this.showToast('Some charges failed to add. Please check and try again.', 'warning');
            }
          }
        },
        error: (err) => {
          completedCharges++;
          hasErrors = true;
          console.error(`Error adding charge for grade ${gradeLevel}:`, err);

          // Check if all charges have been processed
          if (completedCharges === totalCharges) {
            this.loadCharges();
            this.closeModals();
            this.submitting = false;
            this.showToast('Some charges failed to add. Please try again.', 'error');
          }
        }
      });
    });
  }

  submitEditCharge() {
    if (!this.validateForm() || !this.selectedCharge) return;

    this.submitting = true;
    this.chargeService.updateCharge(this.selectedCharge.id, this.formCharge).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadCharges();
          this.closeModals();
          this.showToast('Charge updated successfully!', 'success');
        } else {
          this.showToast('Failed to update charge: ' + (response.message || 'Unknown error'), 'error');
        }
        this.submitting = false;
      },
      error: (err) => {
        this.showToast('Failed to update charge. Please try again.', 'error');
        this.submitting = false;
        console.error('Error updating charge:', err);
      }
    });
  }

  confirmDeleteCharge() {
    if (!this.selectedCharge) return;

    const confirmMessage = `Are you sure you want to delete "${this.selectedCharge.name}"?\n\nThis action cannot be undone.`;
    
    this.showConfirmation(
      'Delete Charge',
      confirmMessage,
      () => this.executeDeleteCharge(),
      'Delete',
      'btn-danger'
    );
  }

  private executeDeleteCharge() {
    if (!this.selectedCharge) return;

    this.submitting = true;
    this.chargeService.deleteCharge(this.selectedCharge.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadCharges();
          this.closeModals();
          this.showToast('Charge deleted successfully!', 'success');
        } else {
          this.showToast('Failed to delete charge: ' + (response.message || 'Unknown error'), 'error');
        }
        this.submitting = false;
      },
      error: (err) => {
        this.showToast('Failed to delete charge. Please try again.', 'error');
        this.submitting = false;
        console.error('Error deleting charge:', err);
      }
    });
  }

  validateForm(): boolean {
    if (!this.formCharge.name?.trim()) {
      this.showToast('Charge name is required', 'error');
      return false;
    }
    if (!this.formCharge.amount || this.formCharge.amount <= 0) {
      this.showToast('Amount must be greater than 0', 'error');
      return false;
    }
    if (!this.formCharge.charge_type) {
      this.showToast('Charge type is required', 'error');
      return false;
    }
    if (!this.formCharge.grade_level || this.formCharge.grade_level < 1 || this.formCharge.grade_level > 6) {
      this.showToast('Valid grade level (1-6) is required', 'error');
      return false;
    }
    return true;
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

  // Multi-select grade level methods
  toggleGradeSelection(gradeLevel: number) {
    const index = this.selectedGradeLevels.indexOf(gradeLevel);
    if (index > -1) {
      this.selectedGradeLevels.splice(index, 1);
    } else {
      this.selectedGradeLevels.push(gradeLevel);
    }
    this.selectedGradeLevels.sort((a, b) => a - b);
  }

  isGradeSelected(gradeLevel: number): boolean {
    return this.selectedGradeLevels.includes(gradeLevel);
  }

  selectAllGrades() {
    this.selectedGradeLevels = [...this.gradeLevels];
  }

  clearGradeSelection() {
    this.selectedGradeLevels = [];
  }

  getSelectedGradesText(): string {
    if (this.selectedGradeLevels.length === 0) {
      return 'Select grade levels...';
    }
    if (this.selectedGradeLevels.length === this.gradeLevels.length) {
      return 'All grades selected';
    }
    if (this.selectedGradeLevels.length <= 3) {
      return this.selectedGradeLevels.map(g => `Grade ${g}`).join(', ');
    }
    return `${this.selectedGradeLevels.length} grades selected`;
  }

  // Dropdown control methods
  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }

  closeDropdown() {
    this.showDropdown = false;
  }

  // Tab management
  switchTab(tab: 'charges' | 'students') {
    this.activeTab = tab;
    if (tab === 'students' && this.studentCharges.length === 0) {
      this.loadStudentCharges();
    }
  }

  // Student charges methods
  loadStudentCharges() {
    this.studentChargesLoading = true;
    this.error = null;

    const params: any = { status: this.selectedStudentStatusFilter };
    if (this.selectedStudentGradeFilter) {
      params.grade_level = this.selectedStudentGradeFilter;
    }

    this.chargeService.getStudentChargesSummary(params).subscribe({
      next: (response) => {
        if (response.success) {
          this.studentCharges = response.data;
          this.updateFilteredStudentCharges();
        } else {
          this.error = 'Failed to load student charges';
        }
        this.studentChargesLoading = false;
      },
      error: (err) => {
        this.studentChargesLoading = false;
        this.error = 'Failed to load student charges. Please try again.';
        console.error('Error loading student charges:', err);
      }
    });
  }

  updateFilteredStudentCharges() {
    let filtered = [...this.studentCharges];

    // Apply search filter
    if (this.studentSearchTerm.trim()) {
      const searchLower = this.studentSearchTerm.toLowerCase();
      filtered = filtered.filter(student =>
        student.first_name.toLowerCase().includes(searchLower) ||
        student.last_name.toLowerCase().includes(searchLower) ||
        student.student_number.toLowerCase().includes(searchLower)
      );
    }

    // Apply grade filter
    if (this.selectedStudentGradeFilter) {
      filtered = filtered.filter(student => student.grade_level === Number(this.selectedStudentGradeFilter));
    }

    // Apply status filter
    if (this.selectedStudentStatusFilter) {
      filtered = filtered.filter(student => student.status === this.selectedStudentStatusFilter);
    }

    this.filteredStudentCharges = filtered;
  }

  applyStudentFilters() {
    this.updateFilteredStudentCharges();
  }

  onStudentSearchChange() {
    this.updateFilteredStudentCharges();
  }

  clearStudentFilters() {
    this.studentSearchTerm = '';
    this.selectedStudentGradeFilter = '';
    this.selectedStudentStatusFilter = 'active';
    this.updateFilteredStudentCharges();
  }

  // Student breakdown modal
  openStudentBreakdownModal(student: StudentChargeSummary) {
    this.selectedStudent = student;
    this.submitting = true;
    this.showStudentBreakdownModal = true;

    this.chargeService.getStudentChargeBreakdown(student.student_id).subscribe({
      next: (response) => {
        if (response.success) {
          this.studentBreakdown = response.data;
        } else {
          this.showToast('Failed to load student charge breakdown', 'error');
          this.closeStudentBreakdownModal();
        }
        this.submitting = false;
      },
      error: (err) => {
        this.submitting = false;
        this.showToast('Failed to load student charge breakdown', 'error');
        this.closeStudentBreakdownModal();
        console.error('Error loading student breakdown:', err);
      }
    });
  }

  closeStudentBreakdownModal() {
    this.showStudentBreakdownModal = false;
    this.selectedStudent = null;
    this.studentBreakdown = null;
    this.submitting = false;
  }

  // Utility methods
  getStudentFullName(student: StudentChargeSummary): string {
    return `${student.first_name} ${student.last_name}`;
  }

  formatCurrency(amount: number): string {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  trackByStudentId(index: number, student: StudentChargeSummary): number {
    return student.student_id;
  }
}
