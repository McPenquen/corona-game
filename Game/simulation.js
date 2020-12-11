// Discrete SIR model variant with delay and reinfections

class CovidSimulation {
	constructor(startDate) {
		// pandemic params
		this.R0 = 2.5;
		this.RNoiseMultSampler = normalPositiveSampler(1.0, 0.15);
		this.rSmoothing = 0.85;
		this.mortalitySampler = normalPositiveSampler(0.01, 0.001);
		this.initialPopulation = 10690000;
		this.infectedStart = 3;
		this.vaccinationStartDate = '2021-03-01';
		this.vaccinationPerDay = 0.01;
		this.vaccinationMaxRate = 0.75;
		this.endDate = '2021-07-01';

		// All covid parameters counted from the infection day
		this.incubationDays = 5; // Days until infection is detected
		this.infectiousFrom = 3; // First day when people are infectious
		this.infectiousTo = 8;   // Last day when people are infectious (they will isolate after the onset of COVID)
		this.recoveryDays = 14 + this.incubationDays;
		this.timeToDeathDays = 21 + this.incubationDays;
		this.immunityDays = 90 + this.recoveryDays;
		this.hospitalizationDays = 21; // How long people stay in hospital after incubation
		this.hospitalizationRateSampler = normalPositiveSampler(0.05, 0.01);
		this.hospitalsOverwhelmedThreshold = 20000;
		this.hospitalsOverwhelmedMortalityMultiplier = 2;
		this.hospitalsBaselineUtilization = 0.5;

		this.simDays = [];
		this.simDayStats = [];

		this.simDays.push({
			date: startDate,
			suspectible: this.initialPopulation - this.infectedStart,
			infected: this.infectedStart,
			recovered: 0,
			hospitalized: 0,
			dead: 0,
			infectedToday: this.infectedStart,
			hospitalizedToday: 0,
			deathsToday: 0,
			costToday: 0,
			R: this.R0,
			mortality: this.mortalitySampler(),
			vaccinationRate: 0,
		});

		this.calcStats();
	}

	getDayInPast(n) {
		let i = this.simDays.length - n;
		if (i >= 0) {
			return this.simDays[i];
		} else {
			// Days before the start of the epidemic have no sick people
			return {
				date: null,
				suspectible: this.initialPopulation,
				infected: 0,
				recovered: 0,
				hospitalized: 0,
				dead: 0,
				infectedToday: 0,
				hospitalizedToday: 0,
				deathsToday: 0,
				costToday: 0,
				R: this.R0,
				mortality: 0,
				vaccinationRate: 0,
			};
		}
	}

	simOneDay() {
		let yesterday = this.getDayInPast(1);
		let todayDate = plusDay(yesterday.date);

		let suspectible = yesterday.suspectible;
		let infected = yesterday.infected;
		let recovered = yesterday.recovered;
		let dead = yesterday.dead;

		let mitigation = getMitigation();
		let R = this.rSmoothing * yesterday.R + (1. - this.rSmoothing) * (this.R0 * mitigation.mult);

		let population = yesterday.suspectible + yesterday.infected + yesterday.recovered;
		let infectious = 0.;
		for (let i = this.infectiousFrom; i <= this.infectiousTo; ++i) {
			infectious += this.getDayInPast(i).infectedToday;
		}
		infectious /= (this.infectiousTo - this.infectiousFrom + 1);
		// Simplifying assumption that only uninfected people got vaccinated
		let suspectibleToday = Math.max(0, yesterday.suspectible - population * yesterday.vaccinationRate);
		let infectedToday = infectious * this.RNoiseMultSampler() * R * suspectibleToday / population;
		infected += infectedToday;
		suspectible -= infectedToday;

		let recoveryFromDay = this.getDayInPast(this.recoveryDays);
		let recoveredToday = recoveryFromDay.infectedToday * (1 - recoveryFromDay.mortality);
		recovered += recoveredToday;
		infected -= recoveredToday;

		let deathsFromDay = this.getDayInPast(this.timeToDeathDays);
		let deathsToday = deathsFromDay.infectedToday * deathsFromDay.mortality;
		dead += deathsToday;
		infected -= deathsToday;

		let endedImmunityFromDay = this.getDayInPast(this.immunityDays);
		let endedImmunityToday = endedImmunityFromDay.infectedToday * (1 - endedImmunityFromDay.mortality);
		suspectible += endedImmunityToday;
		recovered -= endedImmunityToday;

		let hospitalizedToday = this.getDayInPast(this.incubationDays).infectedToday * this.hospitalizationRateSampler();
		let hospitalized = yesterday.hospitalized + hospitalizedToday
			- this.getDayInPast(this.hospitalizationDays).hospitalizedToday;

		let vaccinationRate = yesterday.vaccinationRate;
		if (todayDate >= this.vaccinationStartDate) {
			vaccinationRate = Math.min(vaccinationRate + this.vaccinationPerDay, this.vaccinationMaxRate);
		}

		let hospitalsOverwhelmedMultiplier = 1;
		if (hospitalized > (1 - this.hospitalsBaselineUtilization) * this.hospitalsOverwhelmedThreshold) {
			hospitalsOverwhelmedMultiplier = this.hospitalsOverwhelmedMortalityMultiplier;
		}
		this.simDays.push({
			date: todayDate,
			suspectible: suspectible,
			infected: infected,
			recovered: recovered,
			hospitalized: hospitalized,
			dead: dead,
			infectedToday: infectedToday,
			hospitalizedToday: hospitalizedToday,
			deathsToday: deathsToday,
			costToday: mitigation.cost,
			R: R,
			mortality: this.mortalitySampler() * hospitalsOverwhelmedMultiplier,
			vaccinationRate: vaccinationRate,
		});

		return this.calcStats();
	}

	calcStats() {
		let today = this.getDayInPast(1);
		let lastStat = (this.simDayStats.length > 0) ? this.simDayStats[this.simDayStats.length - 1] : null;


		let undetectedInfections = 0;
		for (let i = 1; i <= this.incubationDays; i++) {
			undetectedInfections += this.getDayInPast(i).infectedToday;
		}

		let detectedInfectionsToday = this.getDayInPast(this.incubationDays + 1).infectedToday;
		let detectedInfectionsTotal = ((lastStat != null) ? lastStat.detectedInfectionsTotal : 0)
			+ detectedInfectionsToday;
		let detectedInfections7DayAvg = 0;
		for (let i = 1; i <= 7; i++) {
			detectedInfections7DayAvg += this.getDayInPast(i + this.incubationDays).infectedToday / 7;
		}

		let costTotal = ((lastStat != null) ? lastStat.costTotal : 0) + today.costToday;

		let stats = {
			date: today.date,
			deadTotal: Math.round(today.dead),
			deathsToday: Math.round(today.deathsToday),
			detectedInfectionsToday: Math.round(detectedInfectionsToday),
			detectedInfectionsTotal: Math.round(detectedInfectionsTotal),
			detectedInfections7DayAvg: detectedInfections7DayAvg,
			detectedActiveInfectionsTotal: Math.round(today.infected - undetectedInfections),
			mortality: today.dead / detectedInfectionsTotal,
			costTotal: costTotal,
			vaccinationRate: today.vaccinationRate,
			hospitalizationCapacity: this.hospitalsBaselineUtilization + today.hospitalized / this.hospitalsOverwhelmedThreshold,
		};

		this.simDayStats.push(stats);

		return stats;
	}
}

