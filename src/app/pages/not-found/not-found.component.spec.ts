import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NotFoundComponent } from './not-found.component';

describe('NotFoundComponent', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NotFoundComponent],
            providers: [provideRouter([])],
        });
    });

    it('見つからないことを伝え、トップへ戻るボタンを出す', () => {
        const fixture = TestBed.createComponent(NotFoundComponent);
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;
        expect(text).toContain('ページが見つかりません');
        expect(text).toContain('トップへ戻る');
    });

    it('トップへ戻る', () => {
        const fixture = TestBed.createComponent(NotFoundComponent);
        const navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);

        fixture.componentInstance.onBackToTop();

        expect(navigate).toHaveBeenCalledWith(['/']);
    });

    it('ほかのページと同じ余白の main に置く', () => {
        const fixture = TestBed.createComponent(NotFoundComponent);
        fixture.detectChanges();

        const main: HTMLElement = fixture.nativeElement.querySelector('main');
        for (const c of [
            'tw-flex',
            'tw-flex-col',
            'tw-gap-4',
            'tw-p-4',
            'md:tw-p-6',
            'lg:tw-p-8',
            'xl:tw-p-16',
        ]) {
            expect(main.classList).toContain(c);
        }
    });
});
