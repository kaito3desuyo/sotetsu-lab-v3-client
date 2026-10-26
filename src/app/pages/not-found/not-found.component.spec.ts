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
});
