export function circulateOperationNumber(number: string, days: number): string {
    let circulated = number;

    for (let i = 0; i < days; i++) {
        switch (circulated.slice(-1)) {
            case 'G':
            case 'K':
                return null;
        }

        switch (circulated.slice(0, 1)) {
            case '1':
                circulated = String(Number(circulated) + 1);
                if (circulated.slice(-1) === '6') {
                    circulated = String(Number(circulated) - 5);
                }
                break;
            case '5':
                if (circulated.slice(-1) === '0') {
                    return null;
                }
                circulated = String(Number(circulated) + 1);
                if (circulated.slice(-1) === '0') {
                    circulated = String(Number(circulated) - 9);
                }
                break;
            case '6':
                if (circulated.slice(-1) === '0') {
                    return null;
                }
                circulated = String(Number(circulated) + 1);
                if (circulated.slice(-1) === '0') {
                    circulated = String(Number(circulated) - 9);
                }
                break;
            case '7':
                if (Number(circulated.slice(-1)) >= 4) {
                    return null;
                }
                circulated = String(Number(circulated) + 1);
                if (circulated.slice(-1) === '4') {
                    circulated = String(Number(circulated) - 4);
                }
                break;
            case '8':
            case '9':
                return null;

            default:
                return null;
        }
    }

    return circulated;
}
