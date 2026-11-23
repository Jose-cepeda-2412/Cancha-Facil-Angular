import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Validaciones del formulario de pago SIMULADO. Son funciones puras para poder
// probarlas por separado. Ningún dato sale del navegador.

// Tarjeta de prueba que aparece en el aviso del formulario.
export const TARJETA_DE_PRUEBA = '4242 4242 4242 4242';
// Tarjeta de prueba que simula un pago rechazado.
export const TARJETA_RECHAZADA = '4000000000000002';

export const soloDigitos = (valor: string): string => valor.replace(/\D/g, '');

// Agrupa el número de 4 en 4 mientras se escribe: 4242424242424242 -> 4242 4242 4242 4242.
export function formatearNumeroTarjeta(valor: string): string {
  return soloDigitos(valor).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
}

// Escribe la barra del vencimiento: 1228 -> 12/28.
export function formatearVencimiento(valor: string): string {
  const digitos = soloDigitos(valor).slice(0, 4);
  return digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos;
}

export type Franquicia = 'Visa' | 'Mastercard' | 'American Express' | 'Tarjeta';

export function franquicia(numero: string): Franquicia {
  const n = soloDigitos(numero);
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'American Express';
  return 'Tarjeta';
}

// Algoritmo de Luhn: el mismo dígito de control que usan las tarjetas reales.
export function luhnValido(numero: string): boolean {
  const n = soloDigitos(numero);
  if (n.length < 13 || n.length > 19) return false;
  let suma = 0;
  for (let i = 0; i < n.length; i++) {
    let digito = Number(n[n.length - 1 - i]);
    if (i % 2 === 1) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    suma += digito;
  }
  return suma % 10 === 0;
}

// MM/AA válido y que no haya vencido (la tarjeta sirve hasta el último día del mes).
export function vencimientoVigente(valor: string, hoy = new Date()): boolean {
  const coincide = /^(\d{2})\/(\d{2})$/.exec(valor);
  if (!coincide) return false;
  const mes = Number(coincide[1]);
  const anio = 2000 + Number(coincide[2]);
  if (mes < 1 || mes > 12) return false;
  const finDeMes = new Date(anio, mes, 0, 23, 59, 59);
  return finDeMes >= hoy;
}

// --- Validadores para formularios reactivos ---

export const numeroTarjetaValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  !control.value || luhnValido(control.value) ? null : { numeroTarjeta: true };

export const vencimientoValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  !control.value || vencimientoVigente(control.value) ? null : { vencimiento: true };

// CVV de 3 dígitos (4 para American Express, que se valida en el componente).
export const cvvValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  !control.value || /^\d{3,4}$/.test(control.value) ? null : { cvv: true };

// Celular colombiano: 10 dígitos y empieza por 3.
export const celularValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  !control.value || /^3\d{9}$/.test(soloDigitos(control.value)) ? null : { celular: true };
