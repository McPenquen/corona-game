import {ChangeDetectorRef, Component} from '@angular/core';
import {UntilDestroy, untilDestroyed} from '@ngneat/until-destroy';
import {EventMitigation} from 'src/app/services/events';
import {GameService} from '../game.service';

@UntilDestroy()
@Component({
  selector: 'cvd-news',
  templateUrl: './news.component.html',
  styleUrls: ['./news.component.scss'],
})
export class NewsComponent {
  constructor(public gameService: GameService, cd: ChangeDetectorRef) {
    this.gameService.gameState$
      .pipe(untilDestroyed(this))
      .subscribe(() => cd.markForCheck());
  }

  resumeEvent(eventMitigation: EventMitigation) {
    this.gameService.game.applyMitigationActions({eventMitigations: [eventMitigation]});
    this.gameService.event = undefined;
    this.gameService.setSpeed('play');
  }

  get today() {
    return new Date(this.gameService.lastDate).toLocaleDateString();
  }

  hasNamedEventMitigation() {
    return this.gameService.game.eventMitigations.find(m => m.name);
  }
}
