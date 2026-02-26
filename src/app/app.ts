import { ChangeDetectionStrategy, Component, signal, computed, ChangeDetectorRef, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';

interface RotiEntry {
  name: string;
  count: number;
}

type AdminRole = 'ALPHA' | 'BETA' | 'GAMMA' | null;

interface Application {
  id: number;
  type: 'increment' | 'decrement';
  name: string;
  amount: number;
  reason: string;
  status: 'pending';
  approvals: AdminRole[];
  timestamp: number;
}

interface LogEntry {
  id: number;
  message: string;
  status: 'approved' | 'rejected';
  timestamp: number;
}

const DEFAULT_COUNTERS: RotiEntry[] = [
  { name: 'ali', count: 7 },
  { name: 'tahir', count: 8 },
  { name: 'lahori', count: 26 },
  { name: 'bilal', count: 8 },
  { name: 'taimoor', count: 10 },
  { name: 'wasay', count: 19 },
  { name: 'taha', count: 7 },
  { name: 'zain jabir', count: 4 },
  { name: 'zain sheikh', count: 7 },
  { name: 'salman', count: 1 },
  { name: 'rayyan', count: 2 },
  { name: 'theta', count: 2 },
  { name: 'tawassul', count: 6 },
  { name: 'sheikh', count: 2 },
  { name: 'abdullah adnan', count: 6 }
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet, MatIconModule, ReactiveFormsModule, DatePipe],
  templateUrl: './app.html',
})
export class App {
  counters = signal<RotiEntry[]>([]);

  rankedCounters = computed(() => {
    return [...this.counters()].sort((a, b) => b.count - a.count);
  });

  currentAdmin = signal<AdminRole>(null);
  isAdmin = computed(() => this.currentAdmin() !== null);
  
  showAdminLogin = signal(false);
  showAppForm = signal(false);
  
  applications = signal<Application[]>([]);
  logs = signal<LogEntry[]>([]);

  loginForm: FormGroup;
  appForm: FormGroup;

  constructor(private fb: FormBuilder, private cdr: ChangeDetectorRef) {
    this.counters.set(this.loadFromStorage('roti_counters', DEFAULT_COUNTERS));
    this.applications.set(this.loadFromStorage('roti_apps', []));
    this.logs.set(this.loadFromStorage('roti_logs', []));

    effect(() => {
      this.saveToStorage('roti_counters', this.counters());
    });
    effect(() => {
      this.saveToStorage('roti_apps', this.applications());
    });
    effect(() => {
      this.saveToStorage('roti_logs', this.logs());
    });

    this.loginForm = this.fb.group({
      password: ['', Validators.required]
    });

    this.appForm = this.fb.group({
      type: ['increment', Validators.required],
      name: ['', Validators.required],
      amount: [1, [Validators.required, Validators.min(1)]],
      reason: ['', Validators.required]
    });
  }

  toggleAdminLogin() { 
    this.showAdminLogin.update(v => !v); 
    this.cdr.markForCheck();
  }
  toggleAppForm() { 
    this.showAppForm.update(v => !v); 
    this.cdr.markForCheck();
  }

  attemptLogin() {
    const pwd = this.loginForm.value.password;
    if (pwd === 'PASS_ALPHA') this.currentAdmin.set('ALPHA');
    else if (pwd === 'PASS_BETA') this.currentAdmin.set('BETA');
    else if (pwd === 'PASS_GAMMA') this.currentAdmin.set('GAMMA');
    else {
      alert('ACCESS DENIED: Invalid Protocol Sequence');
      return;
    }
    this.showAdminLogin.set(false);
    this.loginForm.reset();
  }

  logout() {
    this.currentAdmin.set(null);
  }

  submitApplication() {
    if (this.appForm.valid) {
      const admin = this.currentAdmin();
      const initialApprovals = admin ? [admin] : [];
      
      const newApp: Application = {
        id: Date.now(),
        type: this.appForm.value.type,
        name: this.appForm.value.name.toLowerCase(),
        amount: this.appForm.value.amount,
        reason: this.appForm.value.reason,
        status: 'pending',
        approvals: initialApprovals,
        timestamp: Date.now()
      };
      this.applications.update(apps => [...apps, newApp]);
      this.showAppForm.set(false);
      this.appForm.reset({type: 'increment', amount: 1});
    }
  }

  approveApplication(app: Application) {
    const admin = this.currentAdmin();
    if (!admin || app.approvals.includes(admin)) return;

    const updatedApprovals = [...app.approvals, admin];
    
    if (updatedApprovals.length >= 3) {
      this.executeApplication(app);
      this.applications.update(apps => apps.filter(a => a.id !== app.id));
      const actionText = app.type === 'increment' ? 'Incremented' : app.type === 'decrement' ? 'Decremented' : 'Added';
      this.addLog(`[APPROVED] ${actionText} ${app.name} by ${app.amount}. Reason: ${app.reason}`, 'approved');
    } else {
      this.applications.update(apps => apps.map(a => a.id === app.id ? {...a, approvals: updatedApprovals} : a));
    }
  }

  rejectApplication(app: Application) {
    const admin = this.currentAdmin();
    if (!admin) return;
    
    this.applications.update(apps => apps.filter(a => a.id !== app.id));
    const actionTextRej = app.type === 'increment' ? 'Increment' : 'Decrement';
    this.addLog(`[REJECTED] ${actionTextRej} for ${app.name} rejected by Admin ${admin}. Reason: ${app.reason}`, 'rejected');
  }

  executeApplication(app: Application) {
    this.counters.update(state => {
      const exists = state.find(e => e.name === app.name);
      if (!exists) return state;
      const modifier = app.type === 'decrement' ? -app.amount : app.amount;
      return state.map(e => e.name === app.name ? {...e, count: Math.max(0, e.count + modifier)} : e);
    });
  }

  addLog(message: string, status: 'approved' | 'rejected') {
    const newLog: LogEntry = {
      id: Date.now(),
      message,
      status,
      timestamp: Date.now()
    };
    this.logs.update(logs => [newLog, ...logs].slice(0, 50));
  }
  
  hasApproved(app: Application): boolean {
    const admin = this.currentAdmin();
    return admin ? app.approvals.includes(admin) : false;
  }

  private loadFromStorage<T>(key: string, defaultValue: T): T {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('Error parsing storage', e);
        }
      }
    }
    return defaultValue;
  }

  private saveToStorage<T>(key: string, value: T) {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }
}
