import { Pipe, PipeTransform } from '@angular/core';
import { formatFechaPe } from '../utils/fecha-pe';

@Pipe({ name: 'fechaPe', standalone: true })
export class FechaPePipe implements PipeTransform {
  transform(value: string | Date | null | undefined, conHora = false): string {
    return formatFechaPe(value, conHora);
  }
}
