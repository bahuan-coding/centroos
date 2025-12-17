import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function Settings() {
  const [form, setForm] = useState({ name: '', cnpj: '', address: '', city: '', state: '', zipCode: '', phone: '', email: '' });

  const utils = trpc.useUtils();
  const { data: org } = trpc.organization.get.useQuery();
  const updateMutation = trpc.organization.update.useMutation({ onSuccess: () => { utils.organization.get.invalidate(); toast.success('Configurações salvas'); } });

  useEffect(() => {
    if (org) {
      setForm({
        name: org.name || '',
        cnpj: org.cnpj || '',
        address: org.address || '',
        city: org.city || '',
        state: org.state || '',
        zipCode: org.zipCode || '',
        phone: org.phone || '',
        email: org.email || '',
      });
    }
  }, [org]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form as any);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Configurações</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Dados da organização</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Dados da Entidade</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Informações que aparecerão nos relatórios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label className="text-sm">Nome da Entidade</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Centro Espírita..." required className="text-sm" />
              </div>
              <div>
                <Label className="text-sm">CNPJ</Label>
                <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" className="text-sm" />
              </div>
              <div>
                <Label className="text-sm">Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" className="text-sm" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm">E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contato@entidade.org.br" className="text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-sm">Endereço</Label>
              <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, bairro" className="text-sm" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-sm">Cidade</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="text-sm" />
              </div>
              <div>
                <Label className="text-sm">UF</Label>
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} maxLength={2} className="text-sm" />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Label className="text-sm">CEP</Label>
              <Input value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} placeholder="00000-000" className="text-sm" />
            </div>
            <div className="pt-4">
              <Button type="submit" disabled={updateMutation.isPending} className="w-full sm:w-auto">
                {updateMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

