import { describe, it, expect } from 'vitest'
import { gerarCsvClientes } from './csv'
import type { Perfil } from '../types'

const base: Perfil = {
  id: '1', created_at: '', updated_at: '', nome: 'Maria, Silva', email: 'm@x.com',
  telefone: '96999990000', cidade: 'Macapá', ativo: true, plano: 'completo',
  status_assinatura: 'ativa', valor_plano: 99, data_inicio: '2026-06-01', data_venc: '2026-07-01', is_adm: false,
}

describe('gerarCsvClientes', () => {
  it('gera cabeçalho e linhas, com aspas em campos com vírgula', () => {
    const csv = gerarCsvClientes([base])
    const linhas = csv.trim().split('\n')
    expect(linhas[0]).toBe('Nome,Email,Telefone,Cidade,Plano,Status,Vencimento')
    expect(linhas[1]).toContain('"Maria, Silva"')
    expect(linhas[1]).toContain('m@x.com')
  })
})
