import { Component, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  @Output() toggleSidenav: EventEmitter<any> = new EventEmitter<any>();
  constructor() {}

  ngOnInit() {}

  clickToggleSidenav() {
    this.toggleSidenav.emit();
  }
}
