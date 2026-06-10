import { describe, it, expect } from 'vitest'
import { linkWhatsApp } from './whatsapp'

describe('linkWhatsApp', () => {
  it('monta link wa.me com 55 e mensagem encodada', () => {
    expect(linkWhatsApp('(96) 99999-1234', 'Olá, tudo bem?'))
      .toBe('https://wa.me/5596999991234?text=Ol%C3%A1%2C%20tudo%20bem%3F')
  })
  it('retorna null para telefone vazio/curto', () => {
    expect(linkWhatsApp('', 'oi')).toBeNull()
    expect(linkWhatsApp('123', 'oi')).toBeNull()
  })
})
