import { CurrencyPipe, NgTemplateOutlet, registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { Component, DestroyRef, ElementRef, HostListener, afterNextRender, inject, input, output, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  TARJETA_DE_PRUEBA,
  TARJETA_RECHAZADA,
  celularValidator,
  cvvValidator,
  formatearNumeroTarjeta,
  formatearVencimiento,
  franquicia,
  numeroTarjetaValidator,
  soloDigitos,
  vencimientoValidator,
} from '../validadores-pago';

// Formato de moneda colombiano ($ 50.000) para el total.
registerLocaleData(localeEsCo);

export type MetodoPago = 'tarjeta' | 'pse' | 'nequi';

// Lo que el formulario entrega al terminar. Nunca incluye el número completo ni el CVV.
export interface ResultadoPago {
  metodo: MetodoPago;
  detalle: string; // Ej: "Visa terminada en 4242", "PSE · Bancolombia", "Nequi · ***4567".
  referencia: string;
}

// Cuánto "tarda" el pago simulado.
export const DURACION_PAGO_MS = 1500;

// Ventana de pago SIMULADO: pide el método y sus datos, los valida y simula
// la respuesta. No envía nada al backend ni a una pasarela.
@Component({
  selector: 'app-formulario-pago',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, NgTemplateOutlet],
  templateUrl: './formulario-pago.component.html',
  styleUrl: './formulario-pago.component.css',
})
export class FormularioPago {
  // PADRE -> HIJO: qué se está pagando.
  monto = input.required<number>();
  cancha = input.required<string>();

  // HIJO -> PADRE: pago aprobado o ventana cerrada.
  pagado = output<ResultadoPago>();
  cancelado = output<void>();

  readonly tarjetaDePrueba = TARJETA_DE_PRUEBA;
  readonly bancos = ['Bancolombia', 'Banco de Bogotá', 'Davivienda', 'BBVA', 'Banco de Occidente', 'Nu Colombia'];

  readonly metodo = signal<MetodoPago>('tarjeta');
  readonly procesando = signal(false);
  readonly mensajeError = signal('');

  readonly tarjeta = new FormGroup({
    numero: new FormControl('', { nonNullable: true, validators: [Validators.required, numeroTarjetaValidator] }),
    titular: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] }),
    vencimiento: new FormControl('', { nonNullable: true, validators: [Validators.required, vencimientoValidator] }),
    cvv: new FormControl('', { nonNullable: true, validators: [Validators.required, cvvValidator] }),
    cuotas: new FormControl(1, { nonNullable: true }),
  });

  readonly pse = new FormGroup({
    banco: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    tipoPersona: new FormControl('natural', { nonNullable: true }),
    correo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  readonly nequi = new FormGroup({
    celular: new FormControl('', { nonNullable: true, validators: [Validators.required, celularValidator] }),
  });

  private readonly ventana = viewChild.required<ElementRef<HTMLDialogElement>>('ventana');
  private temporizador?: ReturnType<typeof setTimeout>;

  constructor() {
    // showModal() abre el <dialog> encima de todo, bloquea la página de fondo y
    // mueve el foco a la ventana (teclado y lectores de pantalla la encuentran).
    afterNextRender(() => {
      const dialogo = this.ventana().nativeElement;
      if (typeof dialogo.showModal === 'function') {
        dialogo.showModal();
      } else {
        dialogo.setAttribute('open', ''); // Entornos sin soporte (por ejemplo, pruebas con jsdom).
      }
    });
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.temporizador);
      this.ventana().nativeElement.close?.();
    });
  }

  get formularioActivo(): FormGroup {
    return { tarjeta: this.tarjeta, pse: this.pse, nequi: this.nequi }[this.metodo()];
  }

  franquiciaActual(): string {
    return franquicia(this.tarjeta.controls.numero.value);
  }

  invalido(grupo: FormGroup, campo: string): boolean {
    const control = grupo.get(campo);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  cambiarMetodo(metodo: MetodoPago): void {
    if (this.procesando()) return;
    this.metodo.set(metodo);
    this.mensajeError.set('');
  }

  // Formato automático mientras se escribe (sin mover el valor fuera del formulario).
  formatearNumero(): void {
    const control = this.tarjeta.controls.numero;
    control.setValue(formatearNumeroTarjeta(control.value), { emitEvent: false });
  }

  formatearFecha(): void {
    const control = this.tarjeta.controls.vencimiento;
    control.setValue(formatearVencimiento(control.value), { emitEvent: false });
  }

  limitarDigitos(control: FormControl<string>, maximo: number): void {
    control.setValue(soloDigitos(control.value).slice(0, maximo), { emitEvent: false });
  }

  pagar(): void {
    if (this.procesando()) return;
    const formulario = this.formularioActivo;
    if (formulario.invalid) {
      formulario.markAllAsTouched();
      this.mensajeError.set('Revisa los campos marcados en rojo.');
      return;
    }

    this.mensajeError.set('');
    this.procesando.set(true);
    const detalle = this.describirPago();
    const rechazada = this.metodo() === 'tarjeta' && soloDigitos(this.tarjeta.controls.numero.value) === TARJETA_RECHAZADA;

    this.temporizador = setTimeout(() => {
      this.procesando.set(false);
      if (rechazada) {
        this.mensajeError.set('Pago rechazado (simulado): la entidad no autorizó la transacción. Prueba con otra tarjeta.');
        this.tarjeta.controls.cvv.reset();
        return;
      }
      this.limpiarDatos();
      this.pagado.emit({ metodo: this.metodo(), detalle, referencia: `SIM-${Date.now().toString(36).toUpperCase()}` });
    }, DURACION_PAGO_MS);
  }

  // Clic en el fondo oscuro: el evento llega al propio <dialog>, no a su contenido.
  clicFuera(evento: MouseEvent): void {
    if (evento.target === this.ventana().nativeElement) {
      this.cerrar();
    }
  }

  @HostListener('document:keydown.escape')
  cerrar(): void {
    if (this.procesando()) return;
    this.limpiarDatos();
    this.cancelado.emit();
  }

  // Solo se conserva lo necesario para el comprobante (últimos 4 dígitos, banco o celular parcial).
  private describirPago(): string {
    switch (this.metodo()) {
      case 'tarjeta': {
        const numero = soloDigitos(this.tarjeta.controls.numero.value);
        return `${franquicia(numero)} terminada en ${numero.slice(-4)}`;
      }
      case 'pse':
        return `PSE · ${this.pse.controls.banco.value}`;
      case 'nequi':
        return `Nequi · ***${soloDigitos(this.nequi.controls.celular.value).slice(-4)}`;
    }
  }

  private limpiarDatos(): void {
    this.tarjeta.reset();
    this.pse.reset();
    this.nequi.reset();
  }
}
