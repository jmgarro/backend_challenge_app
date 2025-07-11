import { describe, it, expect } from '@jest/globals';
import { parseClientLine } from '../../../src/controllers/data_controller';

describe('parseClientLine', () => {
  it('devuelve null si faltan campos', () => {
    const line = 'Juan|Pérez|12345678|Activo|2023-01-01|true'; // Falta un campo
    expect(parseClientLine(line)).toBeNull();
  });

  it('parsea correctamente una línea válida', () => {
    const line = 'Juan|Pérez|12345678|Activo|2023-01-01|true|false';
    const parsed = parseClientLine(line);
    expect(parsed).toEqual({
      NombreCompleto: 'Juan Pérez',
      DNI: 12345678,
      Estado: 'Activo',
      FechaIngreso: new Date('2023-01-01'),
      EsPEP: true,
      EsSujetoObligado: false
    });
  });

  it('devuelve null si el nombre completo es demasiado largo', () => {
    const nombre = 'A'.repeat(101);
    const line = `${nombre}|Apellido|12345678|Activo|2023-01-01|true|false`;
    expect(parseClientLine(line)).toBeNull();
  });

  it('devuelve null si el estado es demasiado largo', () => {
    const estado = 'X'.repeat(11);
    const line = `Juan|Pérez|12345678|${estado}|2023-01-01|true|false`;
    expect(parseClientLine(line)).toBeNull();
  });

  it('devuelve null si el DNI es inválido', () => {
    const line = 'Juan|Pérez|notanumber|Activo|2023-01-01|true|false';
    expect(parseClientLine(line)).toBeNull();
  });

  it('parsea correctamente fechas nulas o inválidas', () => {
    const line = 'Juan|Pérez|12345678|Activo|00/00/0000|true|false';
    const parsed = parseClientLine(line);
    expect(parsed?.FechaIngreso).toBeNull();
  });
});
