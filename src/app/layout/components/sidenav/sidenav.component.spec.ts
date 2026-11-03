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
