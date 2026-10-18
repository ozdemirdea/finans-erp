import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

export const parseFlexibleNumber = (val) => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(',', '.').replace(/[^0-9.-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

export const roundCurrency = (num) => {
  const n = parseFlexibleNumber(num);
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundCurrency(amount));
};

export const getTodayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const addDaysToDateStr = (dateStr, daysToAdd) => {
  const [y, m, d] = (dateStr || getTodayStr()).split('-').map(Number);
  const date = new Date(y, m - 1, d + daysToAdd);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const addMonthsToDateStr = (dateStr, monthsToAdd) => {
  const [y, m, d] = (dateStr || getTodayStr()).split('-').map(Number);
  const targetMonth = m - 1 + monthsToAdd;
  const tempDate = new Date(y, targetMonth, 1);
  const maxDays = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).getDate();
  const finalDate = new Date(tempDate.getFullYear(), tempDate.getMonth(), Math.min(d, maxDays));
  return `${finalDate.getFullYear()}-${String(finalDate.getMonth() + 1).padStart(2, '0')}-${String(finalDate.getDate()).padStart(2, '0')}`;
};

export const diffDays = (targetDateStr, currentDateStr) => {
  if (!targetDateStr || !currentDateStr) return 0;
  const [ty, tm, td] = targetDateStr.split('-').map(Number);
  const [cy, cm, cd] = currentDateStr.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(cy, cm - 1, cd)) / 86400000);
};

