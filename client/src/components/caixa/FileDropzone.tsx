import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, FileSpreadsheet, File, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type FileType = 'ofx' | 'csv' | 'txt' | 'pdf';

interface FileInfo {
  file: File;
  type: FileType;
  preview?: string;
  lines?: number;
}

interface FileDropzoneProps {
  onFileSelect: (fileInfo: FileInfo) => void;
  onClear?: () => void;
  acceptedTypes?: FileType[];
  maxSize?: number; // in MB
  disabled?: boolean;
  className?: string;
}

const FILE_EXTENSIONS: Record<FileType, string[]> = {
  ofx: ['.ofx', '.qfx'],
  csv: ['.csv'],
  txt: ['.txt'],
  pdf: ['.pdf'],
};

const FILE_ICONS: Record<FileType, typeof FileText> = {
  ofx: FileSpreadsheet,
  csv: FileSpreadsheet,
  txt: FileText,
  pdf: File,
};

const FILE_LABELS: Record<FileType, string> = {
  ofx: 'OFX (Open Financial Exchange)',
  csv: 'CSV (Valores separados)',
  txt: 'TXT (Texto)',
  pdf: 'PDF (Documento)',
};

function detectFileType(filename: string): FileType | null {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  for (const [type, extensions] of Object.entries(FILE_EXTENSIONS)) {
    if (extensions.includes(ext)) return type as FileType;
  }
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropzone({
  onFileSelect,
  onClear,
  acceptedTypes = ['ofx', 'csv', 'txt'],
  maxSize = 10, // 10MB default
  disabled = false,
  className,
}: FileDropzoneProps) {
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const acceptedExtensions = acceptedTypes.flatMap((t) => FILE_EXTENSIONS[t]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null);
      
      if (acceptedFiles.length === 0) return;
      
      const file = acceptedFiles[0];
      const fileType = detectFileType(file.name);

      if (!fileType || !acceptedTypes.includes(fileType)) {
        setError(`Formato não suportado. Use: ${acceptedTypes.join(', ').toUpperCase()}`);
        return;
      }

      if (file.size > maxSize * 1024 * 1024) {
        setError(`Arquivo muito grande. Máximo: ${maxSize}MB`);
        return;
      }

      setIsProcessing(true);

      try {
        // Read first lines for preview
        let preview = '';
        let lines = 0;

        if (fileType !== 'pdf') {
          const text = await file.text();
          const allLines = text.split('\n');
          lines = allLines.length;
          preview = allLines.slice(0, 5).join('\n');
        }

        const fileInfo: FileInfo = { file, type: fileType, preview, lines };
        setSelectedFile(fileInfo);
        onFileSelect(fileInfo);
      } catch (err) {
        setError('Erro ao ler arquivo');
      } finally {
        setIsProcessing(false);
      }
    },
    [acceptedTypes, maxSize, onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedExtensions.reduce(
      (acc, ext) => ({ ...acc, [`application/${ext.slice(1)}`]: [ext] }),
      {}
    ),
    maxFiles: 1,
    disabled: disabled || isProcessing,
  });

  const handleClear = () => {
    setSelectedFile(null);
    setError(null);
    onClear?.();
  };

  const Icon = selectedFile ? FILE_ICONS[selectedFile.type] : Upload;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Dropzone Area */}
      <div
        {...getRootProps()}
        className={cn(
          'relative rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer',
          'hover:border-primary/50 hover:bg-primary/5',
          isDragActive && !isDragReject && 'border-primary bg-primary/10 scale-[1.01]',
          isDragReject && 'border-destructive bg-destructive/10',
          error && 'border-destructive',
          selectedFile && 'border-emerald-500 bg-emerald-500/5',
          (disabled || isProcessing) && 'opacity-50 cursor-not-allowed',
          'p-6'
        )}
      >
        <input {...getInputProps()} />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">Processando arquivo...</p>
          </div>
        ) : selectedFile ? (
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/10">
              <Icon className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <p className="font-medium truncate">{selectedFile.file.name}</p>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{formatFileSize(selectedFile.file.size)}</span>
                <span className="px-1.5 py-0.5 rounded bg-muted uppercase font-mono">
                  {selectedFile.type}
                </span>
                {selectedFile.lines && <span>{selectedFile.lines} linhas</span>}
              </div>
              {selectedFile.preview && (
                <pre className="mt-2 p-2 rounded bg-muted text-xs font-mono overflow-x-auto max-h-20 overflow-y-auto">
                  {selectedFile.preview}
                </pre>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <div
              className={cn(
                'p-4 rounded-full transition-colors',
                isDragActive ? 'bg-primary/20' : 'bg-muted'
              )}
            >
              <Upload
                className={cn(
                  'h-8 w-8 transition-transform',
                  isDragActive && 'scale-110 text-primary'
                )}
              />
            </div>
            <div className="text-center">
              <p className="font-medium">
                {isDragActive ? 'Solte o arquivo aqui' : 'Arraste o arquivo ou clique para selecionar'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Formatos: {acceptedTypes.map((t) => t.toUpperCase()).join(', ')} • Máx: {maxSize}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Supported Formats Legend */}
      {!selectedFile && (
        <div className="flex flex-wrap gap-2">
          {acceptedTypes.map((type) => {
            const Icon = FILE_ICONS[type];
            return (
              <div
                key={type}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-xs"
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{FILE_LABELS[type]}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

