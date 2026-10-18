import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wallet, Plus, ArrowUpRight, ArrowDownRight, Bell, CheckCircle2,
  Trash2, Edit3, RotateCcw, Upload, ShieldCheck, CreditCard,
  Landmark, Receipt, Users, Banknote, X, Calculator, RefreshCw,
  ArrowUpDown, Sparkles, Database, History, Copy, Share2, FileText
} from 'lucide-react';

import {
  roundCurrency, formatCurrency, getTodayStr, addDaysToDateStr,
  addMonthsToDateStr, diffDays, formatDateTR, ConfirmModal,
  PasteBackupModal, PaymentModal, InterestCalculatorModal,
  DebtFormModal, CashModal, NewPeriodModal, EditInstallmentModal,
  CleanStartModal
} from './Modals';

// ==========================================
// 1. CIFT KATMANLI VERITABANI (IndexedDB + LocalStorage)
// ==========================================
const DB_NAME = 'FinansERP_ProductionDB';
const DB_STORE = 'app_state_store';
const STORAGE_KEY = 'finans_erp_prod_v3';

const openIndexedDB = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) return resolve(null);
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

const saveStateDualLayer = async (stateObj) => {
  const serialized = JSON.stringify(stateObj);
  try { localStorage.setItem(STORAGE_KEY, serialized); } catch (e) {}
  try {
    const db = await openIndexedDB();
    if (db) {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(serialized, 'master_state');
    }
  } catch (e) {}
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
  } catch (e) {}
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) return JSON.parse(local);
  } catch (e) {}
  return null;
};

// ==========================================
// 2. KATEGORILER VE DEMO VERILERI
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
        installments: [
          { id: 'inst-kmh-1', seq: 1, periodLabel: 'Güncel Ek Hesap Kullanımı', dueDate: addDaysToDateStr(today, 2), baseAmount: 12000, lateInterest: 546, paidAmount: 0, paidDate: null }
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
        installments: [
          { id: 'inst-ln-1', seq: 1, periodLabel: '1. Taksit', dueDate: addMonthsToDateStr(today, -1), baseAmount: 6250, lateInterest: 0, paidAmount: 6250, paidDate: addMonthsToDateStr(today, -1) },
          { id: 'inst-ln-2', seq: 2, periodLabel: '2. Taksit', dueDate: today, baseAmount: 6250, lateInterest: 0, paidAmount: 2000, paidDate: today },
          { id: 'inst-ln-3', seq: 3, periodLabel: '3. Taksit', dueDate: addMonthsToDateStr(today, 1), baseAmount: 6250, lateInterest: 0, paidAmount: 0, paidDate: null }
        ]
      }
    ],
    transactions: [
      { id: 'tx-1', type: 'INCOME', category: 'Maaş / Gelir', title: 'Aylık Maaş Ödemesi', amount: 35000, date: today, affectWallet: true, linkedDebtId: null, linkedInstallmentId: null },
      { id: 'tx-2', type: 'DEBT_PAYMENT', category: 'Borç Ödemesi', title: 'Akbank İhtiyaç Kredisi (1. Taksit)', amount: 6250, date: addMonthsToDateStr(today, -1), affectWallet: true, linkedDebtId: 'd-loan-1', linkedInstallmentId: 'inst-ln-1' },
      { id: 'tx-3', type: 'DEBT_PAYMENT', category: 'Borç Ödemesi (Kısmi)', title: 'Akbank İhtiyaç Kredisi (2. Taksit)', amount: 2000, date: today, affectWallet: true, linkedDebtId: 'd-loan-1', linkedInstallmentId: 'inst-ln-2' },
      { id: 'tx-4', type: 'EXPENSE', category: 'Market & Gıda', title: 'Haftalık Market Alışverişi', amount: 2250, date: today, affectWallet: true, linkedDebtId: null, linkedInstallmentId: null }
    ]
  };
};

