export function generateOperationSortNumber(num: string): string {
    const alphabetMap = new Map([
        ['G', '1'],
        ['K', '2'],
    ]);
    const matcher = /[A-Z]{1}$/;

    const number = num.replace(matcher, '');
    const alphabet = num.match(matcher)?.[0] ?? '';

    if (matcher.test(num)) {
        return `${alphabetMap.get(alphabet)}${number}`;
    } else {
        return num;
    }
}
