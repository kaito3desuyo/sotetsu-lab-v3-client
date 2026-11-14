import { UrlSegmentGroup, UrlTree } from '@angular/router';

/**
 * container の中の最初の main にフォーカスする。
 * main は各ページが持つので id では探さない。tabindex が無ければ -1 を付けてフォーカスできるようにする。
 * スクロール位置は動かさない（復元は Router の withInMemoryScrolling に任せる）。
 *
 * @returns main が見つかってフォーカスしたとき true
 */
export const focusMainContent = (container: HTMLElement): boolean => {
    const main = container.querySelector<HTMLElement>('main');
    if (!main) {
        return false;
    }
    if (!main.hasAttribute('tabindex')) {
        main.setAttribute('tabindex', '-1');
    }
    main.focus({ preventScroll: true });
    return true;
};

/**
 * primary の区切りの path だけを `/` でつないだ文字列。
 * matrix・query・fragment は含めない（操作帯でダイヤや駅を選び直すだけの移動と、ページを移る移動を分ける）。
 */
export const routePathKey = (url: UrlTree): string => {
    const paths: string[] = [];
    let group: UrlSegmentGroup | undefined = url.root.children['primary'];
    while (group) {
        paths.push(...group.segments.map((segment) => segment.path));
        group = group.children['primary'];
    }
    return paths.join('/');
};
