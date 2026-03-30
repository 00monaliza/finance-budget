import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button, Card, Badge } from '@/shared/ui';
import { parseKaspiCSV } from '../lib/parseKaspiCSV';
import { createTransaction, type Transaction } from '@/entities/transaction';
import { fetchCategories } from '@/entities/category';
import { useAuthStore } from '@/entities/user';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { cn } from '@/shared/lib/cn';

type PreviewRow = Partial<Transaction> & { _selected: boolean; _error?: string };

export function ImportCSVPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [done, setDone] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseKaspiCSV(text);
      setRows(parsed.map(r => ({ ...r, _selected: true })));
      setDone(false);
    };
    reader.readAsText(file, 'utf-8');
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const selected = rows.filter(r => r._selected);
      for (const row of selected) {
        await createTransaction({
          user_id: user!.id,
          amount: row.amount!,
          type: row.type ?? 'expense',
          category_id: null,
          description: row.description ?? null,
          date: row.date!,
          account: 'kaspi',
          tags: null,
          ai_categorized: false,
        });
      }
      return selected.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setDone(true);
    },
  });

  const toggleRow = (i: number) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, _selected: !r._selected } : r));
  };

  const selectedCount = rows.filter(r => r._selected).length;

  if (done) {
    return (
      <div className="max-w-lg mx-auto">
        <Card className="text-center py-12">
          <CheckCircle size={48} className="text-[#1D9E75] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white">Импорт завершён!</h2>
          <p className="text-white/60 mt-2">{selectedCount} транзакций добавлено</p>
          <Button className="mt-6" onClick={() => { setRows([]); setDone(false); setFileName(''); }}>
            Импортировать ещё
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 text-white">
      <Card>
        <h2 className="text-lg font-semibold text-white mb-1">Импорт выписки Kaspi Bank</h2>
        <p className="text-sm text-white/60 mb-4">
          Скачайте CSV из приложения Kaspi → История → Экспорт и загрузите файл
        </p>

        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed border-white/20 p-8 text-center transition-colors hover:border-[#5DCAA5]/60 hover:bg-white/6"
        >
          <Upload size={32} className="mx-auto text-white/35 mb-3" />
          <p className="text-sm font-medium text-white/75">
            {fileName || 'Перетащите CSV файл или нажмите для выбора'}
          </p>
          <p className="text-xs text-white/50 mt-1">Формат: Kaspi Bank CSV (UTF-8)</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      </Card>

      {rows.length > 0 && (
        <Card padding="none">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-white/45" />
              <span className="text-sm font-medium text-white/80">
                Найдено {rows.length} транзакций
              </span>
              <Badge variant="neutral">{selectedCount} выбрано</Badge>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRows(prev => prev.map(r => ({ ...r, _selected: true })))}
                className="text-xs text-[#5DCAA5] hover:underline"
              >
                Выбрать все
              </button>
              <button
                onClick={() => setRows(prev => prev.map(r => ({ ...r, _selected: false })))}
                className="text-xs text-white/50 hover:underline"
              >
                Снять все
              </button>
            </div>
          </div>

          <div className="max-h-96 divide-y divide-white/8 overflow-y-auto">
            {rows.map((row, i) => (
              <div
                key={i}
                onClick={() => toggleRow(i)}
                className={cn(
                  'flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors',
                  row._selected ? 'bg-white/6' : 'bg-transparent opacity-55'
                )}
              >
                <input
                  type="checkbox"
                  checked={row._selected}
                  onChange={() => toggleRow(i)}
                  onClick={e => e.stopPropagation()}
                  className="rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/90 truncate">{row.description || '—'}</p>
                  <p className="text-xs text-white/45">{row.date}</p>
                </div>
                <Badge variant={row.type as 'income' | 'expense'}>
                  {row.type === 'income' ? 'Доход' : 'Расход'}
                </Badge>
                <span className={cn(
                  'text-sm font-semibold w-28 text-right',
                  row.type === 'income' ? 'text-[#1D9E75]' : 'text-[#E24B4A]'
                )}>
                  {row.type === 'income' ? '+' : '−'}{formatCurrency(row.amount ?? 0)}
                </span>
              </div>
            ))}
          </div>

          {mutation.isError && (
            <div className="flex items-center gap-2 px-5 py-3 bg-[#E24B4A]/10 border-t border-[#E24B4A]/30">
              <AlertCircle size={16} className="text-[#E24B4A]" />
              <span className="text-sm text-[#E24B4A]">Ошибка импорта</span>
            </div>
          )}

          <div className="flex items-center justify-between px-5 py-4 border-t border-white/10">
            <button
              onClick={() => { setRows([]); setFileName(''); }}
              className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80"
            >
              <X size={14} /> Отмена
            </button>
            <Button
              disabled={selectedCount === 0}
              loading={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              Импортировать {selectedCount > 0 ? `(${selectedCount})` : ''}
            </Button>
          </div>
        </Card>
      )}

      {/* Format hint */}
      <Card padding="sm" className="bg-[#EF9F27]/10 border-[#EF9F27]/30">
        <div className="flex gap-3">
          <AlertCircle size={18} className="text-[#EF9F27] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[#f4c46b]">Формат CSV</p>
            <p className="text-xs text-[#f0d8a9] mt-1">
              Ожидаемый формат колонок: <code className="rounded bg-[#EF9F27]/20 px-1">Дата;Описание;Сумма</code><br />
              Категории можно назначить вручную после импорта.
            </p>
          </div>
        </div>
      </Card>

      <p className="text-xs text-white/45 text-center">
        Доступные категории: {categories.length}
      </p>
    </div>
  );
}
