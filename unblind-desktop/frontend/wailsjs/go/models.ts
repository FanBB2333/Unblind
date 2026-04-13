export namespace appstate {
	
	export class AppState {
	    state: string;
	    // Go type: time
	    lastCheckTime: any;
	    // Go type: time
	    nextCheckTime: any;
	    lastError: string;
	    browserDetected: boolean;
	    sessionValid: boolean;
	
	    static createFrom(source: any = {}) {
	        return new AppState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.state = source["state"];
	        this.lastCheckTime = this.convertValues(source["lastCheckTime"], null);
	        this.nextCheckTime = this.convertValues(source["nextCheckTime"], null);
	        this.lastError = source["lastError"];
	        this.browserDetected = source["browserDetected"];
	        this.sessionValid = source["sessionValid"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace config {
	
	export class AppConfig {
	    refreshIntervalSec: number;
	    browserMode: string;
	    browserPath: string;
	    downloadedKernelPath: string;
	    barkEnabled: boolean;
	    barkBaseUrl: string;
	    systemNotificationEnabled: boolean;
	    rememberCredentials: boolean;
	    autoFillCredentials: boolean;
	    autoResumeMonitoring: boolean;
	
	    static createFrom(source: any = {}) {
	        return new AppConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.refreshIntervalSec = source["refreshIntervalSec"];
	        this.browserMode = source["browserMode"];
	        this.browserPath = source["browserPath"];
	        this.downloadedKernelPath = source["downloadedKernelPath"];
	        this.barkEnabled = source["barkEnabled"];
	        this.barkBaseUrl = source["barkBaseUrl"];
	        this.systemNotificationEnabled = source["systemNotificationEnabled"];
	        this.rememberCredentials = source["rememberCredentials"];
	        this.autoFillCredentials = source["autoFillCredentials"];
	        this.autoResumeMonitoring = source["autoResumeMonitoring"];
	    }
	}

}

