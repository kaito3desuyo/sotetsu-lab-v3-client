import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-sidenav-presentational',
  templateUrl: './sidenav-presentational.component.html',
  styleUrls: ['./sidenav-presentational.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidenavPresentationalComponent {
  @Input() stationsSelectList: {
    routeName: string;
    stations: { label: string; value: string }[];
  }[];

  constructor() {}
}
