import { Pipe, type PipeTransform } from '@angular/core';

@Pipe({
    name: 'newOperationNumberColor',
})
export class NewOperationNumberColorPipe implements PipeTransform {
    transform(operationNumber: string): string {
        if (!operationNumber) {
            return 'transparent';
        }

        if (operationNumber === '100') {
            return 'rgba(0, 0, 0, 0.12)';
        }

        if (operationNumber.includes('G')) {
            return 'rgba(26, 35, 126, 0.12)';
        }

        if (operationNumber.includes('K')) {
            return 'rgba(183, 28, 28, 0.12)';
        }

        switch (operationNumber[0]) {
            case '1':
                return 'rgba(244, 67, 54, 0.12)';
            case '2':
                return 'rgba(255, 193, 7, 0.12)';
            case '4':
                return 'rgba(139, 195, 74, 0.12)';
            case '5':
                return 'rgba(33, 150, 243, 0.12)';
            case '6':
                return 'rgba(63, 81, 181, 0.12)';
            case '7':
            case '8':
            case '9':
                return 'rgba(0, 150, 136, 0.12)';
            default:
                return 'transparent';
        }
    }
}
