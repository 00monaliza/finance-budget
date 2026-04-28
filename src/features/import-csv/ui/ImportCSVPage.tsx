import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';
import { Button, Card, Badge } from '@/shared/ui';
import { parseKaspiCSV } from '../lib/parseKaspiCSV';
import { parseFileWithGemini } from '@/shared/api/gemini';
import { createTransaction, type Transaction } from '@/entities/transaction';
import { useAuthStore } from '@/entities/user';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { cn } from '@/shared/lib/cn';

type PreviewRow = Partial<Transaction> & { _selected: boolean; _error?: string };

const ACCEPTED = '.csv,.pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls';

function isCSV(file: File) {
  return file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
}

export function ImportCSVPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [done, setDone] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setParseError(null);
    setRows([]);
    setDone(false);

    if (isCSV(file)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const parsed = parseKaspiCSV(text);
        setRows(parsed.map(r => ({ ...r, _selected: true })));
      };
      reader.readAsText(file, 'utf-8');
      return;
    }

    setParsing(true);
    try {
      const parsed = await parseFileWithGemini(file);
      if (parsed.length === 0) {
        setParseError('AI не нашёл транзакций в файле. Убедитесь, что это банковская выписка.');
        return;
      }
      setRows(parsed.map(r => ({
        amount: r.amount,
        type: r.type,
        description: r.description,
        date: r.date,
        _selected: true,
      })));
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Ошибка при разборе файла через AI.');
    } finally {
      setParsing(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
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
      <div className="mx-auto w-full max-w-lg">
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
    <div className="mx-auto w-full max-w-3xl space-y-4 text-white">
      <Card>
        <h2 className="text-lg font-semibold text-white mb-1">Импорт банковской выписки</h2>
        <p className="text-sm text-white/60 mb-4">
          Загрузите файл выписки — CSV, PDF, фото чека или скриншот. AI распознает транзакции автоматически.
        </p>

        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => !parsing && fileRef.current?.click()}
          className={cn(
            'cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors sm:p-8',
            parsing
              ? 'border-[#DA7B93]/40 bg-[#DA7B93]/5'
              : 'border-white/20 hover:border-[#5DCAA5]/60 hover:bg-white/6'
          )}
        >
          {parsing ? (
            <>
              <Loader2 size={32} className="mx-auto text-[#DA7B93] mb-3 animate-spin" />
              <p className="text-sm font-medium text-white/75">AI читает файл…</p>
              <p className="text-xs text-white/45 mt-1">Это может занять несколько секунд</p>
            </>
          ) : (
            <>
              <Upload size={32} className="mx-auto text-white/35 mb-3" />
              <p className="text-sm font-medium text-white/75">
                {fileName || 'Перетащите файл или нажмите для выбора'}
              </p>
              <p className="text-xs text-white/50 mt-1">CSV · PDF · Фото · Скриншот · Excel</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={e => e.target.files?.[0] && void handleFile(e.target.files[0])}
          />
        </div>

        {parseError && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#E24B4A]/10 px-4 py-3 border border-[#E24B4A]/30">
            <AlertCircle size={16} className="text-[#E24B4A] shrink-0 mt-0.5" />
            <span className="text-sm text-[#E24B4A]">{parseError}</span>
          </div>
        )}
      </Card>

      {rows.length > 0 && (
        <Card padding="none">
          <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-white/45" />
              <span className="text-sm font-medium text-white/80">
                Найдено {rows.length} транзакций
              </span>
              <Badge variant="neutral">{selectedCount} выбрано</Badge>
            </div>
            <div className="flex gap-2 sm:justify-end">
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
                  'cursor-pointer px-4 py-3 transition-colors sm:px-5',
                  row._selected ? 'bg-white/6' : 'bg-transparent opacity-55'
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={row._selected}
                    onChange={() => toggleRow(i)}
                    onClick={e => e.stopPropagation()}
                    className="mt-1 rounded"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white/90">{row.description || '—'}</p>
                    <p className="mt-0.5 text-xs text-white/45">{row.date}</p>
                  </div>
                  <span className={cn(
                    'shrink-0 text-sm font-semibold sm:hidden',
                    row.type === 'income' ? 'text-[#1D9E75]' : 'text-[#E24B4A]'
                  )}>
                    {row.type === 'income' ? '+' : '−'}{formatCurrency(row.amount ?? 0)}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 sm:mt-1 sm:justify-end">
                  <Badge variant={row.type as 'income' | 'expense'}>
                    {row.type === 'income' ? 'Доход' : 'Расход'}
                  </Badge>
                  <span className={cn(
                    'hidden w-28 text-right text-sm font-semibold sm:block',
                    row.type === 'income' ? 'text-[#1D9E75]' : 'text-[#E24B4A]'
                  )}>
                    {row.type === 'income' ? '+' : '−'}{formatCurrency(row.amount ?? 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {mutation.isError && (
            <div className="flex items-center gap-2 px-5 py-3 bg-[#E24B4A]/10 border-t border-[#E24B4A]/30">
              <AlertCircle size={16} className="text-[#E24B4A]" />
              <span className="text-sm text-[#E24B4A]">Ошибка импорта</span>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <button
              onClick={() => { setRows([]); setFileName(''); setParseError(null); }}
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

      <Card padding="sm" className="bg-[#5DCAA5]/10 border-[#5DCAA5]/30">
        <div className="flex gap-3">
          <FileText size={18} className="text-[#5DCAA5] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[#7de0c0]">Поддерживаемые форматы</p>
            <p className="mt-1 text-xs text-[#b3edd9]">
              <strong>CSV</strong> — выписка Kaspi Bank (Экспорт → CSV)<br />
              <strong>PDF / изображение / скриншот</strong> — AI распознает транзакции автоматически<br />
              Категории можно назначить вручную после импорта.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
