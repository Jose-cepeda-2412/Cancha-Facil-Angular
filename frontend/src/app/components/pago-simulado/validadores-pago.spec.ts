import {
  formatearNumeroTarjeta,
  formatearVencimiento,
  franquicia,
  luhnValido,
  vencimientoVigente,
} from './validadores-pago';

describe('validadores de pago simulado', () => {
  it('Luhn acepta tarjetas de prueba válidas y rechaza números alterados', () => {
    expect(luhnValido('4242 4242 4242 4242')).toBe(true);
    expect(luhnValido('5555555555554444')).toBe(true);
    expect(luhnValido('4242 4242 4242 4241')).toBe(false);
    expect(luhnValido('1234')).toBe(false);
  });

  it('detecta la franquicia por los primeros dígitos', () => {
    expect(franquicia('4242')).toBe('Visa');
    expect(franquicia('5555')).toBe('Mastercard');
    expect(franquicia('3782')).toBe('American Express');
    expect(franquicia('9999')).toBe('Tarjeta');
  });

  it('vencimiento MM/AA: vigente hasta fin de mes, rechaza vencidas y meses inválidos', () => {
    const hoy = new Date(2026, 10, 23); // 23 de noviembre de 2026
    expect(vencimientoVigente('11/26', hoy)).toBe(true);
    expect(vencimientoVigente('12/30', hoy)).toBe(true);
    expect(vencimientoVigente('10/26', hoy)).toBe(false);
    expect(vencimientoVigente('13/27', hoy)).toBe(false);
    expect(vencimientoVigente('1227', hoy)).toBe(false);
  });

  it('formatea número y vencimiento mientras se escribe', () => {
    expect(formatearNumeroTarjeta('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(formatearNumeroTarjeta('42a4-2')).toBe('4242');
    expect(formatearVencimiento('1228')).toBe('12/28');
    expect(formatearVencimiento('1')).toBe('1');
  });
});
