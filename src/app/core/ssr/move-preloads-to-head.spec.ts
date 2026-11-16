import { movePreloadsToHead } from './move-preloads-to-head';

const html = (head: string, tail = '') =>
    `<!doctype html><html><head><title>t</title>${head}<style>a{}</style></head><body><app-root></app-root>\n${tail}</body></html>`;

describe('movePreloadsToHead', () => {
    it('末尾の modulepreload を head の最後の stylesheet の直後へ移す', () => {
        const input = html(
            '<link rel="stylesheet" href="a.css"><link rel="stylesheet" href="b.css"><noscript><link rel="stylesheet" href="c.css"></noscript>',
            '<link rel="modulepreload" href="x.js">\n<link rel="modulepreload" href="y.js">\n',
        );
        const out = movePreloadsToHead(input);
        expect(out).toContain(
            '<link rel="stylesheet" href="b.css"><link rel="modulepreload" href="x.js"><link rel="modulepreload" href="y.js"><noscript>',
        );
        const body = out.slice(out.indexOf('</head>'));
        expect(body).not.toContain('modulepreload');
    });

    it('extra を先頭に足し、すでにある href とは重ねない', () => {
        const input = html(
            '<link rel="stylesheet" href="a.css">',
            '<link rel="modulepreload" href="x.js">\n<link rel="modulepreload" href="page.js">\n',
        );
        const out = movePreloadsToHead(input, ['page.js', 'z.js']);
        expect(out.match(/href="page\.js"/g)).toHaveLength(1);
        expect(out).toContain(
            '<link rel="modulepreload" href="page.js"><link rel="modulepreload" href="z.js"><link rel="modulepreload" href="x.js">',
        );
    });

    it('head にすでにある modulepreload は重ねない', () => {
        const input = html(
            '<link rel="stylesheet" href="a.css"><link rel="modulepreload" href="x.js">',
            '<link rel="modulepreload" href="x.js">\n',
        );
        const out = movePreloadsToHead(input, ['x.js']);
        expect(out.match(/href="x\.js"/g)).toHaveLength(1);
    });

    it('</head> が無い HTML はそのまま返す', () => {
        const input = '<body><link rel="modulepreload" href="x.js"></body>';
        expect(movePreloadsToHead(input, ['y.js'])).toBe(input);
    });

    it('modulepreload が 0 本でも extra は足す', () => {
        const out = movePreloadsToHead(
            html('<link rel="stylesheet" href="a.css">'),
            ['page.js'],
        );
        expect(out).toContain(
            '<link rel="stylesheet" href="a.css"><link rel="modulepreload" href="page.js">',
        );
    });

    it('stylesheet が無ければ </head> の直前へ足す', () => {
        const out = movePreloadsToHead(html(''), ['page.js']);
        expect(out).toContain(
            '<link rel="modulepreload" href="page.js"></head>',
        );
    });

    it('足すものが無ければ HTML を変えない', () => {
        const input = html('<link rel="stylesheet" href="a.css">');
        expect(movePreloadsToHead(input)).toBe(input);
    });
});
