import { ChangeDetectionStrategy, Component, signal, computed, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- SUPABASE CONFIGURATION ---
// IMPORTANT: A password alone is not enough to connect to Supabase from the frontend.
// You MUST provide your Supabase Project URL and Anon Key below.
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

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

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet, MatIconModule, ReactiveFormsModule, DatePipe],
  templateUrl: './app.html',
})
export class App implements OnInit, OnDestroy {
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

  private supabase: SupabaseClient;

  constructor(private fb: FormBuilder, private cdr: ChangeDetectorRef) {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

  async ngOnInit() {
    if (SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
      console.warn('Supabase is not configured. Please add your URL and Key.');
      return;
    }
    await this.fetchData();
    this.setupRealtime();
  }

  ngOnDestroy() {
    this.supabase.removeAllChannels();
  }

  async fetchData() {
    const { data: counters } = await this.supabase.from('counters').select('*');
    if (counters) this.counters.set(counters);

    const { data: apps } = await this.supabase.from('applications').select('*');
    if (apps) this.applications.set(apps);

    const { data: logs } = await this.supabase.from('logs').select('*').order('timestamp', { ascending: false }).limit(50);
    if (logs) this.logs.set(logs);

    this.cdr.markForCheck();
  }

  setupRealtime() {
    this.supabase.channel('public:all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'counters' }, () => this.fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => this.fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'logs' }, () => this.fetchData())
      .subscribe();
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

  async submitApplication() {
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
      
      await this.supabase.from('applications').insert([newApp]);

      this.showAppForm.set(false);
      this.appForm.reset({type: 'increment', amount: 1});
    }
  }

  async approveApplication(app: Application) {
    const admin = this.currentAdmin();
    if (!admin || app.approvals.includes(admin)) return;

    const updatedApprovals = [...app.approvals, admin];
    
    if (updatedApprovals.length >= 3) {
      const { data: counter } = await this.supabase.from('counters').select('count').eq('name', app.name).single();
      if (counter) {
        const modifier = app.type === 'decrement' ? -app.amount : app.amount;
        await this.supabase.from('counters').update({ count: Math.max(0, counter.count + modifier) }).eq('name', app.name);
      }
      
      await this.supabase.from('applications').delete().eq('id', app.id);
      
      const actionText = app.type === 'increment' ? 'Incremented' : 'Decremented';
      await this.supabase.from('logs').insert([{
        id: Date.now(),
        message: `[APPROVED] ${actionText} ${app.name} by ${app.amount}. Reason: ${app.reason}`,
        status: 'approved',
        timestamp: Date.now()
      }]);
    } else {
      await this.supabase.from('applications').update({ approvals: updatedApprovals }).eq('id', app.id);
    }
  }

  async rejectApplication(app: Application) {
    const admin = this.currentAdmin();
    if (!admin) return;
    
    await this.supabase.from('applications').delete().eq('id', app.id);
    
    const actionTextRej = app.type === 'increment' ? 'Increment' : 'Decrement';
    await this.supabase.from('logs').insert([{
      id: Date.now(),
      message: `[REJECTED] ${actionTextRej} for ${app.name} rejected by Admin ${admin}. Reason: ${app.reason}`,
      status: 'rejected',
      timestamp: Date.now()
    }]);
  }

  hasApproved(app: Application): boolean {
    const admin = this.currentAdmin();
    return admin ? app.approvals.includes(admin) : false;
  }
}
