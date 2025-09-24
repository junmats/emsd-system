import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { StudentsComponent } from './components/students/students.component';
import { PaymentsComponent } from './components/payments/payments.component';
import { ChargesComponent } from './components/charges/charges.component';
import { AssessmentsComponent } from './components/assessments/assessments.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'students', 
    component: StudentsComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'payments', 
    component: PaymentsComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'charges', 
    component: ChargesComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'assessments', 
    component: AssessmentsComponent, 
    canActivate: [AuthGuard] 
  },
  { path: '**', redirectTo: '/login' }
];
