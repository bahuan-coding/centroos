import { useMemo } from 'react';
import { trpc } from './trpc';

/**
 * Hook para verificar permissões do usuário atual.
 * Retorna funções utilitárias para verificar acesso a funcionalidades.
 */
export function usePermissions() {
  const { data: user, isLoading } = trpc.usuarios.me.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    refetchOnWindowFocus: false,
  });

  const permissoes = useMemo(() => new Set(user?.permissoes || []), [user?.permissoes]);
  const papeis = useMemo(() => new Set(user?.papeis?.map(p => p.codigo) || []), [user?.papeis]);

  /**
   * Verifica se o usuário tem uma permissão específica.
   * Formato: modulo.entidade.acao (ex: "sistema.usuario.gerenciar")
   */
  const temPermissao = (codigo: string): boolean => {
    if (!user) return false;
    // Admin tem todas as permissões
    if (papeis.has('admin')) return true;
    return permissoes.has(codigo);
  };

  /**
   * Verifica se o usuário tem pelo menos uma das permissões listadas.
   */
  const temAlgumaPermissao = (...codigos: string[]): boolean => {
    return codigos.some(c => temPermissao(c));
  };

  /**
   * Verifica se o usuário tem todas as permissões listadas.
   */
  const temTodasPermissoes = (...codigos: string[]): boolean => {
    return codigos.every(c => temPermissao(c));
  };

  /**
   * Verifica se o usuário tem um papel específico.
   */
  const temPapel = (codigo: string): boolean => {
    return papeis.has(codigo);
  };

  /**
   * Verifica se o usuário tem nível >= ao especificado.
   */
  const temNivel = (nivelMinimo: number): boolean => {
    return (user?.nivelMaximo || 0) >= nivelMinimo;
  };

  /**
   * Verifica se é admin (papel ou role legado).
   */
  const isAdmin = papeis.has('admin');

  /**
   * Verifica se é apenas visualizador (somente leitura).
   */
  const isVisualizador = papeis.has('visualizador') && papeis.size === 1;

  /**
   * Verifica se é auditor.
   */
  const isAuditor = papeis.has('auditor');

  return {
    user,
    isLoading,
    permissoes: Array.from(permissoes),
    papeis: Array.from(papeis),
    nivelMaximo: user?.nivelMaximo || 0,
    temPermissao,
    temAlgumaPermissao,
    temTodasPermissoes,
    temPapel,
    temNivel,
    isAdmin,
    isVisualizador,
    isAuditor,
    // Permissões comuns para facilitar uso
    podeGerenciarUsuarios: temPermissao('sistema.usuario.gerenciar'),
    podeGerenciarPapeis: temPermissao('sistema.papel.gerenciar'),
    podeConfigurarSistema: temPermissao('sistema.configuracao.editar'),
    podeVerAuditoria: temPermissao('sistema.auditoria.visualizar'),
    podeCriarTitulos: temPermissao('titulos.titulo.criar'),
    podeAprovarTitulos: temPermissao('titulos.titulo.aprovar'),
  };
}














