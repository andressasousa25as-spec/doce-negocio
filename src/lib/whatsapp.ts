export function linkWhatsApp(telefone: string | undefined | null, mensagem: string): string | null {
  const digitos = (telefone || '').replace(/\D/g, '')
  if (digitos.length < 10) return null
  const comDDI = digitos.startsWith('55') ? digitos : '55' + digitos
  return `https://wa.me/${comDDI}?text=${encodeURIComponent(mensagem)}`
}
