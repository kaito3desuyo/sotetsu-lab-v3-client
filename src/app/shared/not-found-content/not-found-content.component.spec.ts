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
