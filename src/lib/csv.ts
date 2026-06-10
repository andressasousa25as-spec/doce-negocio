import type { Perfil } from '../types'

function campo(v: unknown): string {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

export function gerarCsvClientes(perfis: Perfil[]): string {
  const cab = ['Nome', 'Email', 'Telefone', 'Cidade', 'Plano', 'Status', 'Vencimento']
  const linhas = perfis.map(p => [
    p.nome, p.email, p.telefone || '', p.cidade, p.plano, p.status_assinatura, p.data_venc || '',
  ].map(campo).join(','))
  return [cab.join(','), ...linhas].join('\n')
}
