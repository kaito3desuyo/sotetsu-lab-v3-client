import { ViewportScroller } from '@angular/common';
import { ErrorHandler } from '@angular/core';

export class CustomViewportScroller implements ViewportScroller {
    private offset: () => [number, number] = () => [0, 0];

    constructor(
        private scrollElementID: string,
        private document: Document,
        private window: any,
        private errorHandler: ErrorHandler
    ) {}

    setOffset(offset: [number, number] | (() => [number, number])): void {
        if (Array.isArray(offset)) {
            this.offset = () => offset;
        } else {
            this.offset = offset;
        }
    }

    getScrollPosition(): [number, number] {
        const scrollEl = this.document.querySelector(
            `#${this.scrollElementID}`
        );
        if (this.supportScrollRestoration() && scrollEl) {
            return [scrollEl.scrollLeft, scrollEl.scrollTop];
        } else {
            return [0, 0];
        }
    }

    scrollToPosition(position: [number, number]): void {
        const scrollEl = this.document.querySelector(
            `#${this.scrollElementID}`
        );
        if (this.supportScrollRestoration() && scrollEl) {
            setTimeout(() => {
                scrollEl.scrollTo(position[0], position[1]);
            }, 0);
        }
    }

    scrollToAnchor(anchor: string): void {
        if (this.supportScrollRestoration()) {
            if (this.window.CSS && this.window.CSS.escape) {
                anchor = this.window.CSS.escape(anchor);
            } else {
                anchor = anchor.replace(/(\"|\'\ |:|\.|\[|\]|,|=)/g, '\\$1');
            }
            try {
                const elSelectedById = this.document.querySelector(
                    `#${anchor}`
                );
                if (elSelectedById) {
                    this.scrollToElement(elSelectedById);
                    return;
                }
                const elSelectedByName = this.document.querySelector(
                    `[name='${anchor}']`
                );
                if (elSelectedByName) {
                    this.scrollToElement(elSelectedByName);
                    return;
                }
            } catch (e) {
                this.errorHandler.handleError(e);
            }
        }
    }

    setHistoryScrollRestoration(scrollRestoration: 'auto' | 'manual'): void {
        if (this.supportScrollRestoration()) {
            const history = this.window.history;
            if (history && history.scrollRestoration) {
                history.scrollRestoration = scrollRestoration;
            }
        }
    }

    private scrollToElement(el: any): void {
        const rect = el.getBoundingClientRect();
        const left = rect.left + this.window.pageXOffset;
        const top = rect.top + this.window.pageYOffset;
        const offset = this.offset();
        this.window.scrollTo(left - offset[0], top - offset[1]);
    }

    private supportScrollRestoration(): boolean {
        try {
            return !!this.window && !!this.window.scrollTo;
        } catch {
            return false;
        }
    }
}