// ==========================================
// 3. RENK VE DURUM MOTORU + ANDROID BILDIRIM
// ==========================================
const evaluateInstallment = (inst, reminderDays, todayStr) => {
  const totalExpected = roundCurrency(inst.baseAmount + (inst.lateInterest || 0));
  const paid = roundCurrency(inst.paidAmount || 0);
  const remaining = roundCurrency(Math.max(0, totalExpected - paid));
  const daysLeft = diffDays(inst.dueDate, todayStr);

  if (remaining <= 0) {
    return { status: 'PAID', label: 'Ödendi', daysLeft, totalExpected, paid, remaining: 0, rowClass: 'border-emerald-500/40 bg-emerald-950/20', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', dotClass: 'bg-emerald-400' };
  }
  if (daysLeft < 0) {
    return { status: 'OVERDUE', label: paid > 0 ? `Gecikti (${Math.abs(daysLeft)}g) • Kısmi` : `${Math.abs(daysLeft)} Gün Gecikti`, daysLeft, totalExpected, paid, remaining, rowClass: 'border-rose-500/60 bg-rose-950/30', badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40', dotClass: 'bg-rose-500 animate-pulse' };
  }
  if (daysLeft <= reminderDays) {
    return { status: 'APPROACHING', label: daysLeft === 0 ? 'Son Gün Bugün!' : `${daysLeft} Gün Kaldı`, daysLeft, totalExpected, paid, remaining, rowClass: 'border-amber-500/60 bg-amber-950/30', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40', dotClass: 'bg-amber-400' };
  }
  if (paid > 0) {
    return { status: 'PARTIAL', label: `Kısmi Ödendi (${daysLeft}g var)`, daysLeft, totalExpected, paid, remaining, rowClass: 'border-orange-500/40 bg-orange-950/20', badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40', dotClass: 'bg-orange-400' };
  }
  return { status: 'UPCOMING', label: `${daysLeft} Gün Var`, daysLeft, totalExpected, paid, remaining, rowClass: 'border-slate-800 bg-slate-900/70', badgeClass: 'bg-slate-800 text-slate-300 border-slate-700', dotClass: 'bg-slate-400' };
};

const syncAndroidNotifications = async (debts, todayStr) => {
  try {
    const LocalNotifications = typeof window !== 'undefined' ? window.Capacitor?.Plugins?.LocalNotifications : null;
    if (LocalNotifications) {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') return { ok: false };

      if (LocalNotifications.createChannel) {
        await LocalNotifications.createChannel({
          id: 'finans_critical_channel',
          name: 'Kritik Borç Hatırlatıcıları',
          importance: 5,
          visibility: 1,
          vibration: true,
        });
      }

      const pending = await LocalNotifications.getPending();
      if (pending?.notifications?.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }

      const list = [];
      let id = 1000;
      const now = new Date();

      debts.forEach((debt) => {
        debt.installments.forEach((inst) => {
          const ev = evaluateInstallment(inst, debt.reminderDays, todayStr);
          if (ev.remaining <= 0) return;
          const [y, m, d] = inst.dueDate.split('-').map(Number);
          const remDate = new Date(y, m - 1, d - debt.reminderDays, 9, 0, 0);
          const dueDate = new Date(y, m - 1, d, 9, 0, 0);

          if (remDate > now) {
            list.push({ id: id++, title: `Yaklaşan Ödeme: ${debt.title}`, body: `${inst.periodLabel} için ${debt.reminderDays} gün kaldı (${formatCurrency(ev.remaining)})`, channelId: 'finans_critical_channel', schedule: { at: remDate, allowWhileIdle: true } });
          }
          if (dueDate > now) {
            list.push({ id: id++, title: `SON ÖDEME GÜNÜ: ${debt.title}`, body: `${inst.periodLabel} bugün ödenmeli! Tutar: ${formatCurrency(ev.remaining)}`, channelId: 'finans_critical_channel', schedule: { at: dueDate, allowWhileIdle: true } });
          }
        });
      });

      if (list.length > 0) await LocalNotifications.schedule({ notifications: list });
      return { ok: true };
    }
  } catch (e) {}
  return { ok: false };
};

// ==========================================
// 4. ANA BILESEN
// ==========================================
export default function App() {
  const [appState, setAppState] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('DEBTS');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('URGENT');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const [selectedDebtId, setSelectedDebtId] = useState(null);
  const [showDebtFormModal, setShowDebtFormModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [showCashModal, setShowCashModal] = useState(null);
  const [paymentModalData, setPaymentModalData] = useState(null);
  const [interestModalData, setInterestModalData] = useState(null);
  const [newPeriodModalDebt, setNewPeriodModalDebt] = useState(null);
  const [editInstModalData, setEditInstModalData] = useState(null);
  const [showCleanStartModal, setShowCleanStartModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [pasteJsonModalOpen, setPasteJsonModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const todayStr = getTodayStr();
  const fileInputRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const anyModalOpen = Boolean(
    selectedDebtId || showDebtFormModal || showCashModal || paymentModalData ||
    interestModalData || newPeriodModalDebt || editInstModalData ||
    showCleanStartModal || confirmDialog || pasteJsonModalOpen
  );

  useEffect(() => {
    if (anyModalOpen) window.history.pushState({ modalOpen: true }, '');
  }, [anyModalOpen]);

  useEffect(() => {
    const onPop = () => {
      if (confirmDialog) return setConfirmDialog(null);
      if (pasteJsonModalOpen) return setPasteJsonModalOpen(false);
      if (paymentModalData) return setPaymentModalData(null);
      if (interestModalData) return setInterestModalData(null);
      if (newPeriodModalDebt) return setNewPeriodModalDebt(null);
      if (editInstModalData) return setEditInstModalData(null);
      if (showDebtFormModal) { setShowDebtFormModal(false); setEditingDebt(null); return; }
      if (showCashModal) return setShowCashModal(null);
      if (showCleanStartModal) return setShowCleanStartModal(false);
      if (selectedDebtId) return setSelectedDebtId(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [confirmDialog, pasteJsonModalOpen, paymentModalData, interestModalData, newPeriodModalDebt, editInstModalData, showDebtFormModal, showCashModal, showCleanStartModal, selectedDebtId]);

  useEffect(() => {
    loadStateDualLayer().then((loaded) => {
      if (loaded && Array.isArray(loaded.debts)) {
        setAppState(loaded);
      } else {
        const init = createDemoState();
        setAppState(init);
        saveStateDualLayer(init);
      }
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!isLoaded || !appState) return;
    saveStateDualLayer(appState);
    syncAndroidNotifications(appState.debts, todayStr);
  }, [appState, isLoaded, todayStr]);

  const enrichedDebts = useMemo(() => {
    if (!appState) return [];
    return appState.debts.map((debt) => {
      const evaluated = debt.installments.map((inst) => ({
        ...inst,
        eval: evaluateInstallment(inst, debt.reminderDays, todayStr),
      }));
      const totalDebt = roundCurrency(evaluated.reduce((s, i) => s + i.eval.totalExpected, 0));
      const totalPaid = roundCurrency(evaluated.reduce((s, i) => s + i.eval.paid, 0));
      const totalRemaining = roundCurrency(evaluated.reduce((s, i) => s + i.eval.remaining, 0));
      const unpaid = evaluated.filter((i) => i.eval.remaining > 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      const activeInst = unpaid[0] || evaluated[evaluated.length - 1];
      return { ...debt, installments: evaluated, totalDebt, totalPaid, totalRemaining, activeInst };
    });
  }, [appState, todayStr]);

  const dashboardStats = useMemo(() => {
    let totalRemainingAll = 0, totalPaidAll = 0, overdueAmount = 0, overdueCount = 0, approachingAmount = 0, approachingCount = 0;
    enrichedDebts.forEach((d) => {
      totalRemainingAll = roundCurrency(totalRemainingAll + d.totalRemaining);
      totalPaidAll = roundCurrency(totalPaidAll + d.totalPaid);
      d.installments.forEach((inst) => {
        if (inst.eval.status === 'OVERDUE') { overdueAmount = roundCurrency(overdueAmount + inst.eval.remaining); overdueCount++; }
        else if (inst.eval.status === 'APPROACHING') { approachingAmount = roundCurrency(approachingAmount + inst.eval.remaining); approachingCount++; }
      });
    });
    return { totalRemainingAll, totalPaidAll, overdueAmount, overdueCount, approachingAmount, approachingCount };
  }, [enrichedDebts]);

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
          const ap = a.totalRemaining <= 0 ? 1 : 0;
          const bp = b.totalRemaining <= 0 ? 1 : 0;
          if (ap !== bp) return ap - bp;
          return (a.activeInst?.eval.daysLeft ?? 9999) - (b.activeInst?.eval.daysLeft ?? 9999);
        }
        if (sortBy === 'PRIORITY') return (PRIORITIES[b.priority]?.rank || 0) - (PRIORITIES[a.priority]?.rank || 0);
        if (sortBy === 'AMOUNT_DESC') return b.totalRemaining - a.totalRemaining;
        return 0;
      });
  }, [enrichedDebts, typeFilter, statusFilter, sortBy]);

  const selectedDebt = useMemo(() => enrichedDebts.find((d) => d.id === selectedDebtId) || null, [enrichedDebts, selectedDebtId]);

  const handleAddCashTransaction = (form) => {
    const amount = roundCurrency(form.amount);
    if (form.mode !== 'SET_BALANCE' && amount <= 0) return;
    setAppState((prev) => {
      if (form.mode === 'SET_BALANCE') {
        const diff = roundCurrency(amount - prev.walletBalance);
        const tx = { id: `tx-${Date.now()}`, type: diff >= 0 ? 'INCOME' : 'EXPENSE', category: 'Bakiye Eşitleme', title: 'Cüzdan Bakiyesi Kalibrasyonu', amount: Math.abs(diff), date: form.date || todayStr, affectWallet: true, linkedDebtId: null, linkedInstallmentId: null };
        return { ...prev, walletBalance: amount, transactions: diff !== 0 ? [tx, ...prev.transactions] : prev.transactions };
      }
      const isInc = form.mode === 'INCOME';
      const tx = { id: `tx-${Date.now()}`, type: isInc ? 'INCOME' : 'EXPENSE', category: form.category, title: form.title.trim() || (isInc ? 'Gelir' : 'Harcama'), amount, date: form.date || todayStr, affectWallet: true, linkedDebtId: null, linkedInstallmentId: null };
      return { ...prev, walletBalance: roundCurrency(isInc ? prev.walletBalance + amount : prev.walletBalance - amount), transactions: [tx, ...prev.transactions] };
    });
    setShowCashModal(null);
    showToast('Cüzdan bakiyesi güncellendi.');
  };

  const handleUndoTransaction = (tx) => {
    setConfirmDialog({
      title: 'İşlemi Geri Al',
      message: `"${tx.title}" (${formatCurrency(tx.amount)}) işlemini iptal etmek istiyor musunuz?`,
      confirmText: 'Evet, Geri Al',
      onConfirm: () => {
        setAppState((prev) => {
          let wallet = prev.walletBalance;
          if (tx.affectWallet) wallet = roundCurrency(tx.type === 'INCOME' ? wallet - tx.amount : wallet + tx.amount);
          let debts = prev.debts;
          if (tx.type === 'DEBT_PAYMENT' && tx.linkedDebtId && tx.linkedInstallmentId) {
            debts = prev.debts.map((d) => d.id !== tx.linkedDebtId ? d : {
              ...d,
              installments: d.installments.map((inst) => {
                if (inst.id !== tx.linkedInstallmentId) return inst;
                const rev = roundCurrency(Math.max(0, (inst.paidAmount || 0) - tx.amount));
                return { ...inst, paidAmount: rev, paidDate: rev > 0 ? inst.paidDate : null };
              }),
            });
          }
          return { ...prev, walletBalance: wallet, debts, transactions: prev.transactions.filter((i) => i.id !== tx.id) };
        });
        setConfirmDialog(null);
        showToast('İşlem geri alındı.');
      },
    });
  };

  const handleResetInstallmentPayment = (debtId, inst) => {
    const paid = roundCurrency(inst.paidAmount || 0);
    if (paid <= 0) return;
    setConfirmDialog({
      title: 'Ödemeyi Sıfırla',
      message: `${inst.periodLabel} için yapılan ${formatCurrency(paid)} ödemeyi geri almak istiyor musunuz?`,
      confirmText: 'Sıfırla',
      onConfirm: () => {
        setAppState((prev) => {
          const debts = prev.debts.map((d) => d.id !== debtId ? d : {
            ...d,
            installments: d.installments.map((i) => i.id === inst.id ? { ...i, paidAmount: 0, paidDate: null } : i),
          });
          const linked = prev.transactions.filter((t) => t.linkedDebtId === debtId && t.linkedInstallmentId === inst.id);
          const refund = roundCurrency(linked.filter((t) => t.affectWallet).reduce((s, t) => s + t.amount, 0));
          return {
            ...prev,
            walletBalance: roundCurrency(prev.walletBalance + (refund || paid)),
            debts,
            transactions: prev.transactions.filter((t) => !(t.linkedDebtId === debtId && t.linkedInstallmentId === inst.id)),
          };
        });
        setConfirmDialog(null);
        showToast('Ödeme sıfırlandı ve cüzdana iade edildi.');
      },
    });
  };

  const handlePayInstallment = ({ debt, installment, payAmount, deductFromWallet, paymentDate }) => {
    const amount = roundCurrency(payAmount);
    if (amount <= 0) return;
    setAppState((prev) => {
      const debts = prev.debts.map((d) => d.id !== debt.id ? d : {
        ...d,
        installments: d.installments.map((i) => i.id !== installment.id ? i : { ...i, paidAmount: roundCurrency((i.paidAmount || 0) + amount), paidDate: paymentDate || todayStr }),
      });
      const tx = { id: `tx-${Date.now()}`, type: 'DEBT_PAYMENT', category: `${DEBT_TYPES[debt.type]?.short || 'Borç'} Ödemesi`, title: `${debt.title} (${installment.periodLabel})`, amount, date: paymentDate || todayStr, affectWallet: deductFromWallet, linkedDebtId: debt.id, linkedInstallmentId: installment.id };
      return { ...prev, walletBalance: deductFromWallet ? roundCurrency(prev.walletBalance - amount) : prev.walletBalance, debts, transactions: [tx, ...prev.transactions] };
    });
    setPaymentModalData(null);
    showToast('Ödeme başarıyla işlendi.');
  };

  const handleApplyInterest = ({ debtId, installmentId, finalInterestAmount, mode }) => {
    const amount = roundCurrency(finalInterestAmount);
    setAppState((prev) => ({
      ...prev,
      debts: prev.debts.map((d) => d.id !== debtId ? d : {
        ...d,
        installments: d.installments.map((i) => i.id !== installmentId ? i : { ...i, lateInterest: mode === 'ADD' ? roundCurrency((i.lateInterest || 0) + amount) : amount }),
      }),
    }));
    setInterestModalData(null);
    showToast('Faiz tutarı taksite işlendi.');
  };

  const handleSaveDebt = (form) => {
    if (editingDebt) {
      setAppState((prev) => ({
        ...prev,
        debts: prev.debts.map((d) => d.id !== editingDebt.id ? d : {
          ...d, title: form.title.trim(), type: form.type, priority: form.priority, reminderDays: Number(form.reminderDays) || 3, monthlyInterestRate: roundCurrency(form.monthlyInterestRate), statementDay: Number(form.statementDay) || 1, kmhLimit: roundCurrency(form.kmhLimit || 0),
        }),
      }));
      setEditingDebt(null);
      setShowDebtFormModal(false);
      showToast('Borç güncellendi.');
      return;
    }
    const count = Math.max(1, parseInt(form.installmentCount, 10) || 1);
    const totalInput = roundCurrency(form.amount);
    const perInst = form.amountMode === 'TOTAL_DIVIDED' ? roundCurrency(totalInput / count) : totalInput;
    const installments = Array.from({ length: count }, (_, idx) => ({
      id: `inst-${Date.now()}-${idx}`,
      seq: idx + 1,
      periodLabel: form.type === 'LOAN' || count > 1 ? `${idx + 1}. Taksit` : form.type === 'KMH' ? 'KMH Dönem Bakiyesi' : '1. Dönem / Ekstre',
      dueDate: addMonthsToDateStr(form.firstDueDate, idx),
      baseAmount: idx === count - 1 && form.amountMode === 'TOTAL_DIVIDED' ? roundCurrency(totalInput - perInst * (count - 1)) : perInst,
      lateInterest: 0,
      paidAmount: 0,
      paidDate: null,
    }));
    const newDebt = { id: `debt-${Date.now()}`, title: form.title.trim(), type: form.type, priority: form.priority, reminderDays: Number(form.reminderDays) || 3, monthlyInterestRate: roundCurrency(form.monthlyInterestRate), statementDay: Number(form.statementDay) || 1, kmhLimit: roundCurrency(form.kmhLimit || 0), installments };
    setAppState((prev) => ({ ...prev, debts: [newDebt, ...prev.debts] }));
    setShowDebtFormModal(false);
    showToast('Yeni borç eklendi.');
  };

  const handleAddRecurringPeriod = ({ debtId, periodLabel, dueDate, baseAmount }) => {
    const amt = roundCurrency(baseAmount);
    if (amt <= 0) return;
    setAppState((prev) => ({
      ...prev,
      debts: prev.debts.map((d) => d.id !== debtId ? d : {
        ...d,
        installments: [...d.installments, { id: `inst-${Date.now()}`, seq: d.installments.length + 1, periodLabel: periodLabel.trim(), dueDate, baseAmount: amt, lateInterest: 0, paidAmount: 0, paidDate: null }],
      }),
    }));
    setNewPeriodModalDebt(null);
    showToast('Yeni dönem eklendi.');
  };

  const handleSaveInstallmentEdit = ({ debtId, installmentId, periodLabel, dueDate, baseAmount, lateInterest }) => {
    setAppState((prev) => ({
      ...prev,
      debts: prev.debts.map((d) => d.id !== debtId ? d : {
        ...d,
        installments: d.installments.map((i) => i.id !== installmentId ? i : { ...i, periodLabel: periodLabel.trim(), dueDate, baseAmount: roundCurrency(baseAmount), lateInterest: roundCurrency(lateInterest) }),
      }),
    }));
    setEditInstModalData(null);
    showToast('Dönem güncellendi.');
  };

  const handleDeleteDebt = (debtId) => {
    setConfirmDialog({
      title: 'Borç Kaydını Sil',
      message: 'Bu borç kaydını ve tüm ödeme planını silmek istediğinize emin misiniz?',
      confirmText: 'Evet, Sil',
      onConfirm: () => {
        setAppState((prev) => ({ ...prev, debts: prev.debts.filter((d) => d.id !== debtId) }));
        setConfirmDialog(null);
        setSelectedDebtId(null);
        showToast('Borç silindi.');
      },
    });
  };

  const handleCleanStart = (initialWallet) => {
    const bal = roundCurrency(initialWallet);
    const fresh = {
      isDemo: false,
      walletBalance: bal,
      lastUpdated: new Date().toISOString(),
      debts: [],
      transactions: bal > 0 ? [{ id: `tx-init-${Date.now()}`, type: 'INCOME', category: 'Açılış Bakiyesi', title: 'Başlangıç Bakiyesi', amount: bal, date: todayStr, affectWallet: true, linkedDebtId: null, linkedInstallmentId: null }] : [],
    };
    setAppState(fresh);
    saveStateDualLayer(fresh);
    setShowCleanStartModal(false);
    setSelectedDebtId(null);
    showToast('Sıfırlandı! Gerçek verilerinizle başlayabilirsiniz.');
  };

  const handleExportJSON = async () => {
    const dataStr = JSON.stringify(appState, null, 2);
    const fileName = `FinansERP_Yedek_${todayStr}.json`;
    try {
      if (navigator.share) {
        const file = new File([dataStr], fileName, { type: 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: fileName, files: [file] });
          return;
        }
        await navigator.share({ title: fileName, text: dataStr });
        return;
      }
    } catch (e) {}
    try {
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {}
  };

  const handleCopyBackup = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(appState));
      showToast('Yedek kodu panoya kopyalandı!');
    } catch (e) {}
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (parsed && Array.isArray(parsed.debts)) {
          setAppState(parsed);
          saveStateDualLayer(parsed);
          showToast('Yedek geri yüklendi!');
        }
      } catch (err) { showToast('Geçersiz JSON dosyası!'); }
    };
    reader.readAsText(file);
  };

  if (!isLoaded || !appState) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const alertInstallments = [];
  enrichedDebts.forEach((d) => {
    d.installments.forEach((inst) => {
      if (inst.eval.status === 'OVERDUE' || inst.eval.status === 'APPROACHING') alertInstallments.push({ debt: d, inst });
    });
  });
  alertInstallments.sort((a, b) => a.inst.eval.daysLeft - b.inst.eval.daysLeft);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 font-sans" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[92%] px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2.5 text-sm font-medium bg-slate-900 border-indigo-500/40 text-slate-100">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">FinansERP</h1>
              <p className="text-[11px] text-slate-400">Bugün: {formatDateTR(todayStr)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {appState.isDemo && (
              <button onClick={() => setShowCleanStartModal(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sıfırdan Başla</span>
              </button>
            )}
            <button onClick={() => setActiveTab('ALERTS')} className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
              <Bell className="w-5 h-5" />
              {alertInstallments.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">{alertInstallments.length}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-800 p-4 shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Mevcut Cüzdan Bakiyesi</span>
                <button onClick={() => setShowCashModal('SET_BALANCE')} className="text-indigo-400 underline text-[11px]">(Eşitle)</button>
              </div>
              <div className={`text-2xl font-extrabold mt-0.5 ${appState.walletBalance < 0 ? 'text-rose-400' : 'text-white'}`}>
                {formatCurrency(appState.walletBalance)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowCashModal('INCOME')} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                <ArrowUpRight className="w-4 h-4" /><span>+ Gelir</span>
              </button>
              <button onClick={() => setShowCashModal('EXPENSE')} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-semibold">
                <ArrowDownRight className="w-4 h-4" /><span>- Harcama</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-slate-800/80">
            <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/70">
              <div className="text-[11px] text-slate-400">Kalan Borç</div>
              <div className="text-sm font-bold text-slate-100 mt-0.5">{formatCurrency(dashboardStats.totalRemainingAll)}</div>
            </div>
            <div className="bg-emerald-950/25 rounded-xl p-2.5 border border-emerald-500/25">
              <div className="text-[11px] text-emerald-300/80">Ödenen</div>
              <div className="text-sm font-bold text-emerald-300 mt-0.5">{formatCurrency(dashboardStats.totalPaidAll)}</div>
            </div>
            <div className="bg-amber-950/25 rounded-xl p-2.5 border border-amber-500/25">
              <div className="text-[11px] text-amber-300/80">Yaklaşan ({dashboardStats.approachingCount})</div>
              <div className="text-sm font-bold text-amber-300 mt-0.5">{formatCurrency(dashboardStats.approachingAmount)}</div>
            </div>
            <div className="bg-rose-950/30 rounded-xl p-2.5 border border-rose-500/30">
              <div className="text-[11px] text-rose-300/80">Geciken ({dashboardStats.overdueCount})</div>
              <div className="text-sm font-bold text-rose-400 mt-0.5">{formatCurrency(dashboardStats.overdueAmount)}</div>
            </div>
          </div>
        </section>

        {activeTab === 'DEBTS' && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: 'ALL', label: 'Tümü' }, { key: 'LOAN', label: 'Kredi' }, { key: 'CREDIT_CARD', label: 'K.Kartı' },
                  { key: 'KMH', label: 'KMH' }, { key: 'BILL', label: 'Fatura' }, { key: 'PERSONAL', label: 'Elden' },
                ].map((cat) => (
                  <button key={cat.key} onClick={() => setTypeFilter(cat.key)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${typeFilter === cat.key ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-300 border-slate-800'}`}>
                    {cat.label}
                  </button>
                ))}
              </div>
              <button onClick={() => { setEditingDebt(null); setShowDebtFormModal(true); }} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">
                <Plus className="w-4 h-4" /><span>Yeni Borç</span>
              </button>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: 'Tümü', dot: 'bg-slate-400' }, { id: 'OVERDUE', label: 'Geciken', dot: 'bg-rose-500' },
                  { id: 'APPROACHING', label: 'Yaklaşan', dot: 'bg-amber-400' }, { id: 'PARTIAL', label: 'Kısmi', dot: 'bg-orange-400' },
                  { id: 'PAID', label: 'Ödenen', dot: 'bg-emerald-400' },
                ].map((st) => (
                  <button key={st.id} onClick={() => setStatusFilter(st.id)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium ${statusFilter === st.id ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${st.dot}`} /><span>{st.label}</span>
                  </button>
                ))}
              </div>
              <div className="relative">
                <button onClick={() => setSortMenuOpen((o) => !o)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200">
                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{sortBy === 'URGENT' ? 'Tarihe Göre' : sortBy === 'PRIORITY' ? 'Önem Derecesi' : 'Tutar (Azalan)'}</span>
                </button>
                {sortMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1 z-20">
                    {[
                      { id: 'URGENT', label: 'Tarihe Göre (Acil)' },
                      { id: 'PRIORITY', label: 'Önem Derecesi' },
                      { id: 'AMOUNT_DESC', label: 'Tutar (Azalan)' },
                    ].map((opt) => (
                      <button key={opt.id} onClick={() => { setSortBy(opt.id); setSortMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800">
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              {filteredAndSortedDebts.map((debt) => {
                const typeMeta = DEBT_TYPES[debt.type] || DEBT_TYPES.LOAN;
                const TypeIcon = typeMeta.icon;
                const activeEv = debt.activeInst?.eval;
                const prio = PRIORITIES[debt.priority] || PRIORITIES.NORMAL;
                return (
                  <div key={debt.id} onClick={() => setSelectedDebtId(debt.id)} className={`cursor-pointer rounded-2xl border p-3.5 ${activeEv ? activeEv.rowClass : 'border-slate-800 bg-slate-900/70'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl border ${typeMeta.bg} ${typeMeta.border}`}><TypeIcon className={`w-5 h-5 ${typeMeta.color}`} /></div>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-sm font-bold text-white">{debt.title}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${prio.badge}`}>{prio.label}</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {typeMeta.label} • {debt.activeInst ? `${debt.activeInst.periodLabel}: ${formatDateTR(debt.activeInst.dueDate)}` : 'Tamamlandı'}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {activeEv && (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${activeEv.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${activeEv.dotClass}`} />{activeEv.label}
                          </span>
                        )}
                        <div className="text-sm font-extrabold text-white mt-1">
                          {activeEv ? formatCurrency(activeEv.remaining) : formatCurrency(0)}
                          <span className="text-xs font-normal text-slate-400"> / {formatCurrency(debt.totalRemaining)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === 'LEDGER' && (
          <section className="space-y-2.5">
            <h2 className="text-base font-bold text-white">Cüzdan & Muhasebe Hareketleri</h2>
            {appState.transactions.map((tx) => {
              const isInc = tx.type === 'INCOME';
              return (
                <div key={tx.id} className="rounded-2xl bg-slate-900 border border-slate-800 p-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{tx.title}</div>
                    <div className="text-[11px] text-slate-400">{tx.category} • {formatDateTR(tx.date)}</div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className={`text-sm font-bold ${isInc ? 'text-emerald-400' : 'text-rose-400'}`}>{isInc ? '+' : '-'}{formatCurrency(tx.amount)}</span>
                    <button onClick={() => handleUndoTransaction(tx)} className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 border border-slate-700">Geri Al</button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {activeTab === 'ALERTS' && (
          <section className="space-y-2.5">
            {alertInstallments.map(({ debt, inst }) => (
              <div key={inst.id} onClick={() => setSelectedDebtId(debt.id)} className={`cursor-pointer rounded-2xl border p-3.5 flex items-center justify-between ${inst.eval.rowClass}`}>
                <div>
                  <span className="text-sm font-bold text-white">{debt.title} ({inst.periodLabel})</span>
                  <p className="text-xs text-slate-300 mt-0.5">Son Ödeme: {formatDateTR(inst.dueDate)} • {inst.eval.label}</p>
                </div>
                <div className="text-sm font-extrabold text-white">{formatCurrency(inst.eval.remaining)}</div>
              </div>
            ))}
          </section>
        )}

        {activeTab === 'BACKUP' && (
          <section className="space-y-3">
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button onClick={handleExportJSON} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold"><Share2 className="w-4 h-4" /><span>JSON Yedeği Paylaş / Kaydet</span></button>
              <button onClick={handleCopyBackup} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold"><Copy className="w-4 h-4" /><span>Yedek Kodunu Kopyala</span></button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold"><Upload className="w-4 h-4" /><span>Dosyadan Geri Yükle</span></button>
              <button onClick={() => setPasteJsonModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold"><FileText className="w-4 h-4" /><span>Metin Yapıştırarak Yükle</span></button>
              <input ref={fileInputRef} type="file" accept=".json,application/json,text/plain" onChange={handleImportJSON} className="hidden" />
            </div>
          </section>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 border-t border-slate-800 px-2 py-2">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          {[
            { id: 'DEBTS', label: 'Borçlarım', icon: Wallet },
            { id: 'LEDGER', label: 'Hareketler', icon: History },
            { id: 'ALERTS', label: 'Bildirimler', icon: Bell },
            { id: 'BACKUP', label: 'Veri & Yedek', icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center py-1.5 rounded-xl text-[11px] font-semibold ${activeTab === item.id ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400'}`}>
                <Icon className="w-5 h-5 mb-0.5" /><span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {selectedDebt && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">{selectedDebt.title}</h2>
              <div className="flex items-center gap-1.5">
                <button onClick={() => { setEditingDebt(selectedDebt); setShowDebtFormModal(true); }} className="p-2 rounded-xl bg-slate-800 text-slate-200"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => handleDeleteDebt(selectedDebt.id)} className="p-2 rounded-xl bg-rose-500/15 text-rose-300"><Trash2 className="w-4 h-4" /></button>
                <button onClick={() => setSelectedDebtId(null)} className="p-2 rounded-xl bg-slate-800 text-slate-300"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Dönemler ({selectedDebt.installments.length})</span>
                <button onClick={() => setNewPeriodModalDebt(selectedDebt)} className="px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">+ Yeni Dönem Ekle</button>
              </div>
              {selectedDebt.installments.map((inst) => (
                <div key={inst.id} className={`rounded-2xl border p-3.5 space-y-2.5 ${inst.eval.rowClass}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{inst.periodLabel} • {formatDateTR(inst.dueDate)}</span>
                    <button onClick={() => setEditInstModalData({ debtId: selectedDebt.id, installment: inst })} className="text-[11px] text-slate-400 underline">Düzenle</button>
                  </div>
                  <div className="text-xs text-slate-200 flex justify-between">
                    <span>Anapara: {formatCurrency(inst.baseAmount)} | Faiz: {formatCurrency(inst.lateInterest || 0)}</span>
                    <span className="font-bold">Kalan: {formatCurrency(inst.eval.remaining)}</span>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {inst.paidAmount > 0 && (
                      <button onClick={() => handleResetInstallmentPayment(selectedDebt.id, inst)} className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-300">Ödemeyi Geri Al</button>
                    )}
                    {inst.eval.remaining > 0 && (
                      <>
                        <button onClick={() => setInterestModalData({ debt: selectedDebt, installment: inst })} className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-semibold">Faiz İşle</button>
                        <button onClick={() => setPaymentModalData({ debt: selectedDebt, installment: inst })} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold">Ödeme Yap</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {paymentModalData && <PaymentModal data={paymentModalData} todayStr={todayStr} walletBalance={appState.walletBalance} onClose={() => setPaymentModalData(null)} onConfirm={handlePayInstallment} />}
      {interestModalData && <InterestCalculatorModal data={interestModalData} todayStr={todayStr} onClose={() => setInterestModalData(null)} onConfirm={handleApplyInterest} />}
      {showDebtFormModal && <DebtFormModal editingDebt={editingDebt} todayStr={todayStr} debtTypes={DEBT_TYPES} priorities={PRIORITIES} onClose={() => { setShowDebtFormModal(false); setEditingDebt(null); }} onSave={handleSaveDebt} />}
      {showCashModal && <CashModal mode={showCashModal} currentBalance={appState.walletBalance} todayStr={todayStr} onClose={() => setShowCashModal(null)} onSave={handleAddCashTransaction} />}
      {newPeriodModalDebt && <NewPeriodModal debt={newPeriodModalDebt} todayStr={todayStr} onClose={() => setNewPeriodModalDebt(null)} onSave={handleAddRecurringPeriod} />}
      {editInstModalData && <EditInstallmentModal data={editInstModalData} onClose={() => setEditInstModalData(null)} onSave={handleSaveInstallmentEdit} />}
      {showCleanStartModal && <CleanStartModal onClose={() => setShowCleanStartModal(false)} onConfirm={handleCleanStart} />}
      <ConfirmModal dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
      {pasteJsonModalOpen && <PasteBackupModal onClose={() => setPasteJsonModalOpen(false)} onRestore={(txt) => { try { const p = JSON.parse(txt); if (p?.debts) { setAppState(p); setPasteJsonModalOpen(false); showToast('Yüklendi!'); } } catch (e) {} }} />}
    </div>
  );
}