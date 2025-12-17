import { useState } from 'react';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function Import() {
  const [file, setFile] = useState<File | null>(null);
  const [bank, setBank] = useState('banco_brasil');
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Importar Extrato</h1>
        <p className="text-muted-foreground">Importe extratos bancários em PDF, CSV ou OFX</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload de Arquivo</CardTitle>
          <CardDescription>Arraste o arquivo ou clique para selecionar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
              isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle className="h-12 w-12 text-green-600" />
                <p className="text-lg font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                  Remover
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Arraste o extrato bancário aqui</h3>
                <p className="text-sm text-muted-foreground mb-4">ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground">PDF, CSV, OFX (máx. 10MB)</p>
              </>
            )}
            <input id="file-input" type="file" accept=".pdf,.csv,.ofx" className="hidden" onChange={handleFileChange} />
          </div>

          <div>
            <Label>Banco</Label>
            <Select value={bank} onValueChange={setBank}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="banco_brasil">Banco do Brasil</SelectItem>
                <SelectItem value="caixa_economica">Caixa Econômica Federal</SelectItem>
                <SelectItem value="other">Outro Banco</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button disabled={!file} className="w-full">
            Processar Extrato
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bancos Suportados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold">Banco do Brasil</h4>
              <p className="text-sm text-muted-foreground">PDF, CSV, OFX</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold">Caixa Econômica</h4>
              <p className="text-sm text-muted-foreground">PDF, CSV</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold">Outros Bancos</h4>
              <p className="text-sm text-muted-foreground">CSV, OFX</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

