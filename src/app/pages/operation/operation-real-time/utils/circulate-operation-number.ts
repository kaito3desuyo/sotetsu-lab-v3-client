export function circulateOperationNumber(number: string, days: number): string {
    let circulated = number;

    daysLoop: for (let i = 0; i < days; i++) {
        switch (circulated.slice(-1)) {
            case 'G':
                switch (circulated.slice(0, 1)) {
                    case '9':
                        circulated =
                            String(Number(circulated.replace('G', '')) + 1) +
                            'G';
                        if (circulated.slice(-2, -1) === '6') {
                            circulated =
                                String(
                                    Number(circulated.replace('G', '')) - 5
                                ) + 'G';
                        }
                        continue daysLoop;
                    default:
                        circulated = null;
                        break daysLoop;
                }
            case 'K':
                circulated = null;
                break daysLoop;
        }

        switch (circulated.slice(0, 1)) {
            case '1':
                circulated = String(Number(circulated) + 1);
                if (circulated.slice(-1) === '6') {
                    circulated = String(Number(circulated) - 5);
                }
                continue daysLoop;
            case '5':
                if (circulated.slice(-1) === '0') {
                    continue daysLoop;
                }
                circulated = String(Number(circulated) + 1);
                if (circulated.slice(-1) === '0') {
                    circulated = String(Number(circulated) - 9);
                }
                continue daysLoop;
            case '6':
                if (circulated.slice(-1) === '0') {
                    continue daysLoop;
                }
                circulated = String(Number(circulated) + 1);
                if (circulated.slice(-1) === '0') {
                    circulated = String(Number(circulated) - 9);
                }
                continue daysLoop;
            case '7':
                if (Number(circulated.slice(-1)) >= 4) {
                    circulated = null;
                    break daysLoop;
                }
                circulated = String(Number(circulated) + 1);
                if (circulated.slice(-1) === '4') {
                    circulated = String(Number(circulated) - 4);
                }
                continue daysLoop;
            default:
                circulated = null;
                break daysLoop;
        }
    }

    return circulated;
}
