import { CurrencyPipe, registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { Component, inject, input, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { FormularioPago, ResultadoPago } from './formulario-pago/formulario-pago.component';

registerLocaleData(localeEsCo);

// Pago SIMULADO de una hora de cancha. Abre una ventana que pide el método de
// pago (tarjeta, PSE o Nequi) y sus datos, los valida y muestra el comprobante.
// No llama al backend ni a ninguna pasarela: sirve para la demo.
// Solo se muestra a usuarios con sesión (USER o ADMIN); un visitante no lo ve.
// Uso: <app-pago-simulado [monto]="espacio.precioHora" [cancha]="espacio.nombre" />
@Component({
  selector: 'app-pago-simulado',
  standalone: true,
  imports: [CurrencyPipe, FormularioPago],
  template: `
    @if (auth.autenticado()) {
      @if (resultado(); as pago) {
        <div class="alerta alerta-exito aprobado" role="status">
          <strong>Pago aprobado (simulado)</strong>
          <span>{{ pago.detalle }}</span>
          <span>Referencia {{ pago.referencia }}</span>
        </div>
      } @else {
        <button class="btn btn-primario btn-sm bloque" type="button" (click)="abierto.set(true)">
          Pagar {{ monto() | currency: 'COP' : 'symbol-narrow' : '1.0-0' : 'es-CO' }} (simulado)
        </button>
      }

      @if (abierto()) {
        <app-formulario-pago
          [monto]="monto()"
          [cancha]="cancha()"
          (pagado)="aprobar($event)"
          (cancelado)="abierto.set(false)"
        />
      }
    }
  `,
  styles: `
    :host { display: block; }
    .bloque { width: 100%; justify-content: center; }
    .aprobado { display: grid; gap: 0.15rem; font-size: 0.82rem; margin: 0; }
  `,
})
export class PagoSimulado {
  readonly auth = inject(AuthService);

  // input(): el padre envía el precio por hora y el nombre de la cancha.
  monto = input.required<number>();
  cancha = input.required<string>();

  readonly abierto = signal(false);
  readonly resultado = signal<ResultadoPago | null>(null);

  aprobar(pago: ResultadoPago): void {
    this.abierto.set(false);
    this.resultado.set(pago);
  }
}
