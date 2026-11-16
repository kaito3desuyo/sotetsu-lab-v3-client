const LINK_TAG = /<link\b[^>]*>/gi;
const NOSCRIPT_BLOCK = /<noscript\b[\s\S]*?<\/noscript>/gi;

function attributeOf(tag: string, name: string): string | undefined {
    const match = new RegExp(
        `\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,
        'i',
    ).exec(tag);
    return match ? (match[1] ?? match[2]) : undefined;
}

function isModulePreload(tag: string): boolean {
    return (attributeOf(tag, 'rel') ?? '').toLowerCase() === 'modulepreload';
}

function isStylesheet(tag: string): boolean {
    return (attributeOf(tag, 'rel') ?? '').toLowerCase() === 'stylesheet';
}

function escapeAttribute(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/**
 * @angular/ssr は modulepreload を </body> の直前に最大 10 本足す。本文が大きいと、
 * 本文を受け切るまでブラウザが先読みを始められない。ここで <head> の最後の stylesheet の直後へ移す。
 * extra の href は先頭に置き、すでにある href とは重ねない。
 * </head> が無い HTML は触らない。
 */
export function movePreloadsToHead(
    html: string,
    extra: readonly string[] = [],
): string {
    const headEnd = html.indexOf('</head>');
    if (headEnd === -1) {
        return html;
    }
    const head = html.slice(0, headEnd);
    const rest = html.slice(headEnd);

    // head にすでにある先読み
    const present = new Set<string>();
    for (const tag of head.match(LINK_TAG) ?? []) {
        const href = attributeOf(tag, 'href');
        if (isModulePreload(tag) && href !== undefined) {
            present.add(href);
        }
    }

    // </head> より後ろの先読みを外しながら集める
    const moved: string[] = [];
    const strippedRest = rest.replace(LINK_TAG, (tag) => {
        if (!isModulePreload(tag)) {
            return tag;
        }
        const href = attributeOf(tag, 'href');
        if (href !== undefined) {
            moved.push(href);
        }
        return '';
    });

    const added: string[] = [];
    for (const href of [...extra, ...moved]) {
        if (!present.has(href)) {
            present.add(href);
            added.push(href);
        }
    }
    if (added.length === 0) {
        return head + strippedRest;
    }
    const links = added
        .map(
            (href) =>
                `<link rel="modulepreload" href="${escapeAttribute(href)}">`,
        )
        .join('');

    // <noscript> の中の stylesheet は数えない
    const noscriptRanges = [...head.matchAll(NOSCRIPT_BLOCK)].map(
        (m) => [m.index, m.index + m[0].length] as const,
    );
    let insertAt = head.length;
    let lastStylesheetEnd = -1;
    for (const m of head.matchAll(LINK_TAG)) {
        const inNoscript = noscriptRanges.some(
            ([start, end]) => m.index >= start && m.index < end,
        );
        if (!inNoscript && isStylesheet(m[0])) {
            lastStylesheetEnd = m.index + m[0].length;
        }
    }
    if (lastStylesheetEnd !== -1) {
        insertAt = lastStylesheetEnd;
    }
    return (
        head.slice(0, insertAt) + links + head.slice(insertAt) + strippedRest
    );
}
