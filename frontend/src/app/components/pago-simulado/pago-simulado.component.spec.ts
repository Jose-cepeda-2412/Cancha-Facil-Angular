import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { AuthService, Sesion } from '../../services/auth.service';
import { FormularioPago } from './formulario-pago/formulario-pago.component';
import { PagoSimulado } from './pago-simulado.component';

describe('PagoSimulado', () => {
  function crear(sesion: Sesion | null) {
    const estado = signal(sesion);
    TestBed.configureTestingModule({
      imports: [PagoSimulado],
      providers: [{ provide: AuthService, useValue: { autenticado: computed(() => estado() !== null) } }],
    });
    const fixture = TestBed.createComponent(PagoSimulado);
    fixture.componentRef.setInput('monto', 50000);
    fixture.componentRef.setInput('cancha', 'Cancha Bosque 1');
    fixture.detectChanges();
    return fixture;
  }

  it('el visitante no ve el botón de pago', () => {
    const html = crear(null).nativeElement as HTMLElement;
    expect(html.querySelector('button')).toBeNull();
  });

  it('con sesión abre la ventana de pago y muestra el comprobante al aprobar', () => {
    const fixture = crear({ email: 'laura@correo.com', roles: ['USER'] });
    const html = fixture.nativeElement as HTMLElement;

    html.querySelector('button')!.click();
    fixture.detectChanges();
    const ventana = fixture.debugElement.query(By.directive(FormularioPago));
    expect(ventana).toBeTruthy();

    (ventana.componentInstance as FormularioPago).pagado.emit({
      metodo: 'tarjeta',
      detalle: 'Visa terminada en 4242',
      referencia: 'SIM-PRUEBA',
    });
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(FormularioPago))).toBeNull();
    expect(html.textContent).toContain('Pago aprobado (simulado)');
    expect(html.textContent).toContain('Visa terminada en 4242');
  });

  it('cancelar cierra la ventana sin pagar', () => {
    const fixture = crear({ email: 'laura@correo.com', roles: ['USER'] });
    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    fixture.detectChanges();
    (fixture.debugElement.query(By.directive(FormularioPago)).componentInstance as FormularioPago).cancelado.emit();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(FormularioPago))).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('(simulado)');
  });
});
