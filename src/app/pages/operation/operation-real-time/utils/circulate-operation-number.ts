export function circulateOperationNumber(number: string, days: number) {
    const operationNumber = Number(number);
    let circulated = operationNumber;

    for (let i = 0; i < days; i++) {
        switch (String(circulated).slice(0, 1)) {
            case '1':
                circulated = circulated + 1;
                if (String(circulated).slice(-1) === '6') {
                    circulated = circulated - 5;
                }
                break;
            case '2':
                circulated = circulated + 1;
                if (String(circulated).slice(-1) === '5') {
                    circulated = circulated - 4;
                }
                break;
            case '7':
                circulated = circulated + 1;
                if (String(circulated).slice(-1) === '5') {
                    circulated = circulated - 4;
                }
                break;
            case '8':
            case '9':
                return null;

            default:
                circulated = circulated + 1;
                if (String(circulated).slice(-1) === '0') {
                    circulated = circulated - 9;
                }
        }
    }

    return String(circulated);
}
