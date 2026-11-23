import { TestBed } from '@angular/core/testing';
import { DURACION_PAGO_MS, FormularioPago, ResultadoPago } from './formulario-pago.component';

describe('FormularioPago', () => {
  let resultado: ResultadoPago | null;
  let cancelado: boolean;

  function crear() {
    resultado = null;
    cancelado = false;
    TestBed.configureTestingModule({ imports: [FormularioPago] });
    const fixture = TestBed.createComponent(FormularioPago);
    fixture.componentRef.setInput('monto', 50000);
    fixture.componentRef.setInput('cancha', 'Cancha Bosque 1');
    fixture.componentInstance.pagado.subscribe((r) => (resultado = r));
    fixture.componentInstance.cancelado.subscribe(() => (cancelado = true));
    fixture.detectChanges();
    return fixture;
  }

  const llenarTarjeta = (f: FormularioPago, numero: string) =>
    f.tarjeta.setValue({ numero, titular: 'LAURA PEREZ', vencimiento: '12/30', cvv: '123', cuotas: 1 });

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('muestra el aviso de simulación y no paga con campos vacíos', () => {
    const fixture = crear();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Simulación');

    fixture.componentInstance.pagar();
    fixture.detectChanges();
    vi.advanceTimersByTime(DURACION_PAGO_MS);

    expect(resultado).toBeNull();
    expect(html.textContent).toContain('Revisa los campos marcados en rojo.');
    expect(html.querySelectorAll('.error-campo').length).toBeGreaterThan(0);
  });

  it('tarjeta válida: procesa y entrega solo los últimos 4 dígitos', () => {
    const fixture = crear();
    const formulario = fixture.componentInstance;
    llenarTarjeta(formulario, '4242 4242 4242 4242');

    formulario.pagar();
    expect(formulario.procesando()).toBe(true);
    vi.advanceTimersByTime(DURACION_PAGO_MS);

    expect(resultado?.detalle).toBe('Visa terminada en 4242');
    expect(resultado?.referencia).toMatch(/^SIM-/);
    expect(JSON.stringify(resultado)).not.toContain('4242 4242');
    // Los datos se borran del formulario al terminar.
    expect(formulario.tarjeta.controls.numero.value).toBe('');
  });

  it('la tarjeta de prueba de rechazo muestra el error y no aprueba', () => {
    const fixture = crear();
    const formulario = fixture.componentInstance;
    llenarTarjeta(formulario, '4000 0000 0000 0002');
    formulario.pagar();
    vi.advanceTimersByTime(DURACION_PAGO_MS);

    expect(resultado).toBeNull();
    expect(formulario.mensajeError()).toContain('Pago rechazado (simulado)');
  });

  it('PSE y Nequi validan sus propios campos', () => {
    const formulario = crear().componentInstance;

    formulario.cambiarMetodo('pse');
    formulario.pse.setValue({ banco: 'Davivienda', tipoPersona: 'natural', correo: 'laura@correo.com' });
    formulario.pagar();
    vi.advanceTimersByTime(DURACION_PAGO_MS);
    expect(resultado?.detalle).toBe('PSE · Davivienda');

    formulario.cambiarMetodo('nequi');
    formulario.nequi.setValue({ celular: '123' });
    formulario.pagar();
    expect(formulario.procesando()).toBe(false);
    formulario.nequi.setValue({ celular: '3001234567' });
    formulario.pagar();
    vi.advanceTimersByTime(DURACION_PAGO_MS);
    expect(resultado?.detalle).toBe('Nequi · ***4567');
  });

  it('Escape cierra la ventana', () => {
    crear();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancelado).toBe(true);
  });
});
