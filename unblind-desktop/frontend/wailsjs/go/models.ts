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

export namespace auth {
	
	export class Session {
	    cookies: network.Cookie[];
	    // Go type: time
	    lastLoginTime: any;
	    browserMode: string;
	    profileDir: string;
	    isValid: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Session(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cookies = this.convertValues(source["cookies"], network.Cookie);
	        this.lastLoginTime = this.convertValues(source["lastLoginTime"], null);
	        this.browserMode = source["browserMode"];
	        this.profileDir = source["profileDir"];
	        this.isValid = source["isValid"];
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

export namespace browser {
	
	export class BrowserInfo {
	    name: string;
	    path: string;
	    version: string;
	    isValid: boolean;
	
	    static createFrom(source: any = {}) {
	        return new BrowserInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.version = source["version"];
	        this.isValid = source["isValid"];
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

export namespace monitor {
	
	export class MonitorStatus {
	    state: string;
	    // Go type: time
	    lastCheckTime: any;
	    // Go type: time
	    nextCheckTime: any;
	    lastError: string;
	    checkCount: number;
	
	    static createFrom(source: any = {}) {
	        return new MonitorStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.state = source["state"];
	        this.lastCheckTime = this.convertValues(source["lastCheckTime"], null);
	        this.nextCheckTime = this.convertValues(source["nextCheckTime"], null);
	        this.lastError = source["lastError"];
	        this.checkCount = source["checkCount"];
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

export namespace network {
	
	export class CookiePartitionKey {
	    topLevelSite: string;
	    hasCrossSiteAncestor: boolean;
	
	    static createFrom(source: any = {}) {
	        return new CookiePartitionKey(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.topLevelSite = source["topLevelSite"];
	        this.hasCrossSiteAncestor = source["hasCrossSiteAncestor"];
	    }
	}
	export class Cookie {
	    name: string;
	    value: string;
	    domain: string;
	    path: string;
	    expires: number;
	    size: number;
	    httpOnly: boolean;
	    secure: boolean;
	    session: boolean;
	    sameSite?: string;
	    priority: string;
	    sourceScheme: string;
	    sourcePort: number;
	    partitionKey?: CookiePartitionKey;
	    partitionKeyOpaque: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Cookie(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.value = source["value"];
	        this.domain = source["domain"];
	        this.path = source["path"];
	        this.expires = source["expires"];
	        this.size = source["size"];
	        this.httpOnly = source["httpOnly"];
	        this.secure = source["secure"];
	        this.session = source["session"];
	        this.sameSite = source["sameSite"];
	        this.priority = source["priority"];
	        this.sourceScheme = source["sourceScheme"];
	        this.sourcePort = source["sourcePort"];
	        this.partitionKey = this.convertValues(source["partitionKey"], CookiePartitionKey);
	        this.partitionKeyOpaque = source["partitionKeyOpaque"];
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

export namespace parser {
	
	export class ReviewResult {
	    expertName: string;
	    reviewTime: string;
	    overallEvaluation: string;
	    reviewResult: string;
	    remark: string;
	
	    static createFrom(source: any = {}) {
	        return new ReviewResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.expertName = source["expertName"];
	        this.reviewTime = source["reviewTime"];
	        this.overallEvaluation = source["overallEvaluation"];
	        this.reviewResult = source["reviewResult"];
	        this.remark = source["remark"];
	    }
	}
	export class ParsedResults {
	    reviews: ReviewResult[];
	    finalResult: string;
	    // Go type: time
	    extractTime: any;
	    hash: string;
	
	    static createFrom(source: any = {}) {
	        return new ParsedResults(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.reviews = this.convertValues(source["reviews"], ReviewResult);
	        this.finalResult = source["finalResult"];
	        this.extractTime = this.convertValues(source["extractTime"], null);
	        this.hash = source["hash"];
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

export namespace storage {
	
	export class HistoryItem {
	    // Go type: time
	    timestamp: any;
	    hash: string;
	    results?: parser.ParsedResults;
	    description: string;
	
	    static createFrom(source: any = {}) {
	        return new HistoryItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.timestamp = this.convertValues(source["timestamp"], null);
	        this.hash = source["hash"];
	        this.results = this.convertValues(source["results"], parser.ParsedResults);
	        this.description = source["description"];
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

