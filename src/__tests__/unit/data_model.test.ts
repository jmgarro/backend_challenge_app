import { insertBatch } from '../../../src/DAO/data_model';
import { mocked } from 'jest-mock';
import * as db from '../../../src/config/db';
import sql from 'mssql';

jest.mock('../src/config/db');

const mockPool = {
  transaction: jest.fn().mockReturnThis(),
  begin: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
};

const mockRequest = {
  input: jest.fn().mockReturnThis(),
  query: jest.fn(),
};

beforeEach(() => {
  mocked(db.getDbPool).mockResolvedValue({
    transaction: () => ({
      begin: mockPool.begin,
      commit: mockPool.commit,
      rollback: mockPool.rollback,
      request: () => mockRequest,
    }),
  } as unknown as sql.ConnectionPool);
});

describe('insertBatch', () => {
  it('retorna 0 si no hay registros válidos', async () => {
    const result = await insertBatch([]);
    expect(result).toBe(0);
  });

  it('inserta correctamente registros válidos', async () => {
    mockRequest.query.mockResolvedValue({});

    const result = await insertBatch([
      {
        NombreCompleto: 'Juan Pérez',
        DNI: 12345678,
        Estado: 'Activo',
        FechaIngreso: new Date('2023-01-01'),
        EsPEP: true,
        EsSujetoObligado: false,
      },
    ]);

    expect(result).toBe(1);
    expect(mockRequest.input).toHaveBeenCalled();
    expect(mockRequest.query).toHaveBeenCalled();
  });

  it('rollback en caso de error de query', async () => {
    mockRequest.query.mockRejectedValue(new Error('SQL Error'));

    await expect(
      insertBatch([
        {
          NombreCompleto: 'Juan Pérez',
          DNI: 12345678,
          Estado: 'Activo',
          FechaIngreso: new Date('2023-01-01'),
          EsPEP: true,
          EsSujetoObligado: false,
        },
      ])
    ).rejects.toThrow('SQL Error');
  });
});
