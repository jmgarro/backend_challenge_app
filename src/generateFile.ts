import fs from 'fs';
import path from 'path';
import { faker } from '@faker-js/faker';

const FILE_PATH = path.resolve(__dirname, '../challenge/input/CLIENTES_IN_0425.dat');

export const generateDataFile = (
  records: number = 100_000,
  errorRate: number = 0.2
): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Asegurarse de que el directorio exista
    const dir = path.dirname(FILE_PATH);
    fs.mkdirSync(dir, { recursive: true });

    const stream = fs.createWriteStream(FILE_PATH);

    stream.on('error', (err) => reject(err));
    stream.on('finish', () => {
      console.log(`✅ Archivo generado con ${records} líneas (con errores intencionales: ~${Math.floor(records * errorRate)}) en: ${FILE_PATH}`);
      resolve();
    });

    for (let i = 0; i < records; i++) {
      const isCorrupted = Math.random() < errorRate;

      let nombre = faker.person.firstName();
      let apellido = faker.person.lastName();
      let dni = faker.number.int({ min: 10000000, max: 99999999 });
      let estado = faker.helpers.arrayElement(['Activo', 'Inactivo']);
      let fechaIngreso = '';
      let esPep: string | boolean = faker.datatype.boolean();
      let esSujetoObligado: string | boolean = faker.datatype.boolean();

      if (isCorrupted) {
        const corruptionType = faker.number.int({ min: 1, max: 3 });

        switch (corruptionType) {
          case 1:
            fechaIngreso = faker.helpers.arrayElement(['0000-00-00', '99/99/9999', '']);
            break;
          case 2:
            esPep = '';
            esSujetoObligado = '';
            fechaIngreso = faker.date.past({ years: 10 }).toLocaleDateString('en-US');
            break;
          case 3:
            nombre = faker.lorem.words(50);
            apellido = faker.lorem.words(50);
            fechaIngreso = faker.date.past({ years: 10 }).toLocaleDateString('en-US');
            break;
        }
      } else {
        fechaIngreso = faker.date.past({ years: 10 }).toLocaleDateString('en-US');
      }

      const linea = `${nombre}|${apellido}|${dni}|${estado}|${fechaIngreso}|${esPep}|${esSujetoObligado}\n`;
      stream.write(linea);
    }

    stream.end(); // muy importante para cerrar correctamente y disparar el evento 'finish'
  });
};
