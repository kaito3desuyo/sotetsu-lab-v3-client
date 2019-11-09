import { Pipe, PipeTransform } from '@angular/core';
import find from 'lodash/find';

@Pipe({
  name: 'findById'
})
export class FindByIdPipe implements PipeTransform {
  transform(id: string, args: { collection: any[]; property?: string }): any {
    const result = find(args.collection, o => o.id === id);
    return args.property ? result[args.property] : result;
  }
}
