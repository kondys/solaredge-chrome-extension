import ISolarProvider from "./ISolarProvider";
import { storage } from 'webextension-polyfill'
import { APIState } from "./APIState";
import { SolarEdgeOverview } from "./SolarEdgeOverview";

export default class SolarEdgeProvider implements ISolarProvider {
    private API_BASE = 'https://monitoring.solaredge.com/';
    private SITE_REGEX = /(https:\/\/monitoring.solaredge.com\/.*)\/site\/(?<siteId>\d+)/;
    private API_ACCESS_URL = this.API_BASE + 'solaredge-apigw/api/siteadmin/{siteid}/access/apiAccess.json'
    private API_POWER_URL = 'https://monitoringapi.solaredge.com/site/{siteid}/overview.json?api_key={key}'
    private API_DETAILS_URL = 'https://monitoringapi.solaredge.com/site/{siteid}/details.json?api_key={key}'
    private maxpower: number = 0;

    key: string = "";
    siteId: number = 0;
    apiState: APIState = APIState.LOADING;
    seOverview: SolarEdgeOverview | null = null;
    onStatusUpdated?: Function;

    constructor(onStatusUpdated?: Function) {
        this.onStatusUpdated = onStatusUpdated;
    }


    convertTZ = (date : Date, tzString: string) =>{
        return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {timeZone: tzString}));   
    }


    getPower = async (onPowerUpdated?: Function,  url: string = this.API_POWER_URL) => {
        let dateCheck =  (new Date()).getTime() < (this.seOverview ? this.seOverview.nextUpdate : new Date(2000)).getTime();
        if (dateCheck|| this.apiState == APIState.INVALID_KEY || this.siteId == 0 || this.key == "")
            return;

        var url = url.replace("{siteid}", this.siteId.toString()).replace("{key}", this.key);

        try {
            await fetch(url)
                .then((response) => response.json())
                .then((data) => new SolarEdgeOverview(data))
                .then((_seOverview: SolarEdgeOverview) => {
                    this.seOverview = _seOverview;

                    if(this.maxpower < this.seOverview.power){
                        this.maxpower = this.seOverview.power;
                        storage.sync.set({ 'maxpower': this.maxpower });}

                        onPowerUpdated?.(this.seOverview.power, this.maxpower, this.seOverview.powerToday, this.seOverview.lastUpdate);
                        this.updateAPIState(APIState.VALID_KEY);
                })
        } catch (error: any) {
            if (error.message && error.message.includes("Cannot read properties")) {
                this.updateAPIState(APIState.INVALID_KEY);
            }
            else {
                this.updateAPIState(APIState.NETWORK_ERROR);
            }
        }
    }

    private updateAPIState = async (state: APIState) => {
        this.apiState = state;
        this.onStatusUpdated?.(state);
    }
    

    clearCredentials = () => {
        return storage.sync.set({ 'apiKey': "", 'siteId': 0 }).then(() => {
            this.key = "";
            this.siteId = 0;
            this.updateAPIState(APIState.CHECKING);
        })
    }

    findAPIKey = async (skipStorageCheck: boolean = false) => {
        await storage.sync.get(['apiKey', 'siteId', 'maxpower']).then((data) => {
            if (!skipStorageCheck && data.apiKey && data.apiKey !== "") {
                this.key = data.apiKey;
                this.siteId = data.siteId;
                this.maxpower = data.maxpower ? data.maxpower: 0;
                this.updateAPIState(APIState.CHECKING);
            }
            else {
                return this.findSiteId()
                    .then(siteId => {
                        this.siteId = siteId;
                        return this.getAPI(siteId)
                    })
                    .then(key => {
                        this.key = key
                        storage.sync.set({ 'apiKey': this.key, 'siteId': this.siteId });
                        this.updateAPIState(APIState.CHECKING);
                    })
                    .catch(error => {
                        this.updateAPIState(APIState.INVALID_KEY);
                    })
            }
        })

        return this.key !== "";
    }


    private getAPI = (siteId: number, api_access_url: string = this.API_ACCESS_URL) => {
        let url: string = api_access_url.replace("{siteid}", siteId.toString());
        let key: string = "";

        return siteId <= 0 ?
            Promise.reject("SiteId not found")
            : fetch(url)
                .then((response) => response.json())
                .then((data) => {
                    if (data && data.isAllowed && data.key) {
                        key = data.key;

                        return key;
                    }
                    else
                        throw new Error("API key not found");
                });
    };

    private findSiteId = (api_base: string = this.API_BASE, site_regex: RegExp = this.SITE_REGEX): Promise<number> => {
        let siteID: number = 0

        return fetch(api_base)
            .then((response) => {
                const url = response.url;
                const match = url.match(site_regex);

                if (match && match.groups && match.groups.siteId) {
                    siteID = +match.groups.siteId;
                }
                return siteID;
            })
            .catch((error) => {
                return siteID;
            })
    };
}