export const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const MONTHS_SHORT_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export const formatDateTR = (dateStr) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d} ${MONTHS_SHORT_TR[parseInt(m, 10) - 1] || m} ${y}`;
};

// %100 SAF REACT DOKUNMATİK TARİH SEÇİCİ (SAYAÇ + TAKVİM + KLAVYE)
export function SmartDateInput({ label, value, onChange }) {
  const safeVal = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : getTodayStr();
  const [year, month, day] = safeVal.split('-').map(Number);
  const [viewMode, setViewMode] = useState('STEPPER');
  const [manualText, setManualText] = useState(`${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`);

  useEffect(() => {
    const [y, m, d] = safeVal.split('-').map(Number);
    setManualText(`${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`);
  }, [safeVal]);

  const daysInMonth = new Date(year, month, 0).getDate();

  const updateDateParts = (newY, newM, newD) => {
    let y = newY;
    let m = newM;
    if (m > 12) { m = 1; y += 1; } else if (m < 1) { m = 12; y -= 1; }
    const maxD = new Date(y, m, 0).getDate();
    let d = newD;
    if (d > maxD) d = 1;
    if (d < 1) d = maxD;
    onChange(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  };

  const handleManualInput = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
    let formattedText = digits;
    if (digits.length > 4) formattedText = `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
    else if (digits.length > 2) formattedText = `${digits.slice(0, 2)}.${digits.slice(2)}`;
    setManualText(formattedText);

    if (digits.length === 8) {
      const d = parseInt(digits.slice(0, 2), 10);
      const m = parseInt(digits.slice(2, 4), 10);
      const y = parseInt(digits.slice(4, 8), 10);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2020 && y <= 2100) {
        const maxD = new Date(y, m, 0).getDate();
        onChange(`${y}-${String(m).padStart(2, '0')}-${String(Math.min(d, maxD)).padStart(2, '0')}`);
      }
    }
  };

  return (
    <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div>
          {label && <span className="text-xs text-slate-300 font-semibold block">{label}</span>}
          <span className="text-xs font-extrabold text-indigo-400">Seçilen: {formatDateTR(safeVal)}</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {['STEPPER', 'CALENDAR', 'KEYBOARD'].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${viewMode === mode ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              {mode === 'STEPPER' ? 'Sayaç' : mode === 'CALENDAR' ? 'Takvim' : 'Klavye'}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'STEPPER' && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-1.5 flex flex-col items-center">
            <span className="text-[10px] text-slate-400">GÜN</span>
            <div className="flex items-center justify-between w-full mt-1">
              <button type="button" onClick={() => updateDateParts(year, month, day - 1)} className="w-7 h-7 rounded-lg bg-slate-800 active:bg-indigo-600 text-white font-bold">-</button>
              <span className="text-sm font-extrabold text-white">{String(day).padStart(2, '0')}</span>
              <button type="button" onClick={() => updateDateParts(year, month, day + 1)} className="w-7 h-7 rounded-lg bg-slate-800 active:bg-indigo-600 text-white font-bold">+</button>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-1.5 flex flex-col items-center">
            <span className="text-[10px] text-slate-400">AY</span>
            <div className="flex items-center justify-between w-full mt-1">
              <button type="button" onClick={() => updateDateParts(year, month - 1, day)} className="w-7 h-7 rounded-lg bg-slate-800 active:bg-indigo-600 text-white font-bold">-</button>
              <span className="text-xs font-extrabold text-white">{MONTHS_SHORT_TR[month - 1]}</span>
              <button type="button" onClick={() => updateDateParts(year, month + 1, day)} className="w-7 h-7 rounded-lg bg-slate-800 active:bg-indigo-600 text-white font-bold">+</button>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-1.5 flex flex-col items-center">
            <span className="text-[10px] text-slate-400">YIL</span>
            <div className="flex items-center justify-between w-full mt-1">
              <button type="button" onClick={() => updateDateParts(year - 1, month, day)} className="w-7 h-7 rounded-lg bg-slate-800 active:bg-indigo-600 text-white font-bold">-</button>
              <span className="text-xs font-extrabold text-white">{year}</span>
              <button type="button" onClick={() => updateDateParts(year + 1, month, day)} className="w-7 h-7 rounded-lg bg-slate-800 active:bg-indigo-600 text-white font-bold">+</button>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'CALENDAR' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => updateDateParts(year, month - 1, day)} className="p-1.5 rounded-lg bg-slate-800 text-slate-200"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs font-bold text-white">{MONTHS_TR[month - 1]} {year}</span>
            <button type="button" onClick={() => updateDateParts(year, month + 1, day)} className="p-1.5 rounded-lg bg-slate-800 text-slate-200"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => updateDateParts(year, month, d)}
                className={`py-1.5 rounded-lg text-xs font-bold ${d === day ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-300'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'KEYBOARD' && (
        <div>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="25.10.2026"
            value={manualText}
            onChange={handleManualInput}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-indigo-500 text-white text-sm font-bold tracking-widest text-center"
          />
          <p className="text-[10px] text-slate-400 text-center mt-1">Rakamları peş peşe yazın (Örn: 15112026)</p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5 pt-0.5">
        <button type="button" onClick={() => onChange(getTodayStr())} className="py-1.5 rounded-lg bg-slate-900 text-[10px] text-slate-300 font-semibold border border-slate-800">Bugün</button>
        <button type="button" onClick={() => onChange(addDaysToDateStr(getTodayStr(), 1))} className="py-1.5 rounded-lg bg-slate-900 text-[10px] text-slate-300 font-semibold border border-slate-800">Yarın</button>
        <button type="button" onClick={() => onChange(addDaysToDateStr(safeVal, 7))} className="py-1.5 rounded-lg bg-slate-900 text-[10px] text-slate-300 font-semibold border border-slate-800">+1 Hafta</button>
        <button type="button" onClick={() => onChange(addMonthsToDateStr(safeVal, 1))} className="py-1.5 rounded-lg bg-slate-900 text-[10px] text-slate-300 font-semibold border border-slate-800">+1 Ay</button>
      </div>
    </div>
  );
}

export function ConfirmModal({ dialog, onClose }) {
  if (!dialog) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
        <div className="flex items-center gap-2.5 text-rose-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <h3 className="text-base font-bold text-white">{dialog.title}</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{dialog.message}</p>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">Vazgeç</button>
          <button onClick={dialog.onConfirm} className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold">{dialog.confirmText || 'Onayla'}</button>
        </div>
      </div>
    </div>
  );
}

export function PasteBackupModal({ onClose, onRestore }) {
  const [text, setText] = useState('');
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Yedek Kodunu Yapıştır</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-300"><X className="w-4 h-4" /></button>
        </div>
        <textarea rows={6} placeholder='{"isDemo":false,"walletBalance":...' value={text} onChange={(e) => setText(e.target.value)} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono" />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">İptal</button>
          <button onClick={() => onRestore(text)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">Verileri Geri Yükle</button>
        </div>
      </div>
    </div>
  );
}

export function PaymentModal({ data, todayStr, walletBalance, onClose, onConfirm }) {
  const { debt, installment } = data;
  const remaining = installment.eval.remaining;
  const [payAmount, setPayAmount] = useState(String(remaining));
  const [deductFromWallet, setDeductFromWallet] = useState(true);
  const [paymentDate, setPaymentDate] = useState(todayStr);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 max-h-[92vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Ödeme İşle: {debt.title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-300"><X className="w-4 h-4" /></button>
        </div>
        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-slate-400">Dönem:</span><span className="font-semibold text-white">{installment.periodLabel}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Kalan Net Borç:</span><span className="font-bold text-emerald-400">{formatCurrency(remaining)}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Cüzdan Bakiyesi:</span><span className="font-semibold text-slate-200">{formatCurrency(walletBalance)}</span></div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-300 block mb-1">Ödenecek Tutar (TL)</label>
            <input type="text" inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold" />
          </div>
          <SmartDateInput label="Ödeme Tarihi" value={paymentDate} onChange={setPaymentDate} />
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
            <input type="checkbox" checked={deductFromWallet} onChange={(e) => setDeductFromWallet(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
            <span className="text-xs text-slate-200">Mevcut cüzdan bakiyemden otomatik düş</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">Vazgeç</button>
          <button onClick={() => onConfirm({ debt, installment, payAmount, deductFromWallet, paymentDate })} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">Ödemeyi Onayla</button>
        </div>
      </div>
    </div>
  );
}

export function InterestCalculatorModal({ data, todayStr, onClose, onConfirm }) {
  const { debt, installment } = data;
  const unpaidPrincipal = roundCurrency(Math.max(0, installment.baseAmount - (installment.paidAmount || 0)));
  const defaultDays = Math.max(1, Math.abs(diffDays(installment.dueDate, todayStr)));

  const [calcType, setCalcType] = useState('AUTO');
  const [monthlyRate, setMonthlyRate] = useState(String(debt.monthlyInterestRate || 5.0));
  const [days, setDays] = useState(String(defaultDays));
  const [includeTax, setIncludeTax] = useState(debt.type === 'LOAN' || debt.type === 'CREDIT_CARD' || debt.type === 'KMH');
  const [manualAmount, setManualAmount] = useState(String(installment.lateInterest || 0));
  const [applyMode, setApplyMode] = useState('REPLACE');

  const rawInterest = roundCurrency((unpaidPrincipal * parseFlexibleNumber(monthlyRate) * parseFlexibleNumber(days)) / 3000);
  const taxAmount = includeTax ? roundCurrency(rawInterest * 0.3) : 0;
  const calculatedTotal = roundCurrency(rawInterest + taxAmount);
  const finalAmount = calcType === 'AUTO' ? calculatedTotal : roundCurrency(manualAmount);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">{debt.type === 'KMH' ? 'KMH Günlük Faiz Motoru' : 'Gecikme Faizi Hesapla'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-300"><X className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button onClick={() => setCalcType('AUTO')} className={`py-1.5 rounded-lg text-xs font-semibold ${calcType === 'AUTO' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Otomatik Formül</button>
          <button onClick={() => setCalcType('MANUAL')} className={`py-1.5 rounded-lg text-xs font-semibold ${calcType === 'MANUAL' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Manuel Tutar Gir</button>
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
                <input type="text" inputMode="decimal" value={monthlyRate} onChange={(e) => setMonthlyRate(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold" />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Gün Sayısı</label>
                <input type="text" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold" />
              </div>
            </div>
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
              <input type="checkbox" checked={includeTax} onChange={(e) => setIncludeTax(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
              <span className="text-slate-200">+%30 Vergi Yükü Ekle (%15 KKDF + %15 BSMV)</span>
            </label>
            <div className="bg-amber-950/25 border border-amber-500/30 rounded-xl p-3 space-y-1">
              <div className="flex justify-between text-slate-300"><span>Ham Günlük Faiz:</span><span>{formatCurrency(rawInterest)}</span></div>
              <div className="flex justify-between text-slate-300"><span>KKDF + BSMV Vergisi:</span><span>{formatCurrency(taxAmount)}</span></div>
              <div className="flex justify-between text-amber-300 font-bold pt-1 border-t border-amber-500/20"><span>Hesaplanan Net Faiz:</span><span>{formatCurrency(calculatedTotal)}</span></div>
            </div>
          </div>
        ) : (
          <div>
            <label className="text-xs text-slate-300 block mb-1">Manuel Faiz Tutarı (TL)</label>
            <input type="text" inputMode="decimal" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <button onClick={() => setApplyMode('REPLACE')} className={`p-2 rounded-xl border text-center font-semibold ${applyMode === 'REPLACE' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>Toplam Güncel Faiz Olarak Kaydet</button>
          <button onClick={() => setApplyMode('ADD')} className={`p-2 rounded-xl border text-center font-semibold ${applyMode === 'ADD' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>Mevcut Faizin Üzerine Ekle</button>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">İptal</button>
          <button onClick={() => onConfirm({ debtId: debt.id, installmentId: installment.id, finalInterestAmount: finalAmount, mode: applyMode })} className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-extrabold">Faizi Taksite İşle</button>
        </div>
      </div>
    </div>
  );
}

export function DebtFormModal({ editingDebt, todayStr, debtTypes, priorities, onClose, onSave }) {
  const [title, setTitle] = useState(editingDebt?.title || '');
  const [type, setType] = useState(editingDebt?.type || 'LOAN');
  const [priority, setPriority] = useState(editingDebt?.priority || 'HIGH');
  const [amount, setAmount] = useState('');
  const [amountMode, setAmountMode] = useState('PER_INSTALLMENT');
  const [installmentCount, setInstallmentCount] = useState('1');
  const [firstDueDate, setFirstDueDate] = useState(todayStr);
  const [reminderDays, setReminderDays] = useState(String(editingDebt?.reminderDays ?? 3));
  const [monthlyInterestRate, setMonthlyInterestRate] = useState(String(editingDebt?.monthlyInterestRate ?? 5.0));
  const [statementDay, setStatementDay] = useState(String(editingDebt?.statementDay ?? 1));
  const [kmhLimit, setKmhLimit] = useState(String(editingDebt?.kmhLimit ?? 0));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 max-h-[92vh] overflow-y-auto space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">{editingDebt ? 'Borç Bilgilerini Düzenle' : 'Yeni Borç / Yükümlülük Ekle'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-300"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 block mb-1">Borç Başlığı / Kurum Adı</label>
            <input type="text" placeholder="Örn: Garanti KMH, Akbank Kredi..." value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-slate-300 block mb-1">Kategori</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                {Object.entries(debtTypes).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-300 block mb-1">Önem Derecesi</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                {Object.entries(priorities).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          {!editingDebt && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-300 block mb-1">Tutar Giriş Tipi</label>
                  <select value={amountMode} onChange={(e) => setAmountMode(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
                    <option value="PER_INSTALLMENT">Aylık Taksit / Dönem Tutarı</option>
                    <option value="TOTAL_DIVIDED">Toplam Borcu Taksite Böl</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Tutar (TL)</label>
                  <input type="text" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold" />
                </div>
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Taksit / Dönem Sayısı</label>
                <input type="text" inputMode="numeric" value={installmentCount} onChange={(e) => setInstallmentCount(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white" />
              </div>
              <SmartDateInput label="İlk Son Ödeme Tarihi" value={firstDueDate} onChange={setFirstDueDate} />
            </>
          )}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-slate-300 block mb-1">Kaç Gün Kala Uyar?</label>
              <input type="text" inputMode="numeric" value={reminderDays} onChange={(e) => setReminderDays(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-300 block mb-1">Aylık Faiz (%)</label>
              <input type="text" inputMode="decimal" value={monthlyInterestRate} onChange={(e) => setMonthlyInterestRate(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-slate-300 block mb-1">Ekstre Günü</label>
              <input type="text" inputMode="numeric" value={statementDay} onChange={(e) => setStatementDay(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white" />
            </div>
          </div>
          {type === 'KMH' && (
            <div>
              <label className="text-amber-300 block mb-1">Tanımlı KMH Limiti (TL)</label>
              <input type="text" inputMode="decimal" value={kmhLimit} onChange={(e) => setKmhLimit(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/40 text-white" />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">İptal</button>
          <button
            onClick={() => {
              if (!title.trim()) return;
              if (!editingDebt && roundCurrency(amount) <= 0) return;
              onSave({ title, type, priority, amount, amountMode, installmentCount, firstDueDate, reminderDays, monthlyInterestRate, statementDay, kmhLimit });
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
          >
            {editingDebt ? 'Güncelle' : 'Borcu Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CashModal({ mode, currentBalance, todayStr, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(mode === 'INCOME' ? 'Maaş / Gelir' : 'Market & Gıda');
  const [amount, setAmount] = useState(mode === 'SET_BALANCE' ? String(currentBalance) : '');
  const [date, setDate] = useState(todayStr);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 max-h-[92vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">
            {mode === 'INCOME' && '+ Cüzdana Gelir Ekle'}
            {mode === 'EXPENSE' && '- Günlük Harcama / Gider Düş'}
            {mode === 'SET_BALANCE' && 'Cüzdan Bakiyesini Eşitle'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-300"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3 text-xs">
          {mode !== 'SET_BALANCE' && (
            <>
              <div>
                <label className="text-slate-300 block mb-1">Kategori</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white">
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
                <input type="text" placeholder="Açıklama yazın..." value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white" />
              </div>
            </>
          )}
          <div>
            <label className="text-slate-300 block mb-1">{mode === 'SET_BALANCE' ? 'Yeni Net Cüzdan Bakiyesi (TL)' : 'Tutar (TL)'}</label>
            <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold" />
          </div>
          <SmartDateInput label="İşlem Tarihi" value={date} onChange={setDate} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">İptal</button>
          <button onClick={() => onSave({ mode, title, category, amount, date })} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">Kaydet</button>
        </div>
      </div>
    </div>
  );
}

export function NewPeriodModal({ debt, todayStr, onClose, onSave }) {
  const lastInst = debt.installments[debt.installments.length - 1];
  const [periodLabel, setPeriodLabel] = useState(`${debt.installments.length + 1}. Dönem / Ekstre`);
  const [dueDate, setDueDate] = useState(lastInst ? addMonthsToDateStr(lastInst.dueDate, 1) : todayStr);
  const [baseAmount, setBaseAmount] = useState(String(lastInst?.baseAmount || ''));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 max-h-[92vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Yeni Dönem Ekle: {debt.title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-300"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 block mb-1">Dönem / Ekstre Adı</label>
            <input type="text" value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white" />
          </div>
          <SmartDateInput label="Son Ödeme Tarihi" value={dueDate} onChange={setDueDate} />
          <div>
            <label className="text-slate-300 block mb-1">Dönem Borcu / Fatura Tutarı (TL)</label>
            <input type="text" inputMode="decimal" value={baseAmount} onChange={(e) => setBaseAmount(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">İptal</button>
          <button onClick={() => onSave({ debtId: debt.id, periodLabel, dueDate, baseAmount })} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">Dönemi Ekle</button>
        </div>
      </div>
    </div>
  );
}

export function EditInstallmentModal({ data, onClose, onSave }) {
  const { debtId, installment } = data;
  const [periodLabel, setPeriodLabel] = useState(installment.periodLabel);
  const [dueDate, setDueDate] = useState(installment.dueDate);
  const [baseAmount, setBaseAmount] = useState(String(installment.baseAmount));
  const [lateInterest, setLateInterest] = useState(String(installment.lateInterest || 0));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 max-h-[92vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Taksit / Dönem Düzenle</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-300"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 block mb-1">Dönem Başlığı</label>
            <input type="text" value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white" />
          </div>
          <SmartDateInput label="Son Ödeme Tarihi" value={dueDate} onChange={setDueDate} />
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-slate-300 block mb-1">Anapara / Tutar (TL)</label>
              <input type="text" inputMode="decimal" value={baseAmount} onChange={(e) => setBaseAmount(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold" />
            </div>
            <div>
              <label className="text-slate-300 block mb-1">İşlemiş Faiz (TL)</label>
              <input type="text" inputMode="decimal" value={lateInterest} onChange={(e) => setLateInterest(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">İptal</button>
          <button onClick={() => onSave({ debtId, installmentId: installment.id, periodLabel, dueDate, baseAmount, lateInterest })} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">Güncelle</button>
        </div>
      </div>
    </div>
  );
}

export function CleanStartModal({ onClose, onConfirm }) {
  const [initialWallet, setInitialWallet] = useState('0');
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Temiz Başlangıç (Canlı Mod)</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-300"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Uygulamadaki tüm örnek (demo) borçlar silinecek. Şu an cebinizde veya hesabınızda bulunan gerçek bakiyeyi yazarak başlayabilirsiniz.
        </p>
        <div>
          <label className="text-xs text-slate-300 block mb-1">Başlangıç Cüzdan Bakiyeniz (TL)</label>
          <input type="text" inputMode="decimal" value={initialWallet} onChange={(e) => setInitialWallet(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">Vazgeç</button>
          <button onClick={() => onConfirm(initialWallet)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">Sıfırla ve Başla</button>
        </div>
      </div>
    </div>
  );
}