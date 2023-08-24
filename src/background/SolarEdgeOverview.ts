var UPDATE_FREQUENCY = (1000 * 60 * 5) + (10 * 1000); // 5 minutes & 10 secs

interface SolarEdgeLifeTimeData {
    energy: number;
    revenue: number;
}
interface SolarEdgeLastYearData {
    energy: number;
}
interface SolarEdgeLastMonthData {
    energy: number;
}
interface SolarEdgeCurrentPower {
    power: number;
}

interface ISolarEdgeOverview {
    overview: {
        currentPower: SolarEdgeCurrentPower,
        lastUpdateTime: string,
        measuredBy: string,
        lifeTimeData: SolarEdgeLifeTimeData,
        lastYearData: SolarEdgeLastYearData,
        lastMonthData: SolarEdgeLastMonthData,
        lastDayData: SolarEdgeLastMonthData
    }
}

export class SolarEdgeOverview {
    power: number = 0;
    powerToday: number = 0;
    lastUpdate: Date = new Date(2000);
    nextUpdate: Date = new Date(2000);

    constructor(config: ISolarEdgeOverview) {
        this.power = config.overview.currentPower.power;
        this.powerToday = config.overview.lastDayData.energy;

        this.lastUpdate = new Date(config.overview.lastUpdateTime);
        this.nextUpdate = new Date(this.lastUpdate.getTime() + UPDATE_FREQUENCY);
    }
}
