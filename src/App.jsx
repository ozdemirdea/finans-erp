import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wallet, Plus, ArrowUpRight, ArrowDownRight, Bell, Calendar,
  AlertTriangle, CheckCircle2, Clock, Trash2, Edit3, RotateCcw,
  Download, Upload, ShieldCheck, CreditCard, Landmark, Receipt,
  Users, Banknote, ChevronRight, X, Calculator, RefreshCw,
  SlidersHorizontal, ArrowUpDown, Sparkles, Database, History
} from 'lucide-react';

// ==========================================
// 1. FINANSAL MATEMATIK VE YARDIMCI MOTORLAR
// ==========================================
const roundCurrency = (num) => {
  const n = Number(num);
  if (isNaN(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundCurrency(amount));
};

const getTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addMonthsToDateStr = (dateStr, monthsToAdd) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1 + monthsToAdd, d);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, '0');
  const nd = String(date.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
};

const diffDays = (targetDateStr, currentDateStr) => {
  const [ty, tm, td] = targetDateStr.split('-').map(Number);
  const [cy, cm, cd] = currentDateStr.split('-').map(Number);
  const tUTC = Date.UTC(ty, tm - 1, td);
  const cUTC = Date.UTC(cy, cm - 1, cd);
  return Math.round((tUTC - cUTC) / (1000 * 60 * 60 * 24));
};

