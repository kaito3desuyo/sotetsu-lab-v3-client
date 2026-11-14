import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NotFoundContentComponent } from './not-found-content.component';

describe('NotFoundContentComponent', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NotFoundContentComponent],
            providers: [provideRouter([])],
        });
    });

    it('見つからないことを伝え、トップへ戻るボタンを出す', () => {
        const fixture = TestBed.createComponent(NotFoundContentComponent);
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;
        expect(text).toContain('ページが見つかりません');
        expect(text).toContain('トップへ戻る');
    });

    it('見つからないことを h2 の見出しで出す', () => {
        const fixture = TestBed.createComponent(NotFoundContentComponent);
        fixture.detectChanges();

        const h2: HTMLElement = fixture.nativeElement.querySelector('h2');
        expect(h2?.textContent).toContain('ページが見つかりません');
    });

    it('main を持たない', () => {
        const fixture = TestBed.createComponent(NotFoundContentComponent);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('main')).toBeNull();
    });

    it('トップへ戻る', () => {
        const fixture = TestBed.createComponent(NotFoundContentComponent);
        const navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);

        fixture.componentInstance.onBackToTop();

        expect(navigate).toHaveBeenCalledWith(['/']);
    });
});
