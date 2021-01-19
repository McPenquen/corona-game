import {Component} from '@angular/core';
import {UntilDestroy} from '@ngneat/until-destroy';
import {ChartDataSets, ChartOptions, ChartPoint, ScaleTitleOptions} from 'chart.js';
import {combineLatest, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {MetaService} from 'src/app/services/meta.service';
import {formatNumber} from '../../../utils/format';
import {GameService} from '../../game.service';
import {GameResult, OutroService} from './outro.service';

const MY_RESULT_COLOR = '#9fe348';
const ALL_RESULTS_COLOR = 'rgb(71, 227, 217, 0.5)';

const convert: (result: GameResult) => ChartPoint =
  result => ({
    x: result.dead,
    y: result.cost,
  });

@UntilDestroy()
@Component({
  selector: 'cvd-outro',
  templateUrl: './outro.component.html',
  styleUrls: ['./outro.component.scss'],
})
export class OutroComponent {

  private readonly scalesLabelsDefaults: ScaleTitleOptions = {
    display: true,
    fontSize: 16,
  };

  datasets$: Observable<ChartDataSets[]> = combineLatest([
    this.outroService.myResult$.pipe(
      map(result => result ? [convert(result)] : null),
    ),
    this.outroService.allResults$.pipe(
      map(results => results ? results.map(convert) : null),
    ),
  ]).pipe(
    map(([myPoints, allPoints]) => {
      const datasets: ChartDataSets[] = [];

      if (myPoints) {
        datasets.push({
          label: 'Můj výsledek',
          data: myPoints,
          backgroundColor: MY_RESULT_COLOR,
          pointBorderColor: MY_RESULT_COLOR,
          pointBackgroundColor: MY_RESULT_COLOR,
          pointRadius: 10,
        });
      }

      if (allPoints) {
        datasets.push({
          label: 'Výsledky ostatních hráčů',
          data: allPoints,
          backgroundColor: ALL_RESULTS_COLOR,
          pointBorderColor: ALL_RESULTS_COLOR,
          pointBackgroundColor: ALL_RESULTS_COLOR,
        });
      }

      return datasets;
    }),
  );

  outroChartOptions: ChartOptions = {
    legend: {
      labels: {
        fontSize: 14,
      },
    },
    tooltips: {
      displayColors: false,
      callbacks: {
        title: (results, data) => {
          if (data!.datasets!.length > 1 && !results[0].datasetIndex) return 'Můj výsledek';
          if (results.length === 1) return 'Výsledek jiného hráče';
          return `Výsledek ${results.length} jiných hráčů`;
        },
        beforeBody: node => [
          `Celkový počet mrtvých: ${formatNumber(+node[0].xLabel!)}`,
          `Celkové náklady: ${formatNumber(+node[0].yLabel!, true, true)}`,
        ],
        label: () => '',
      },
    },
    scales: {
      xAxes: [{
        scaleLabel: {
          ...this.scalesLabelsDefaults,
          labelString: 'Celkový počet mrtvých',
        },
        type: 'linear',
        position: 'bottom',
        ticks: {
          callback(value: number | string) {
            return formatNumber(+value, false, true);
          },
        },
      }],
      yAxes: [{
        scaleLabel: {
          ...this.scalesLabelsDefaults,
          labelString: 'Celkové náklady',
        },
        ticks: {
          callback(value: number | string) {
            return formatNumber(+value, false, true);
          },
        },
      }],
    },
    plugins: {
      datalabels: {
        display: false,
      },
    },
  };

  constructor(
    private outroService: OutroService,
    public gameService: GameService,
    meta: MetaService,
  ) {
    meta.setTitle('Výsledky');
    outroService.fetchAllResults();
  }

  get stats() {
    const lastStats = this.gameService.game.simulation.getLastStats();
    if (!lastStats) throw new Error('Missing game statistics');
    return lastStats;
  }

  isGameLost() {
    return this.gameService.game.isGameLost();
  }
}