const formatDateTR = (dateStr) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${d} ${months[ parseInt(m, 10) - 1 ]} ${y}`;
};

// ==========================================
// 2. CIFT KATMANLI VERITABANI (IndexedDB + LocalStorage)
// ==========================================
const DB_NAME = 'FinansERP_ProductionDB';
const DB_STORE = 'app_state_store';
const STORAGE_KEY = 'finans_erp_prod_v3';

const openIndexedDB = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return resolve(null);
    }
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

const saveStateDualLayer = async (stateObj) => {
  const serialized = JSON.stringify(stateObj);
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    console.warn('LocalStorage yazma uyarısı:', e);
  }
  try {
    const db = await openIndexedDB();
    if (db) {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(serialized, 'master_state');
    }
  } catch (e) {
    console.warn('IndexedDB yazma uyarısı:', e);
  }
};

const loadStateDualLayer = async () => {
  try {
    const db = await openIndexedDB();
    if (db) {
      const data = await new Promise((resolve) => {
        const tx = db.transaction(DB_STORE, 'readonly');
        const req = tx.objectStore(DB_STORE).get('master_state');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      if (data) return JSON.parse(data);
    }
  } catch (e) {
    console.warn('IndexedDB okuma uyarısı:', e);
  }
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) return JSON.parse(local);
  } catch (e) {
    console.warn('LocalStorage okuma uyarısı:', e);
  }
  return null;
};

// ==========================================
// 3. KATEGORILER VE VARSAYILAN DEMO VERILERI
// ==========================================
const DEBT_TYPES = {
  LOAN: { label: 'Kredi', short: 'Kredi', icon: Landmark, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  CREDIT_CARD: { label: 'Kredi Kartı', short: 'K.Kartı', icon: CreditCard, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  KMH: { label: 'KMH (Ek Hesap)', short: 'KMH', icon: Banknote, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  BILL: { label: 'Fatura', short: 'Fatura', icon: Receipt, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
  PERSONAL: { label: 'Elden Borç', short: 'Elden', icon: Users, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
};

const PRIORITIES = {
  CRITICAL: { label: 'Çok Kritik', rank: 4, badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  HIGH: { label: 'Yüksek', rank: 3, badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  NORMAL: { label: 'Normal', rank: 2, badge: 'bg-slate-700 text-slate-300 border-slate-600' },
  LOW: { label: 'Düşük', rank: 1, badge: 'bg-slate-800 text-slate-400 border-slate-700' },
};

const createDemoState = () => {
  const today = getTodayStr();
  return {
    isDemo: true,
    walletBalance: 24500,
    lastUpdated: new Date().toISOString(),
    debts: [
      {
        id: 'd-kmh-1',
        title: 'Vakıfbank KMH (Ek Hesap)',
        type: 'KMH',
        priority: 'CRITICAL',
        reminderDays: 3,
        monthlyInterestRate: 5.0,
        statementDay: 1,
        kmhLimit: 30000,
        note: 'Maaş hesabı ek limiti, ay sonu faiz tahakkuk eder.',
        installments: [
          {
            id: 'inst-kmh-1',
            seq: 1,
            periodLabel: 'Güncel Ek Hesap Kullanımı',
            dueDate: addMonthsToDateStr(today, 0).slice(0, 8) + String(new Date().getDate() + 2).padStart(2, '0'),
            baseAmount: 12000,
            lateInterest: 546,
            paidAmount: 0,
            paidDate: null,
          }
        ]
      },
      {
        id: 'd-loan-1',
        title: 'Akbank İhtiyaç Kredisi',
        type: 'LOAN',
        priority: 'HIGH',
        reminderDays: 5,
        monthlyInterestRate: 4.5,
        statementDay: 15,
        kmhLimit: 0,
        note: '12 Aylık ihtiyaç kredisi',
        installments: [
          {
            id: 'inst-ln-1',
            seq: 1,
            periodLabel: '1. Taksit',
            dueDate: addMonthsToDateStr(today, -1),
            baseAmount: 6250,
            lateInterest: 0,
            paidAmount: 6250,
            paidDate: addMonthsToDateStr(today, -1),
          },
          {
            id: 'inst-ln-2',
            seq: 2,
            periodLabel: '2. Taksit',
            dueDate: today,
            baseAmount: 6250,
            lateInterest: 0,
            paidAmount: 2000,
            paidDate: today,
          },
          {
            id: 'inst-ln-3',
            seq: 3,
            periodLabel: '3. Taksit',
            dueDate: addMonthsToDateStr(today, 1),
            baseAmount: 6250,
            lateInterest: 0,
            paidAmount: 0,
            paidDate: null,
          }
        ]
      },
      {
        id: 'd-bill-1',
        title: 'Türk Telekom Fiber İnternet',
        type: 'BILL',
        priority: 'NORMAL',
        reminderDays: 3,
        monthlyInterestRate: 3.5,
        statementDay: 20,
        kmhLimit: 0,
        note: 'Otomatik ödeme talimatı yok',
        installments: [
          {
            id: 'inst-bl-1',
            seq: 1,
            periodLabel: 'Bu Ayki Fatura',
            dueDate: addMonthsToDateStr(today, 0).slice(0, 8) + '01',
            baseAmount: 490,
            lateInterest: 0,
            paidAmount: 0,
            paidDate: null,
          }
        ]
      }
    ],
    transactions: [
      {
        id: 'tx-1',
        type: 'INCOME',
        category: 'Maaş / Gelir',
        title: 'Aylık Maaş Ödemesi',
        amount: 35000,
        date: today,
        affectWallet: true,
        linkedDebtId: null,
        linkedInstallmentId: null
      },
      {
        id: 'tx-2',
        type: 'DEBT_PAYMENT',
        category: 'Borç Ödemesi',
        title: 'Akbank İhtiyaç Kredisi (1. Taksit)',
        amount: 6250,
        date: addMonthsToDateStr(today, -1),
        affectWallet: true,
        linkedDebtId: 'd-loan-1',
        linkedInstallmentId: 'inst-ln-1'
      },
      {
        id: 'tx-3',
        type: 'DEBT_PAYMENT',
        category: 'Borç Ödemesi (Kısmi)',
        title: 'Akbank İhtiyaç Kredisi (2. Taksit)',
        amount: 2000,
        date: today,
        affectWallet: true,
        linkedDebtId: 'd-loan-1',
        linkedInstallmentId: 'inst-ln-2'
      },
      {
        id: 'tx-4',
        type: 'EXPENSE',
        category: 'Market & Gıda',
        title: 'Haftalık Market Alışverişi',
        amount: 2250,
        date: today,
        affectWallet: true,
        linkedDebtId: null,
        linkedInstallmentId: null
      }
    ]
  };
};

// ==========================================
// 4. TAKSIT DURUMU VE RENK MOTORU
// ==========================================
const evaluateInstallment = (inst, reminderDays, todayStr) => {
  const totalExpected = roundCurrency(inst.baseAmount + (inst.lateInterest || 0));
  const paid = roundCurrency(inst.paidAmount || 0);
  const remaining = roundCurrency(Math.max(0, totalExpected - paid));
  const daysLeft = diffDays(inst.dueDate, todayStr);

  if (remaining <= 0) {
    return {
      status: 'PAID',
      label: 'Ödendi',
      daysLeft,
      totalExpected,
      paid,
      remaining: 0,
      rowClass: 'border-emerald-500/40 bg-emerald-950/20',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      dotClass: 'bg-emerald-400',
    };
  }

  if (daysLeft < 0) {
    return {
      status: 'OVERDUE',
      label: paid > 0 ? `Gecikti (${Math.abs(daysLeft)}g) • Kısmi` : `${Math.abs(daysLeft)} Gün Gecikti`,
      daysLeft,
      totalExpected,
      paid,
      remaining,
      rowClass: 'border-rose-500/60 bg-rose-950/30',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      dotClass: 'bg-rose-500 animate-pulse',
    };
  }

  if (daysLeft <= reminderDays) {
    return {
      status: 'APPROACHING',
      label: daysLeft === 0 ? 'Son Gün Bugün!' : `${daysLeft} Gün Kaldı`,
      daysLeft,
      totalExpected,
      paid,
      remaining,
      rowClass: 'border-amber-500/60 bg-amber-950/30',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      dotClass: 'bg-amber-400',
    };
  }

  if (paid > 0) {
    return {
      status: 'PARTIAL',
      label: `Kısmi Ödendi (${daysLeft}g var)`,
      daysLeft,
      totalExpected,
      paid,
      remaining,
      rowClass: 'border-orange-500/40 bg-orange-950/20',
      badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      dotClass: 'bg-orange-400',
    };
  }

  return {
    status: 'UPCOMING',
    label: `${daysLeft} Gün Var`,
    daysLeft,
    totalExpected,
    paid,
    remaining,
    rowClass: 'border-slate-800 bg-slate-900/70',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
    dotClass: 'bg-slate-400',
  };
};

// ==========================================
// 5. ANDROID DOZE-MODE UYUMLU BILDIRIM MOTORU
// ==========================================
const syncAndroidNotifications = async (debts, todayStr) => {
  try {
    const cap = typeof window !== 'undefined' ? window.Capacitor : null;
    const LocalNotifications = cap?.Plugins?.LocalNotifications;

    if (LocalNotifications) {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') return { ok: false, mode: 'capacitor-denied' };

      // Doze Mode yüksek öncelikli kanal oluşturma
      if (LocalNotifications.createChannel) {
        await LocalNotifications.createChannel({
          id: 'finans_critical_channel',
          name: 'Kritik Borç ve Ödeme Hatırlatıcıları',
          description: 'Yaklaşan ve geciken ödemeler için yüksek öncelikli bildirimler',
          importance: 5,
          visibility: 1,
          vibration: true,
        });
      }

      // Mevcut bekleyen bildirimleri temizle
      const pending = await LocalNotifications.getPending();
      if (pending?.notifications?.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }

      const notificationsToSchedule = [];
      let notifId = 1000;

      debts.forEach((debt) => {
        debt.installments.forEach((inst) => {
          const ev = evaluateInstallment(inst, debt.reminderDays, todayStr);
          if (ev.remaining <= 0) return;

          // Hatırlatma gününün sabah 09:00'una alarm kur
          const [y, m, d] = inst.dueDate.split('-').map(Number);
          const reminderDate = new Date(y, m - 1, d - debt.reminderDays, 9, 0, 0);
          const dueMorning = new Date(y, m - 1, d, 9, 0, 0);
          const now = new Date();

          if (reminderDate > now) {
            notificationsToSchedule.push({
              id: notifId++,
              title: `Yaklaşan Ödeme: ${debt.title}`,
              body: `${inst.periodLabel} için ${debt.reminderDays} gün kaldı. Kalan tutar: ${formatCurrency(ev.remaining)}`,
              channelId: 'finans_critical_channel',
              schedule: { at: reminderDate, allowWhileIdle: true },
            });
          }

          if (dueMorning > now) {
            notificationsToSchedule.push({
              id: notifId++,
              title: `SON ÖDEME GÜNÜ: ${debt.title}`,
              body: `${inst.periodLabel} bugün ödenmeli! Tutar: ${formatCurrency(ev.remaining)}`,
              channelId: 'finans_critical_channel',
              schedule: { at: dueMorning, allowWhileIdle: true },
            });
          }
        });
      });

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
      }
      return { ok: true, mode: 'capacitor', count: notificationsToSchedule.length };
    }

    // Web Notification API Fallback
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      return { ok: Notification.permission === 'granted', mode: 'web' };
    }
  } catch (err) {
    console.warn('Bildirim senkronizasyon hatası:', err);
  }
  return { ok: false, mode: 'none' };
};

// ==========================================
// 6. ANA UYGULAMA BILESENI
// ==========================================
export default function App() {
  const [appState, setAppState] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('DEBTS'); // DEBTS | LEDGER | ALERTS | BACKUP
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('URGENT');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // Modallar
  const [selectedDebtId, setSelectedDebtId] = useState(null);
  const [showDebtFormModal, setShowDebtFormModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [showCashModal, setShowCashModal] = useState(null); // 'INCOME' | 'EXPENSE' | 'SET_BALANCE'
  const [paymentModalData, setPaymentModalData] = useState(null); // { debt, installment }
  const [interestModalData, setInterestModalData] = useState(null); // { debt, installment }
  const [newPeriodModalDebt, setNewPeriodModalDebt] = useState(null);
  const [editInstModalData, setEditInstModalData] = useState(null); // { debtId, installment }
  const [showCleanStartModal, setShowCleanStartModal] = useState(false);
  const [toast, setToast] = useState(null);

  const todayStr = getTodayStr();
  const fileInputRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // İlk Yükleme (IndexedDB -> LocalStorage -> Demo)
  useEffect(() => {
    let mounted = true;
    loadStateDualLayer().then((loaded) => {
      if (!mounted) return;
      if (loaded && Array.isArray(loaded.debts)) {
        setAppState(loaded);
      } else {
        const initial = createDemoState();
        setAppState(initial);
        saveStateDualLayer(initial);
      }
      setIsLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  // Her state değişiminde Çift Katmanlı Kayıt + Bildirim Senkronizasyonu
  useEffect(() => {
    if (!isLoaded || !appState) return;
    saveStateDualLayer(appState);
    syncAndroidNotifications(appState.debts, todayStr);
  }, [appState, isLoaded, todayStr]);

  // ==========================================
  // HESAPLANMIS BORC LISTESI VE OZETLER
  // ==========================================
  const enrichedDebts = useMemo(() => {
    if (!appState) return [];
    return appState.debts.map((debt) => {
      const evaluatedInstallments = debt.installments.map((inst) => ({
        ...inst,
        eval: evaluateInstallment(inst, debt.reminderDays, todayStr),
      }));

      const totalDebt = roundCurrency(
        evaluatedInstallments.reduce((sum, i) => sum + i.eval.totalExpected, 0)
      );
      const totalPaid = roundCurrency(
        evaluatedInstallments.reduce((sum, i) => sum + i.eval.paid, 0)
      );
      const totalRemaining = roundCurrency(
        evaluatedInstallments.reduce((sum, i) => sum + i.eval.remaining, 0)
      );

      // Ödenmemiş ilk taksit = Aktif Dönem
      const unpaidList = evaluatedInstallments
        .filter((i) => i.eval.remaining > 0)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

      const activeInst = unpaidList[0] || evaluatedInstallments[evaluatedInstallments.length - 1];
      const overallStatus = activeInst ? activeInst.eval.status : 'PAID';

      return {
        ...debt,
        installments: evaluatedInstallments,
        totalDebt,
        totalPaid,
        totalRemaining,
        activeInst,
        overallStatus,
      };
    });
  }, [appState, todayStr]);

  const dashboardStats = useMemo(() => {
    let totalRemainingAll = 0;
    let totalPaidAll = 0;
    let overdueAmount = 0;
    let overdueCount = 0;
    let approachingAmount = 0;
    let approachingCount = 0;

    enrichedDebts.forEach((d) => {
      totalRemainingAll = roundCurrency(totalRemainingAll + d.totalRemaining);
      totalPaidAll = roundCurrency(totalPaidAll + d.totalPaid);
      d.installments.forEach((inst) => {
        if (inst.eval.status === 'OVERDUE') {
          overdueAmount = roundCurrency(overdueAmount + inst.eval.remaining);
          overdueCount++;
        } else if (inst.eval.status === 'APPROACHING') {
          approachingAmount = roundCurrency(approachingAmount + inst.eval.remaining);
          approachingCount++;
        }
      });
    });

    const totalIncome = roundCurrency(
      (appState?.transactions || [])
        .filter((t) => t.type === 'INCOME')
        .reduce((s, t) => s + t.amount, 0)
    );
    const totalOutflow = roundCurrency(
      (appState?.transactions || [])
        .filter((t) => t.type === 'EXPENSE' || t.type === 'DEBT_PAYMENT')
        .reduce((s, t) => s + t.amount, 0)
    );

    return {
      totalRemainingAll,
      totalPaidAll,
      overdueAmount,
      overdueCount,
      approachingAmount,
      approachingCount,
      totalIncome,
      totalOutflow,
    };
  }, [enrichedDebts, appState]);

  const filteredAndSortedDebts = useMemo(() => {
    return enrichedDebts
      .filter((d) => (typeFilter === 'ALL' ? true : d.type === typeFilter))
      .filter((d) => {
        if (statusFilter === 'ALL') return true;
        if (statusFilter === 'OVERDUE') return d.installments.some((i) => i.eval.status === 'OVERDUE');
        if (statusFilter === 'APPROACHING') return d.installments.some((i) => i.eval.status === 'APPROACHING');
        if (statusFilter === 'PARTIAL') return d.installments.some((i) => i.eval.paid > 0 && i.eval.remaining > 0);
        if (statusFilter === 'PAID') return d.totalRemaining <= 0;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'URGENT') {
          const aPaid = a.totalRemaining <= 0 ? 1 : 0;
          const bPaid = b.totalRemaining <= 0 ? 1 : 0;
          if (aPaid !== bPaid) return aPaid - bPaid;
          return (a.activeInst?.eval.daysLeft ?? 9999) - (b.activeInst?.eval.daysLeft ?? 9999);
        }
        if (sortBy === 'PRIORITY') {
          return (PRIORITIES[b.priority]?.rank || 0) - (PRIORITIES[a.priority]?.rank || 0);
        }
        if (sortBy === 'AMOUNT_DESC') {
          return b.totalRemaining - a.totalRemaining;
        }
        return 0;
      });
  }, [enrichedDebts, typeFilter, statusFilter, sortBy]);

  const selectedDebt = useMemo(
    () => enrichedDebts.find((d) => d.id === selectedDebtId) || null,
    [enrichedDebts, selectedDebtId]
  );

  // ==========================================
  // AKSİYONLAR (CRUD + UNDO + TEMİZ BAŞLANGIÇ)
  // ==========================================

  // 1. Gelir / Harcama / Bakiye Kalibrasyonu
  const handleAddCashTransaction = (form) => {
    const amount = roundCurrency(form.amount);
    if (amount < 0 || (form.mode !== 'SET_BALANCE' && amount <= 0)) return;

    setAppState((prev) => {
      if (form.mode === 'SET_BALANCE') {
        const diff = roundCurrency(amount - prev.walletBalance);
        const adjustmentTx = {
          id: `tx-${Date.now()}`,
          type: diff >= 0 ? 'INCOME' : 'EXPENSE',
          category: 'Bakiye Kalibrasyonu',
          title: 'Cüzdan Bakiyesi Manuel Eşitleme',
          amount: Math.abs(diff),
          date: form.date || todayStr,
          affectWallet: true,
          linkedDebtId: null,
          linkedInstallmentId: null,
        };
        return {
          ...prev,
          walletBalance: amount,
          transactions: diff !== 0 ? [adjustmentTx, ...prev.transactions] : prev.transactions,
        };
      }

      const isIncome = form.mode === 'INCOME';
      const newBalance = isIncome
        ? roundCurrency(prev.walletBalance + amount)
        : roundCurrency(prev.walletBalance - amount);

      const newTx = {
        id: `tx-${Date.now()}`,
        type: isIncome ? 'INCOME' : 'EXPENSE',
        category: form.category || (isIncome ? 'Gelir' : 'Genel Harcama'),
        title: form.title.trim() || (isIncome ? 'Ek Gelir' : 'Market / Harcama'),
        amount,
        date: form.date || todayStr,
        affectWallet: true,
        linkedDebtId: null,
        linkedInstallmentId: null,
      };

      return {
        ...prev,
        walletBalance: newBalance,
        transactions: [newTx, ...prev.transactions],
      };
    });

    setShowCashModal(null);
    showToast('Cüzdan bakiyesi ve hareket defteri güncellendi.');
  };

  // 2. Hareketi Geri Al (Undo) - Taksit ve Cüzdanı Otomatik Düzeltir
  const handleUndoTransaction = (tx) => {
    if (!window.confirm(`"${tx.title}" (${formatCurrency(tx.amount)}) işlemini iptal etmek istiyor musunuz? Bakiye ve bağlı taksit otomatik eski haline dönecektir.`)) {
      return;
    }

    setAppState((prev) => {
      let updatedWallet = prev.walletBalance;
      if (tx.affectWallet) {
        if (tx.type === 'INCOME') {
          updatedWallet = roundCurrency(updatedWallet - tx.amount);
        } else {
          updatedWallet = roundCurrency(updatedWallet + tx.amount);
        }
      }

      let updatedDebts = prev.debts;
      if (tx.type === 'DEBT_PAYMENT' && tx.linkedDebtId && tx.linkedInstallmentId) {
        updatedDebts = prev.debts.map((debt) => {
          if (debt.id !== tx.linkedDebtId) return debt;
          return {
            ...debt,
            installments: debt.installments.map((inst) => {
              if (inst.id !== tx.linkedInstallmentId) return inst;
              const revertedPaid = roundCurrency(Math.max(0, (inst.paidAmount || 0) - tx.amount));
              return {
                ...inst,
                paidAmount: revertedPaid,
                paidDate: revertedPaid > 0 ? inst.paidDate : null,
              };
            }),
          };
        });
      }

      return {
        ...prev,
        walletBalance: updatedWallet,
        debts: updatedDebts,
        transactions: prev.transactions.filter((item) => item.id !== tx.id),
      };
    });

    showToast('İşlem geri alındı, bakiye ve borç durumu düzeltildi.', 'info');
  };

  // 3. Taksit Ödemesini Sıfırla (Borç Detay Ekranından Doğrudan)
  const handleResetInstallmentPayment = (debtId, inst) => {
    const paid = roundCurrency(inst.paidAmount || 0);
    if (paid <= 0) return;

    if (!window.confirm(`${inst.periodLabel} için yapılan ${formatCurrency(paid)} ödemeyi geri almak ve tutarı cüzdan bakiyenize iade etmek istiyor musunuz?`)) {
      return;
    }

    setAppState((prev) => {
      const updatedDebts = prev.debts.map((d) => {
        if (d.id !== debtId) return d;
        return {
          ...d,
          installments: d.installments.map((i) =>
            i.id === inst.id ? { ...i, paidAmount: 0, paidDate: null } : i
          ),
        };
      });

      // İlgili taksite bağlı ödemeleri bul ve cüzdana iade et
      const linkedTxs = prev.transactions.filter(
        (t) => t.linkedDebtId === debtId && t.linkedInstallmentId === inst.id
      );
      const walletRefund = roundCurrency(
        linkedTxs.filter((t) => t.affectWallet).reduce((s, t) => s + t.amount, 0)
      );

      return {
        ...prev,
        walletBalance: roundCurrency(prev.walletBalance + (walletRefund || paid)),
        debts: updatedDebts,
        transactions: prev.transactions.filter(
          (t) => !(t.linkedDebtId === debtId && t.linkedInstallmentId === inst.id)
        ),
      };
    });

    showToast('Ödeme sıfırlandı ve tutar cüzdanınıza iade edildi.', 'info');
  };

  // 4. Taksit Ödeme İşlemi
  const handlePayInstallment = ({ debt, installment, payAmount, deductFromWallet, paymentDate }) => {
    const amount = roundCurrency(payAmount);
    if (amount <= 0) return;

    setAppState((prev) => {
      const updatedDebts = prev.debts.map((d) => {
        if (d.id !== debt.id) return d;
        return {
          ...d,
          installments: d.installments.map((inst) => {
            if (inst.id !== installment.id) return inst;
            return {
              ...inst,
              paidAmount: roundCurrency((inst.paidAmount || 0) + amount),
              paidDate: paymentDate || todayStr,
            };
          }),
        };
      });

      const newWallet = deductFromWallet
        ? roundCurrency(prev.walletBalance - amount)
        : prev.walletBalance;

      const newTx = {
        id: `tx-${Date.now()}`,
        type: 'DEBT_PAYMENT',
        category: `${DEBT_TYPES[debt.type]?.short || 'Borç'} Ödemesi`,
        title: `${debt.title} (${installment.periodLabel})`,
        amount,
        date: paymentDate || todayStr,
        affectWallet: deductFromWallet,
        linkedDebtId: debt.id,
        linkedInstallmentId: installment.id,
      };

      return {
        ...prev,
        walletBalance: newWallet,
        debts: updatedDebts,
        transactions: [newTx, ...prev.transactions],
      };
    });

    setPaymentModalData(null);
    showToast('Ödeme başarıyla işlendi.');
  };

  // 5. Gecikme / KMH Faizi İşleme
  const handleApplyInterest = ({ debtId, installmentId, finalInterestAmount, mode }) => {
    const amount = roundCurrency(finalInterestAmount);
    if (amount < 0) return;

    setAppState((prev) => ({
      ...prev,
      debts: prev.debts.map((d) => {
        if (d.id !== debtId) return d;
        return {
          ...d,
          installments: d.installments.map((inst) => {
            if (inst.id !== installmentId) return inst;
            const updatedInterest =
              mode === 'ADD'
                ? roundCurrency((inst.lateInterest || 0) + amount)
                : amount;
            return { ...inst, lateInterest: updatedInterest };
          }),
        };
      }),
    }));

    setInterestModalData(null);
    showToast('Faiz / gecikme tutarı taksite işlendi.');
  };

  // 6. Yeni Borç Ekle veya Mevcut Borcu Düzenle
  const handleSaveDebt = (form) => {
    if (editingDebt) {
      // Mevcut borç üst bilgilerini güncelle
      setAppState((prev) => ({
        ...prev,
        debts: prev.debts.map((d) =>
          d.id === editingDebt.id
            ? {
                ...d,
                title: form.title.trim(),
                type: form.type,
                priority: form.priority,
                reminderDays: Number(form.reminderDays) || 3,
                monthlyInterestRate: roundCurrency(form.monthlyInterestRate),
                statementDay: Number(form.statementDay) || 1,
                kmhLimit: roundCurrency(form.kmhLimit || 0),
                note: form.note || '',
              }
            : d
        ),
      }));
      setEditingDebt(null);
      setShowDebtFormModal(false);
      showToast('Borç bilgileri güncellendi.');
      return;
    }

    // Yeni borç oluştur
    const count = Math.max(1, parseInt(form.installmentCount, 10) || 1);
    const totalInput = roundCurrency(form.amount);
    const perInstallment =
      form.amountMode === 'TOTAL_DIVIDED'
        ? roundCurrency(totalInput / count)
        : totalInput;

    const installments = Array.from({ length: count }, (_, idx) => {
      // Son taksitte kuruş farkını dengele
      const isLast = idx === count - 1 && form.amountMode === 'TOTAL_DIVIDED';
      const baseAmt = isLast
        ? roundCurrency(totalInput - perInstallment * (count - 1))
        : perInstallment;

      return {
        id: `inst-${Date.now()}-${idx}`,
        seq: idx + 1,
        periodLabel:
          form.type === 'LOAN' || count > 1
            ? `${idx + 1}. Taksit`
            : form.type === 'KMH'
            ? 'KMH Dönem Bakiyesi'
            : '1. Dönem / Ekstre',
        dueDate: addMonthsToDateStr(form.firstDueDate, idx),
        baseAmount: baseAmt,
        lateInterest: 0,
        paidAmount: 0,
        paidDate: null,
      };
    });

    const newDebt = {
      id: `debt-${Date.now()}`,
      title: form.title.trim(),
      type: form.type,
      priority: form.priority,
      reminderDays: Number(form.reminderDays) || 3,
      monthlyInterestRate: roundCurrency(form.monthlyInterestRate),
      statementDay: Number(form.statementDay) || 1,
      kmhLimit: roundCurrency(form.kmhLimit || 0),
      note: form.note || '',
      installments,
    };

    setAppState((prev) => ({
      ...prev,
      debts: [newDebt, ...prev.debts],
    }));

    setShowDebtFormModal(false);
    showToast('Yeni borç planı oluşturuldu.');
  };

  // 7. Döngüsel Borçlara (Fatura, K.Kartı, KMH) Yeni Dönem / Ekstre Ekle
  const handleAddRecurringPeriod = ({ debtId, periodLabel, dueDate, baseAmount }) => {
    const amt = roundCurrency(baseAmount);
    if (amt <= 0 || !dueDate) return;

    setAppState((prev) => ({
      ...prev,
      debts: prev.debts.map((d) => {
        if (d.id !== debtId) return d;
        const nextSeq = d.installments.length + 1;
        const newInst = {
          id: `inst-${Date.now()}`,
          seq: nextSeq,
          periodLabel: periodLabel.trim() || `${nextSeq}. Dönem Ekstresi`,
          dueDate,
          baseAmount: amt,
          lateInterest: 0,
          paidAmount: 0,
          paidDate: null,
        };
        return {
          ...d,
          installments: [...d.installments, newInst],
        };
      }),
    }));

    setNewPeriodModalDebt(null);
    showToast('Yeni dönem / ekstre başarıyla eklendi.');
  };

  // 8. Tekil Taksit Tarih / Tutar Düzenleme
  const handleSaveInstallmentEdit = ({ debtId, installmentId, periodLabel, dueDate, baseAmount, lateInterest }) => {
    setAppState((prev) => ({
      ...prev,
      debts: prev.debts.map((d) => {
        if (d.id !== debtId) return d;
        return {
          ...d,
          installments: d.installments.map((inst) =>
            inst.id === installmentId
              ? {
                  ...inst,
                  periodLabel: periodLabel.trim() || inst.periodLabel,
                  dueDate,
                  baseAmount: roundCurrency(baseAmount),
                  lateInterest: roundCurrency(lateInterest),
                }
              : inst
          ),
        };
      }),
    }));
    setEditInstModalData(null);
    showToast('Dönem / taksit detayları güncellendi.');
  };

  // 9. Borcu Tamamen Sil
  const handleDeleteDebt = (debtId) => {
    if (!window.confirm('Bu borç kaydını ve tüm ödeme planını silmek istediğinize emin misiniz?')) return;
    setAppState((prev) => ({
      ...prev,
      debts: prev.debts.filter((d) => d.id !== debtId),
    }));
    setSelectedDebtId(null);
    showToast('Borç kaydı silindi.', 'info');
  };

  // 10. Canlıya Geçiş: Demo Verilerini Temizle ve Sıfırdan Başla
  const handleCleanStart = (initialWallet) => {
    const startBal = roundCurrency(initialWallet);
    const freshState = {
      isDemo: false,
      walletBalance: startBal,
      lastUpdated: new Date().toISOString(),
      debts: [],
      transactions:
        startBal > 0
          ? [
              {
                id: `tx-init-${Date.now()}`,
                type: 'INCOME',
                category: 'Açılış Bakiyesi',
                title: 'Cüzdan Başlangıç Bakiyesi',
                amount: startBal,
                date: todayStr,
                affectWallet: true,
                linkedDebtId: null,
                linkedInstallmentId: null,
              },
            ]
          : [],
    };
    setAppState(freshState);
    saveStateDualLayer(freshState);
    setShowCleanStartModal(false);
    setSelectedDebtId(null);
    showToast('Tüm demo verileri temizlendi! Gerçek verilerinizle başlayabilirsiniz.');
  };

  // 11. JSON Yedek İndir / Geri Yükle
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(appState, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FinansERP_Yedek_${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Yedek dosyası indirildi.');
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed || !Array.isArray(parsed.debts)) {
          throw new Error('Geçersiz yedek formatı');
        }
        setAppState(parsed);
        saveStateDualLayer(parsed);
        showToast('Yedek başarıyla geri yüklendi!');
      } catch (err) {
        showToast('Hata: Geçersiz JSON yedek dosyası!', 'error');
      }
    };
    reader.readAsText(file);
  };

  if (!isLoaded || !appState) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
          <p className="text-sm text-slate-400">Veritabanı yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Bildirim / Uyarı Listesi (Geciken ve Yaklaşanlar)
  const alertInstallments = [];
  enrichedDebts.forEach((d) => {
    d.installments.forEach((inst) => {
      if (inst.eval.status === 'OVERDUE' || inst.eval.status === 'APPROACHING') {
        alertInstallments.push({ debt: d, inst });
      }
    });
  });
  alertInstallments.sort((a, b) => a.inst.eval.daysLeft - b.inst.eval.daysLeft);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 font-sans selection:bg-indigo-500/30">
      {/* ÜST BİLDİRİM TOAST */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[92%] px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2.5 text-sm font-medium bg-slate-900/95 backdrop-blur border-indigo-500/40 text-slate-100">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ÜST BAŞLIK VE DEMO TEMİZLEME BARI */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">FinansERP</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                  PRO • CANLI
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Bugün: {formatDateTR(todayStr)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {appState.isDemo && (
              <button
                onClick={() => setShowCleanStartModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-medium transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sıfırdan Başla</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('ALERTS')}
              className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            >
              <Bell className="w-5 h-5" />
              {alertInstallments.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {alertInstallments.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* CÜZDAN VE NAKİT AKIŞI KARTI */}
        <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-800 p-4 shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Mevcut Cüzdan Bakiyesi</span>
                <button
                  onClick={() => setShowCashModal('SET_BALANCE')}
                  className="text-indigo-400 hover:text-indigo-300 underline text-[11px]"
                >
                  (Eşitle)
                </button>
              </div>
              <div
                className={`text-2xl sm:text-3xl font-extrabold mt-0.5 tracking-tight ${
                  appState.walletBalance < 0 ? 'text-rose-400' : 'text-white'
                }`}
              >
                {formatCurrency(appState.walletBalance)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCashModal('INCOME')}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>+ Gelir</span>
              </button>
              <button
                onClick={() => setShowCashModal('EXPENSE')}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>- Harcama</span>
              </button>
            </div>
          </div>

          {/* 4'lü Finansal Özet Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-slate-800/80">
            <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/70">
              <div className="text-[11px] text-slate-400">Toplam Kalan Borç</div>
              <div className="text-sm font-bold text-slate-100 mt-0.5">
                {formatCurrency(dashboardStats.totalRemainingAll)}
              </div>
            </div>
            <div className="bg-emerald-950/25 rounded-xl p-2.5 border border-emerald-500/25">
              <div className="text-[11px] text-emerald-300/80">Ödenen Borçlar</div>
              <div className="text-sm font-bold text-emerald-300 mt-0.5">
                {formatCurrency(dashboardStats.totalPaidAll)}
              </div>
            </div>
            <div className="bg-amber-950/25 rounded-xl p-2.5 border border-amber-500/25">
              <div className="text-[11px] text-amber-300/80">
                Yaklaşan ({dashboardStats.approachingCount})
              </div>
              <div className="text-sm font-bold text-amber-300 mt-0.5">
                {formatCurrency(dashboardStats.approachingAmount)}
              </div>
            </div>
            <div className="bg-rose-950/30 rounded-xl p-2.5 border border-rose-500/30">
              <div className="text-[11px] text-rose-300/80">
                Geciken ({dashboardStats.overdueCount})
              </div>
              <div className="text-sm font-bold text-rose-400 mt-0.5">
                {formatCurrency(dashboardStats.overdueAmount)}
              </div>
            </div>
          </div>
        </section>

        {/* SEKME İÇERİKLERİ */}
        {activeTab === 'DEBTS' && (
          <section className="space-y-3">
            {/* Üst Kategori Barı ve + Yeni Borç */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: 'ALL', label: 'Tümü' },
                  { key: 'LOAN', label: 'Kredi' },
                  { key: 'CREDIT_CARD', label: 'K.Kartı' },
                  { key: 'KMH', label: 'KMH' },
                  { key: 'BILL', label: 'Fatura' },
                  { key: 'PERSONAL', label: 'Elden' },
                ].map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setTypeFilter(cat.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                      typeFilter === cat.key
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/25'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setEditingDebt(null);
                  setShowDebtFormModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Borç</span>
              </button>
            </div>

            {/* YENİ TASARIM: SCROLLBARSIZ TEMİZ DURUM VE SIRALAMA BARI */}
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: 'Tümü', dot: 'bg-slate-400' },
                  { id: 'OVERDUE', label: 'Geciken', dot: 'bg-rose-500' },
                  { id: 'APPROACHING', label: 'Yaklaşan', dot: 'bg-amber-400' },
                  { id: 'PARTIAL', label: 'Kısmi', dot: 'bg-orange-400' },
                  { id: 'PAID', label: 'Ödenen', dot: 'bg-emerald-400' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setStatusFilter(st.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition border ${
                      statusFilter === st.id
                        ? 'bg-slate-800 text-white border-slate-600 shadow-sm'
                        : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                    <span>{st.label}</span>
                  </button>
                ))}
              </div>

              {/* Özel Tasarımlı Açılır Sıralama Menüsü */}
              <div className="relative self-end sm:self-auto">
                <button
                  onClick={() => setSortMenuOpen((o) => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-slate-200 hover:border-slate-700"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    {sortBy === 'URGENT' && 'Tarihe Göre (Acil)'}
                    {sortBy === 'PRIORITY' && 'Önem Derecesi'}
                    {sortBy === 'AMOUNT_DESC' && 'Tutar (Yüksekten)'}
                  </span>
                </button>

                {sortMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1 z-20">
                    {[
                      { id: 'URGENT', label: 'Tarihe Göre (Acil)' },
                      { id: 'PRIORITY', label: 'Önem Derecesine Göre' },
                      { id: 'AMOUNT_DESC', label: 'Kalan Tutar (Azalan)' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setSortBy(opt.id);
                          setSortMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs transition ${
                          sortBy === opt.id
                            ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* BORÇ LİSTESİ */}
            {filteredAndSortedDebts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center space-y-3">
                <Wallet className="w-10 h-10 text-slate-600 mx-auto" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Kayıtlı Borç Bulunamadı</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Yeni bir kredi, kredi kartı, KMH, fatura veya elden borç ekleyerek takibe başlayın.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingDebt(null);
                    setShowDebtFormModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                  <span>İlk Borcu Ekle</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredAndSortedDebts.map((debt) => {
                  const typeMeta = DEBT_TYPES[debt.type] || DEBT_TYPES.LOAN;
                  const TypeIcon = typeMeta.icon;
                  const activeEv = debt.activeInst?.eval;
                  const prio = PRIORITIES[debt.priority] || PRIORITIES.NORMAL;

                  return (
                    <div
                      key={debt.id}
                      onClick={() => setSelectedDebtId(debt.id)}
                      className={`group cursor-pointer rounded-2xl border p-3.5 transition-all hover:scale-[1.005] ${
                        activeEv ? activeEv.rowClass : 'border-slate-800 bg-slate-900/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-xl border ${typeMeta.bg} ${typeMeta.border}`}>
                            <TypeIcon className={`w-5 h-5 ${typeMeta.color}`} />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
                                {debt.title}
                              </h3>
                              <span className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${prio.badge}`}>
                                {prio.label}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                              <span>{typeMeta.label}</span>
                              <span>•</span>
                              <span>
                                {debt.activeInst
                                  ? `${debt.activeInst.periodLabel}: ${formatDateTR(debt.activeInst.dueDate)}`
                                  : 'Tamamlandı'}
                              </span>
                              {debt.type === 'KMH' && debt.kmhLimit > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-300">
                                    Limit: {formatCurrency(debt.kmhLimit)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {activeEv && (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${activeEv.badgeClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${activeEv.dotClass}`} />
                              {activeEv.label}
                            </span>
                          )}
                          <div className="text-right mt-1">
                            <div className="text-[11px] text-slate-400">
                              Beklenen Dönem / Kalan Toplam
                            </div>
                            <div className="text-sm font-extrabold text-white">
                              {activeEv ? formatCurrency(activeEv.remaining) : formatCurrency(0)}
                              <span className="text-xs font-normal text-slate-400">
                                {' '}
                                / {formatCurrency(debt.totalRemaining)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* HAREKET DEFTERİ VE GERİ ALMA (UNDO) SEKME İÇERİĞİ */}
        {activeTab === 'LEDGER' && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Cüzdan & Muhasebe Defteri</h2>
                <p className="text-xs text-slate-400">
                  Yanlış girilen gelir, harcama veya taksit ödemesini "Geri Al" ile iptal edebilirsiniz.
                </p>
              </div>
            </div>

            {appState.transactions.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center text-xs text-slate-400">
                Henüz kayıtlı bir finansal hareket bulunmuyor.
              </div>
            ) : (
              <div className="space-y-2">
                {appState.transactions.map((tx) => {
                  const isIncome = tx.type === 'INCOME';
                  return (
                    <div
                      key={tx.id}
                      className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-xl border ${
                            isIncome
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          }`}
                        >
                          {isIncome ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{tx.title}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span>{tx.category}</span>
                            <span>•</span>
                            <span>{formatDateTR(tx.date)}</span>
                            {!tx.affectWallet && (
                              <span className="text-amber-300">(Cüzdan Dışı)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div
                          className={`text-sm font-bold ${
                            isIncome ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isIncome ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </div>
                        <button
                          onClick={() => handleUndoTransaction(tx)}
                          title="İşlemi Geri Al (İptal Et)"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Geri Al</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* BİLDİRİM VE ALARM MERKEZİ */}
        {activeTab === 'ALERTS' && (
          <section className="space-y-3">
            <div className="rounded-2xl bg-indigo-950/30 border border-indigo-500/30 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <h3 className="text-xs font-bold text-indigo-200">
                    Android Arka Plan Bildirim Servisi Aktif
                  </h3>
                  <p className="text-[11px] text-indigo-300/80">
                    Uygulama kapalıyken bile her borcun hatırlatma gününde sabah 09:00'da (Doze-Mode uyumlu) telefonunuza bildirim gönderilir.
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  const res = await syncAndroidNotifications(appState.debts, todayStr);
                  showToast(
                    res.ok
                      ? 'Bildirim kanalları ve alarmlar senkronize edildi.'
                      : 'Tarayıcı/Cihaz bildirim izni bekleniyor.'
                  );
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold shrink-0"
              >
                Şimdi Eşitle
              </button>
            </div>

            {alertInstallments.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center text-xs text-slate-400">
                Harika! Geciken veya hatırlatma süresine girmiş acil bir ödemeniz bulunmuyor.
              </div>
            ) : (
              <div className="space-y-2">
                {alertInstallments.map(({ debt, inst }) => (
                  <div
                    key={inst.id}
                    onClick={() => setSelectedDebtId(debt.id)}
                    className={`cursor-pointer rounded-2xl border p-3.5 flex items-center justify-between ${inst.eval.rowClass}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${inst.eval.badgeClass}`}>
                          {inst.eval.label}
                        </span>
                        <span className="text-sm font-bold text-white">{debt.title}</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        {inst.periodLabel} • Son Ödeme: {formatDateTR(inst.dueDate)} (Hatırlatma: {debt.reminderDays} gün kala)
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-white">
                        {formatCurrency(inst.eval.remaining)}
                      </div>
                      <span className="text-[11px] text-indigo-300 underline">Detay & Öde</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* VERİ GÜVENLİĞİ, YEDEKLEME VE SIFIRLAMA SEKME İÇERİĞİ */}
        {activeTab === 'BACKUP' && (
          <section className="space-y-3">
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Çift Katmanlı Kalıcı Veritabanı (IndexedDB + LocalStorage)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Verileriniz hem tarayıcı önbelleğinde hem de kalıcı IndexedDB veritabanında eşzamanlı saklanır.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <button
                  onClick={handleExportJSON}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
                >
                  <Download className="w-4 h-4" />
                  <span>JSON Yedeği Telefonuma İndir</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition"
                >
                  <Upload className="w-4 h-4" />
                  <span>Yedek Dosyasından Geri Yükle</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-rose-950/20 border border-rose-500/30 p-4 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-rose-300">
                  Temiz Başlangıç / Tüm Verileri Sıfırla
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Demo kayıtlarını veya mevcut tüm verileri silip kendi gerçek cüzdan bakiyenizle sıfırdan başlayın.
                </p>
              </div>
              <button
                onClick={() => setShowCleanStartModal(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shrink-0"
              >
                Sıfırdan Başla
              </button>
            </div>
          </section>
        )}
      </main>

      {/* ALT GEZİNME ÇUBUĞU */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-2 py-2">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          {[
            { id: 'DEBTS', label: 'Borçlarım', icon: Wallet },
            { id: 'LEDGER', label: 'Hareketler', icon: History },
            { id: 'ALERTS', label: 'Bildirimler', icon: Bell, badge: alertInstallments.length },
            { id: 'BACKUP', label: 'Veri & Yedek', icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-semibold transition ${
                  active ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <span className="absolute top-1 right-6 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ==========================================
          MODAL 1: BORÇ DETAY, ÖDEME PLANI VE DÖNEM EKLEME
      ========================================== */}
      {selectedDebt && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-indigo-400 font-semibold">
                  {DEBT_TYPES[selectedDebt.type]?.label} • Hatırlatma: {selectedDebt.reminderDays} gün kala
                </span>
                <h2 className="text-base font-bold text-white">{selectedDebt.title}</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setEditingDebt(selectedDebt);
                    setShowDebtFormModal(true);
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
                  title="Borç Bilgilerini Düzenle"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteDebt(selectedDebt.id)}
                  className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300"
                  title="Borcu Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedDebtId(null)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              {/* Özet Barı */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
                <div>
                  <div className="text-[11px] text-slate-400">Toplam Yük</div>
                  <div className="text-xs font-bold text-white mt-0.5">
                    {formatCurrency(selectedDebt.totalDebt)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-emerald-400">Ödenen</div>
                  <div className="text-xs font-bold text-emerald-300 mt-0.5">
                    {formatCurrency(selectedDebt.totalPaid)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-rose-400">Kalan Borç</div>
                  <div className="text-xs font-bold text-rose-300 mt-0.5">
                    {formatCurrency(selectedDebt.totalRemaining)}
                  </div>
                </div>
              </div>

              {/* Döngüsel Borçlar İçin Yeni Dönem / Ekstre Ekleme Butonu */}
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Ödeme Planı & Dönemler ({selectedDebt.installments.length})
                </h3>
                <button
                  onClick={() => setNewPeriodModalDebt(selectedDebt)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni Dönem / Ekstre Ekle</span>
                </button>
              </div>

              {/* Taksit Satırları */}
              <div className="space-y-2.5">
                {selectedDebt.installments.map((inst) => {
                  const ev = inst.eval;
                  return (
                    <div
                      key={inst.id}
                      className={`rounded-2xl border p-3.5 space-y-2.5 ${ev.rowClass}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              {inst.periodLabel}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ev.badgeClass}`}>
                              {ev.label}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-300 mt-0.5">
                            Son Ödeme: {formatDateTR(inst.dueDate)}
                            {inst.paidDate && ` • Ödeme Tarihi: ${formatDateTR(inst.paidDate)}`}
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            setEditInstModalData({ debtId: selectedDebt.id, installment: inst })
                          }
                          className="text-[11px] text-slate-400 hover:text-white underline"
                        >
                          Düzenle
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Anapara / Tutar</span>
                          <span className="font-semibold text-slate-200">
                            {formatCurrency(inst.baseAmount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-300 block">Gecikme / KMH Faizi</span>
                          <span className="font-semibold text-amber-300">
                            {formatCurrency(inst.lateInterest || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-300 block">Kalan Net</span>
                          <span className="font-bold text-white">
                            {formatCurrency(ev.remaining)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        {inst.paidAmount > 0 && (
                          <button
                            onClick={() => handleResetInstallmentPayment(selectedDebt.id, inst)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-xs font-medium border border-slate-700"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Ödemeyi Geri Al ({formatCurrency(inst.paidAmount)})</span>
                          </button>
                        )}

                        {ev.remaining > 0 && (
                          <>
                            <button
                              onClick={() =>
                                setInterestModalData({ debt: selectedDebt, installment: inst })
                              }
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                              <span>
                                {selectedDebt.type === 'KMH' ? 'KMH Faizi İşle' : 'Gecikme Faizi İşle'}
                              </span>
                            </button>

                            <button
                              onClick={() =>
                                setPaymentModalData({ debt: selectedDebt, installment: inst })
                              }
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Ödeme Yap</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 2: ÖDEME YAPMA MODALI
      ========================================== */}
      {paymentModalData && (
        <PaymentModal
          data={paymentModalData}
          todayStr={todayStr}
          walletBalance={appState.walletBalance}
          onClose={() => setPaymentModalData(null)}
          onConfirm={handlePayInstallment}
        />
      )}

      {/* ==========================================
          MODAL 3: FAİZ VE VERGİ (KKDF+BSMV) HESAPLAMA MODALI
      ========================================== */}
      {interestModalData && (
        <InterestCalculatorModal
          data={interestModalData}
          todayStr={todayStr}
          onClose={() => setInterestModalData(null)}
          onConfirm={handleApplyInterest}
        />
      )}

      {/* ==========================================
          MODAL 4: YENİ BORÇ EKLE / DÜZENLE MODALI
      ========================================== */}
      {showDebtFormModal && (
        <DebtFormModal
          editingDebt={editingDebt}
          todayStr={todayStr}
          onClose={() => {
            setShowDebtFormModal(false);
            setEditingDebt(null);
          }}
          onSave={handleSaveDebt}
        />
      )}

      {/* ==========================================
          MODAL 5: GELİR / HARCAMA / BAKİYE KALİBRASYON MODALI
      ========================================== */}
      {showCashModal && (
        <CashModal
          mode={showCashModal}
          currentBalance={appState.walletBalance}
          todayStr={todayStr}
          onClose={() => setShowCashModal(null)}
          onSave={handleAddCashTransaction}
        />
      )}

      {/* ==========================================
          MODAL 6: DÖNGÜSEL BORÇLARA YENİ DÖNEM / EKSTRE EKLEME
      ========================================== */}
      {newPeriodModalDebt && (
        <NewPeriodModal
          debt={newPeriodModalDebt}
          todayStr={todayStr}
          onClose={() => setNewPeriodModalDebt(null)}
          onSave={handleAddRecurringPeriod}
        />
      )}

      {/* ==========================================
          MODAL 7: TEKİL TAKSİT DÜZENLEME MODALI
      ========================================== */}
      {editInstModalData && (
        <EditInstallmentModal
          data={editInstModalData}
          onClose={() => setEditInstModalData(null)}
          onSave={handleSaveInstallmentEdit}
        />
      )}

      {/* ==========================================
          MODAL 8: TEMİZ BAŞLANGIÇ (SIFIRLAMA) SİHİRBAZI
      ========================================== */}
      {showCleanStartModal && (
        <CleanStartModal
          onClose={() => setShowCleanStartModal(false)}
          onConfirm={handleCleanStart}
        />
      )}
    </div>
  );
}

// ==========================================
// ALT MODAL BİLEŞENLERİ
// ==========================================

function PaymentModal({ data, todayStr, walletBalance, onClose, onConfirm }) {
  const { debt, installment } = data;
  const remaining = installment.eval.remaining;
  const [payAmount, setPayAmount] = useState(String(remaining));
  const [deductFromWallet, setDeductFromWallet] = useState(true);
  const [paymentDate, setPaymentDate] = useState(todayStr);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Ödeme İşle: {debt.title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Dönem:</span>
            <span className="font-semibold text-white">{installment.periodLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Kalan Net Borç:</span>
            <span className="font-bold text-emerald-400">{formatCurrency(remaining)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Mevcut Cüzdan Bakiyesi:</span>
            <span className="font-semibold text-slate-200">{formatCurrency(walletBalance)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-300 block mb-1">Ödenecek Tutar (TL)</label>
            <input
              type="number"
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Tamamını veya kısmi bir tutarı girebilirsiniz. Kalan kısım otomatik devreder.
            </p>
          </div>

          <div>
            <label className="text-xs text-slate-300 block mb-1">Ödeme Tarihi</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
            />
          </div>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={deductFromWallet}
              onChange={(e) => setDeductFromWallet(e.target.checked)}
              className="w-4 h-4 accent-indigo-500"
            />
            <span className="text-xs text-slate-200">
              Ödeme tutarını mevcut cüzdan bakiyemden otomatik düş
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
          >
            Vazgeç
          </button>
          <button
            onClick={() =>
              onConfirm({
                debt,
                installment,
                payAmount,
                deductFromWallet,
                paymentDate,
              })
            }
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
          >
            Ödemeyi Onayla
          </button>
        </div>
      </div>
    </div>
  );
}

function InterestCalculatorModal({ data, todayStr, onClose, onConfirm }) {
  const { debt, installment } = data;
  // Sadece ödenmemiş kalan anapara üzerinden faiz matrahı
  const unpaidPrincipal = roundCurrency(
    Math.max(0, installment.baseAmount - (installment.paidAmount || 0))
  );
  const defaultDays = Math.max(1, Math.abs(diffDays(installment.dueDate, todayStr)));

  const [calcType, setCalcType] = useState('AUTO'); // AUTO | MANUAL
  const [monthlyRate, setMonthlyRate] = useState(String(debt.monthlyInterestRate || 5.0));
  const [days, setDays] = useState(String(defaultDays));
  const [includeTax, setIncludeTax] = useState(
    debt.type === 'LOAN' || debt.type === 'CREDIT_CARD' || debt.type === 'KMH'
  );
  const [manualAmount, setManualAmount] = useState(String(installment.lateInterest || 0));
  const [applyMode, setApplyMode] = useState('REPLACE'); // REPLACE | ADD

  const rawInterest = roundCurrency(
    (unpaidPrincipal * (Number(monthlyRate) || 0) * (Number(days) || 0)) / 3000
  );
  const taxAmount = includeTax ? roundCurrency(rawInterest * 0.3) : 0; // %15 KKDF + %15 BSMV
  const calculatedTotal = roundCurrency(rawInterest + taxAmount);

  const finalAmount = calcType === 'AUTO' ? calculatedTotal : roundCurrency(manualAmount);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">
            {debt.type === 'KMH' ? 'KMH Günlük Faiz Motoru' : 'Gecikme Faizi Hesapla'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setCalcType('AUTO')}
            className={`py-1.5 rounded-lg text-xs font-semibold ${
              calcType === 'AUTO' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            Otomatik Formül
          </button>
          <button
            onClick={() => setCalcType('MANUAL')}
            className={`py-1.5 rounded-lg text-xs font-semibold ${
              calcType === 'MANUAL' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            Manuel Tutar Gir
          </button>
        </div>

        {calcType === 'AUTO' ? (
          <div className="space-y-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between">
              <span className="text-slate-400">Kalan Anapara Matrahı:</span>
              <span className="font-bold text-white">{formatCurrency(unpaidPrincipal)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-slate-300 block mb-1">Aylık Faiz Oranı (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={monthlyRate}
                  onChange={(e) => setMonthlyRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Gün Sayısı</label>
                <input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTax}
                onChange={(e) => setIncludeTax(e.target.checked)}
                className="w-4 h-4 accent-indigo-500"
              />
              <span className="text-slate-200">
                +%30 Vergi Yükü Ekle (%15 KKDF + %15 BSMV)
              </span>
            </label>

            <div className="bg-amber-950/25 border border-amber-500/30 rounded-xl p-3 space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Ham Günlük Faiz:</span>
                <span>{formatCurrency(rawInterest)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>KKDF + BSMV Vergisi:</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-amber-300 font-bold pt-1 border-t border-amber-500/20">
                <span>Hesaplanan Net Faiz:</span>
                <span>{formatCurrency(calculatedTotal)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="text-xs text-slate-300 block mb-1">
              Manuel Faiz / Gecikme Cezası Tutarı (TL)
            </label>
            <input
              type="number"
              step="0.01"
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <button
            onClick={() => setApplyMode('REPLACE')}
            className={`p-2 rounded-xl border text-center font-semibold ${
              applyMode === 'REPLACE'
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            Toplam Güncel Faiz Olarak Kaydet
          </button>
          <button
            onClick={() => setApplyMode('ADD')}
            className={`p-2 rounded-xl border text-center font-semibold ${
              applyMode === 'ADD'
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            Mevcut Faizin ({formatCurrency(installment.lateInterest || 0)}) Üzerine Ekle
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
          >
            İptal
          </button>
          <button
            onClick={() =>
              onConfirm({
                debtId: debt.id,
                installmentId: installment.id,
                finalInterestAmount: finalAmount,
                mode: applyMode,
              })
            }
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold"
          >
            Faizi Taksite İşle
          </button>
        </div>
      </div>
    </div>
  );
}

function DebtFormModal({ editingDebt, todayStr, onClose, onSave }) {
  const [title, setTitle] = useState(editingDebt?.title || '');
  const [type, setType] = useState(editingDebt?.type || 'LOAN');
  const [priority, setPriority] = useState(editingDebt?.priority || 'HIGH');
  const [amount, setAmount] = useState('');
  const [amountMode, setAmountMode] = useState('PER_INSTALLMENT'); // PER_INSTALLMENT | TOTAL_DIVIDED
  const [installmentCount, setInstallmentCount] = useState('1');
  const [firstDueDate, setFirstDueDate] = useState(todayStr);
  const [reminderDays, setReminderDays] = useState(String(editingDebt?.reminderDays ?? 3));
  const [monthlyInterestRate, setMonthlyInterestRate] = useState(
    String(editingDebt?.monthlyInterestRate ?? 5.0)
  );
  const [statementDay, setStatementDay] = useState(String(editingDebt?.statementDay ?? 1));
  const [kmhLimit, setKmhLimit] = useState(String(editingDebt?.kmhLimit ?? 0));
  const [note, setNote] = useState(editingDebt?.note || '');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 max-h-[90vh] overflow-y-auto space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">
            {editingDebt ? 'Borç Bilgilerini Düzenle' : 'Yeni Borç / Yükümlülük Ekle'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 block mb-1">Borç Başlığı / Kurum Adı</label>
            <input
              type="text"
              placeholder="Örn: Garanti KMH, Akbank Kredi, Elektrik Faturası..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-slate-300 block mb-1">Kategori</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
              >
                {Object.entries(DEBT_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-300 block mb-1">Önem Derecesi</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
              >
                {Object.entries(PRIORITIES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!editingDebt && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-300 block mb-1">Tutar Giriş Tipi</label>
                  <select
                    value={amountMode}
                    onChange={(e) => setAmountMode(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="PER_INSTALLMENT">Aylık Taksit / Dönem Tutarı</option>
                    <option value="TOTAL_DIVIDED">Toplam Borcu Taksite Böl</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Tutar (TL)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-300 block mb-1">Taksit / Dönem Sayısı</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={installmentCount}
                    onChange={(e) => setInstallmentCount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">İlk Son Ödeme Tarihi</label>
                  <input
                    type="date"
                    value={firstDueDate}
                    onChange={(e) => setFirstDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-slate-300 block mb-1">Kaç Gün Kala Uyar?</label>
              <input
                type="number"
                min="0"
                max="30"
                value={reminderDays}
                onChange={(e) => setReminderDays(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-slate-300 block mb-1">Aylık Faiz (%)</label>
              <input
                type="number"
                step="0.01"
                value={monthlyInterestRate}
                onChange={(e) => setMonthlyInterestRate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-slate-300 block mb-1">Ekstre / Kesim Günü</label>
              <input
                type="number"
                min="1"
                max="31"
                value={statementDay}
                onChange={(e) => setStatementDay(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              />
            </div>
          </div>

          {type === 'KMH' && (
            <div>
              <label className="text-amber-300 block mb-1">Tanımlı KMH (Ek Hesap) Limiti (TL)</label>
              <input
                type="number"
                step="0.01"
                value={kmhLimit}
                onChange={(e) => setKmhLimit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/40 text-white"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
          >
            İptal
          </button>
          <button
            onClick={() => {
              if (!title.trim()) return;
              if (!editingDebt && (!amount || Number(amount) <= 0)) return;
              onSave({
                title,
                type,
                priority,
                amount,
                amountMode,
                installmentCount,
                firstDueDate,
                reminderDays,
                monthlyInterestRate,
                statementDay,
                kmhLimit,
                note,
              });
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
          >
            {editingDebt ? 'Değişiklikleri Kaydet' : 'Borcu Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CashModal({ mode, currentBalance, todayStr, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(
    mode === 'INCOME' ? 'Maaş / Ek Gelir' : 'Market & Akaryakıt'
  );
  const [amount, setAmount] = useState(mode === 'SET_BALANCE' ? String(currentBalance) : '');
  const [date, setDate] = useState(todayStr);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">
            {mode === 'INCOME' && '+ Cüzdana Gelir Ekle'}
            {mode === 'EXPENSE' && '- Günlük Harcama / Gider Düş'}
            {mode === 'SET_BALANCE' && 'Cüzdan Bakiyesini Doğrudan Eşitle'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {mode !== 'SET_BALANCE' && (
            <>
              <div>
                <label className="text-slate-300 block mb-1">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                >
                  {mode === 'INCOME' ? (
                    <>
                      <option value="Maaş / Gelir">Maaş / Aylık Gelir</option>
                      <option value="Ek İş / Prim">Ek İş / Prim / Mesai</option>
                      <option value="Elden Tahsilat">Elden Alacak Tahsilatı</option>
                    </>
                  ) : (
                    <>
                      <option value="Market & Gıda">Market & Gıda</option>
                      <option value="Akaryakıt & Ulaşım">Akaryakıt & Ulaşım</option>
                      <option value="Yeme & İçme">Restoran / Kafe</option>
                      <option value="Diğer Harcama">Diğer Manuel Gider</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Açıklama</label>
                <input
                  type="text"
                  placeholder={
                    mode === 'INCOME' ? 'Örn: Maaş Yattı' : 'Örn: Benzin / Market alışverişi'
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-slate-300 block mb-1">
              {mode === 'SET_BALANCE' ? 'Yeni Net Cüzdan Bakiyesi (TL)' : 'Tutar (TL)'}
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold"
            />
          </div>

          <div>
            <label className="text-slate-300 block mb-1">İşlem Tarihi</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
          >
            İptal
          </button>
          <button
            onClick={() => onSave({ mode, title, category, amount, date })}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

function NewPeriodModal({ debt, todayStr, onClose, onSave }) {
  const lastInst = debt.installments[debt.installments.length - 1];
  const defaultNextDate = lastInst ? addMonthsToDateStr(lastInst.dueDate, 1) : todayStr;
  const [periodLabel, setPeriodLabel] = useState(
    `${debt.installments.length + 1}. Dönem / Ekstre`
  );
  const [dueDate, setDueDate] = useState(defaultNextDate);
  const [baseAmount, setBaseAmount] = useState(String(lastInst?.baseAmount || ''));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">
            Yeni Dönem Ekle: {debt.title}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 block mb-1">Dönem / Ekstre Adı</label>
            <input
              type="text"
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
            />
          </div>
          <div>
            <label className="text-slate-300 block mb-1">Son Ödeme Tarihi</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
            />
          </div>
          <div>
            <label className="text-slate-300 block mb-1">Dönem Borcu / Fatura Tutarı (TL)</label>
            <input
              type="number"
              step="0.01"
              value={baseAmount}
              onChange={(e) => setBaseAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
          >
            İptal
          </button>
          <button
            onClick={() => onSave({ debtId: debt.id, periodLabel, dueDate, baseAmount })}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
          >
            Dönemi Ekle
          </button>
        </div>
      </div>
    </div>
  );
}

function EditInstallmentModal({ data, onClose, onSave }) {
  const { debtId, installment } = data;
  const [periodLabel, setPeriodLabel] = useState(installment.periodLabel);
  const [dueDate, setDueDate] = useState(installment.dueDate);
  const [baseAmount, setBaseAmount] = useState(String(installment.baseAmount));
  const [lateInterest, setLateInterest] = useState(String(installment.lateInterest || 0));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Taksit / Dönem Düzenle</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 block mb-1">Dönem Başlığı</label>
            <input
              type="text"
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
            />
          </div>
          <div>
            <label className="text-slate-300 block mb-1">Son Ödeme Tarihi</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-slate-300 block mb-1">Anapara / Tutar (TL)</label>
              <input
                type="number"
                step="0.01"
                value={baseAmount}
                onChange={(e) => setBaseAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
              />
            </div>
            <div>
              <label className="text-slate-300 block mb-1">İşlemiş Faiz (TL)</label>
              <input
                type="number"
                step="0.01"
                value={lateInterest}
                onChange={(e) => setLateInterest(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
          >
            İptal
          </button>
          <button
            onClick={() =>
              onSave({
                debtId,
                installmentId: installment.id,
                periodLabel,
                dueDate,
                baseAmount,
                lateInterest,
              })
            }
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
          >
            Güncelle
          </button>
        </div>
      </div>
    </div>
  );
}

function CleanStartModal({ onClose, onConfirm }) {
  const [initialWallet, setInitialWallet] = useState('0');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Temiz Başlangıç (Canlı Mod)</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Uygulamadaki tüm örnek (demo) borçlar ve hareketler silinecek. Şu an cebinizde veya banka hesabınızda bulunan gerçek bakiyeyi yazarak tertemiz bir başlangıç yapabilirsiniz.
        </p>

        <div>
          <label className="text-xs text-slate-300 block mb-1">
            Başlangıç Cüzdan Bakiyeniz (TL)
          </label>
          <input
            type="number"
            step="0.01"
            value={initialWallet}
            onChange={(e) => setInitialWallet(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
          >
            Vazgeç
          </button>
          <button
            onClick={() => onConfirm(initialWallet)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
          >
            Sıfırla ve Gerçek Hesapla Başla
          </button>
        </div>
      </div>
    </div>
  );
}