import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { UserState } from 'src/app/global-states/user.state';

import { SidenavComponent } from './sidenav.component';

describe('SidenavComponent', () => {
    let component: SidenavComponent;
    let fixture: ComponentFixture<SidenavComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SidenavComponent],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(SidenavComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('駅を選ばなければ上り/下りの行き先は「全線時刻表」と書く', () => {
        expect(component.timetableLinkPrefix()).toBe('全線時刻表');
    });

    it('一覧に無い駅が選ばれたら「駅別時刻表」と書く', () => {
        component.stationId.setValue('unknown-station');
        expect(component.timetableLinkPrefix()).toBe('駅別時刻表');
    });

    describe('投稿管理のリンク', () => {
        function linkTexts(): string {
            fixture.detectChanges();
            return (fixture.nativeElement as HTMLElement).textContent ?? '';
        }

        function setRole(role: string | null): void {
            patchState(unprotected(TestBed.inject(UserState)), {
                userId: role ? 'u1' : null,
                role,
            });
        }

        it('ゲストには出さない', () => {
            setRole(null);
            expect(linkTexts()).not.toContain('投稿管理');
        });

        it('reporter・viewer には出さない', () => {
            setRole('reporter');
            expect(linkTexts()).not.toContain('投稿管理');
            setRole('viewer');
            expect(linkTexts()).not.toContain('投稿管理');
        });

        it.each(['editor', 'manager'])('%s には出す', (role) => {
            setRole(role);
            expect(linkTexts()).toContain('投稿管理');
            expect(
                (fixture.nativeElement as HTMLElement).querySelector(
                    'a[href="/moderation"]',
                ),
            ).not.toBeNull();
        });
    });

    describe('マイページのリンク', () => {
        function render(): HTMLElement {
            fixture.detectChanges();
            return fixture.nativeElement as HTMLElement;
        }

        function setRole(role: string | null): void {
            patchState(unprotected(TestBed.inject(UserState)), {
                userId: role ? 'u1' : null,
                role,
            });
        }

        it('ゲスト・viewer には「マイページ」を出さない', () => {
            setRole(null);
            expect(render()).not.toHaveTextContent('マイページ');
            expect(render()).not.toHaveTextContent('アカウント');
            setRole('viewer');
            expect(render()).not.toHaveTextContent('マイページ');
            expect(render().querySelector('a[href="/my-page"]')).toBeNull();
        });

        it('editor には「アカウント」の下に「マイページ」を出し、「管理」より上にある', () => {
            setRole('editor');
            const element = render();
            const headings = Array.from(element.querySelectorAll('h3'), (h) =>
                h.textContent?.trim(),
            );
            expect(headings).toContain('アカウント');
            expect(headings.indexOf('アカウント')).toBeLessThan(
                headings.indexOf('管理'),
            );
            const link = element.querySelector('a[href="/my-page"]');
            expect(link?.textContent?.trim()).toBe('マイページ');
            const text = element.textContent ?? '';
            expect(text.indexOf('マイページ')).toBeLessThan(
                text.indexOf('投稿管理'),
            );
        });

        it('reporter でも出す（管理は出さない）', () => {
            setRole('reporter');
            const element = render();
            expect(
                element
                    .querySelector('a[href="/my-page"]')
                    ?.textContent?.trim(),
            ).toBe('マイページ');
            expect(element).not.toHaveTextContent('投稿管理');
        });
    });

    it('「このサイトについて」から使い方と用語集へつなぐ', () => {
        fixture.detectChanges();
        const element = fixture.nativeElement as HTMLElement;
        expect(
            element.querySelector('a[href="/guide"]')?.textContent?.trim(),
        ).toBe('使い方');
        expect(
            element.querySelector('a[href="/glossary"]')?.textContent?.trim(),
        ).toBe('用語集');
    });

    it('「このサイトについて」からプライバシーポリシーと免責事項へつなぐ', () => {
        fixture.detectChanges();
        const element = fixture.nativeElement as HTMLElement;
        expect(
            element
                .querySelector('a[href="/privacy-policy"]')
                ?.textContent?.trim(),
        ).toBe('プライバシーポリシー');
        expect(
            element.querySelector('a[href="/disclaimer"]')?.textContent?.trim(),
        ).toBe('免責事項');
    });
});
