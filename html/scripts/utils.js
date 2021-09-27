const MIN_AMOUNT = 0.00000001;
const MAX_AMOUNT = 254000000;
let BEAM = null;

export default class Utils {
    static isMobile () {
        const ua = navigator.userAgent;
        return (/android/i.test(ua) || /iPad|iPhone|iPod/.test(ua));
    }
    
    static isAndroid () {
        const ua = navigator.userAgent;
        return (/android/i.test(ua));
    }

    static isDesktop () {
        const ua = navigator.userAgent;
        return (/QtWebEngine/i.test(ua));
    }

    static isWeb () {
        return !Utils.isDesktop() && !Utils.isMobile()
    }

    static async createDesktopAPI(cid, apirescback) {
        return new Promise(async (resolve, reject) => {
            await Utils.injectScript("qrc:///qtwebchannel/qwebchannel.js")
            new QWebChannel(qt.webChannelTransport, (channel) => {
                channel.objects.BEAM.api.callWalletApiResult.connect(apirescback)
                resolve(channel.objects.BEAM)
            })
        })  
    }

    static async createWebAPI(apiver, minapiver, appname, apirescback) {
        return new Promise((resolve, reject) => {
            window.addEventListener('message', async (ev) => {
                if (ev.data === 'apiInjected') {
                    // TODO: зачем здесь вообще контракт айди в самом васме?
                    // TODO: remove window.BeamApi
                    await window.BeamApi.createAppAPI(apiver, minapiver, appname, apirescback);
                    // TOD: first call bug
                    resolve(window.BeamApi)
                }
            }, false);
            window.postMessage({type: "create_beam_api", apiver, minapiver, appname}, window.origin);
        })
    }

    static async createMobileAPI(cid, apirescback) {
        return new Promise((resolve, reject) => {
            if (Utils.isAndroid()) {
                document.addEventListener("onCallWalletApiResult", (res) => {
                    apirescback(res.detail)
                })
            }
            else {
                window.BEAM.callWalletApiResult(apirescback);
            }
            resolve(window.BEAM);
        })
    }

    static async callApi(callid, method, params) {
        let request = {
            "jsonrpc": "2.0",
            "id":      callid,
            "method":  method,
            "params":  params
        }

        console.log(JSON.stringify(request))
        
        if (Utils.isWeb()) {
            BEAM.callWalletApi(callid, method, params);
        } 

        if (Utils.isMobile()) {
            BEAM.callWalletApi(JSON.stringify(request));
        }
        
        if (Utils.isDesktop()) {
            BEAM.api.callWalletApi(JSON.stringify(request));
        }
    }

    static async initialize(params, initcback) {
        let apirescb = params["apiResultHandler"]
        try
        {
            if (Utils.isDesktop()) {
                BEAM = await Utils.createDesktopAPI(apirescb)
            } 
            
            if (Utils.isWeb()) {
                Utils.showWebLoading()
                let apiver = params["api_version"] || "current"
                let minapiver = params["min_api_version"] || ""
                let appname = params["appname"]
                BEAM = await Utils.createWebAPI(apiver, minapiver, appname, apirescb)
                Utils.hideWebLoading()
            }

            if (Utils.isMobile()) {
                BEAM = await Utils.createMobileAPI(apirescb)
            }

            let styles = Utils.getStyles()
            Utils.applyStyles(styles); 
        }
        catch (err)
        {
            return initcback(err)
        }

        return initcback(null)
    }

    static getStyles () {
        if (BEAM && BEAM.style) {
            // TODO: проборосить стили из мобайла и экстеншена
            return BEAM.style
        }

        return {
            appsGradientOffset: -174,
            appsGradientTop: 56,
            content_main: "#ffffff",
            background_main_top: "#035b8f",
            background_main: "#042548",
            background_popup: "#00446c",
            validator_error: "#ff625c"
        }
    }

    static applyStyles(style) {
        // TODO: как-то это все неправильно тут
        let topColor =  [style.appsGradientOffset, "px,"].join('');
        let mainColor = [style.appsGradientTop, "px,"].join('');

        if (!Utils.isDesktop()) {
            document.head.innerHTML += '<meta name="viewport" content="width=device-width, initial-scale=1" />';
            document.body.style.backgroundImage = [
                                                   "linear-gradient(to bottom,",
                                                   style.background_main_top, topColor,
                                                   style.background_main, mainColor,
                                                   style.background_main
                                                   ].join(' ');
        }

        if (Utils.isMobile()) {
            document.body.classList.add('mobile');
        }

        if (Utils.isWeb()) {
            document.body.classList.add('web');
        }
        
        document.body.style.color = style.content_main;
        document.querySelectorAll('.popup').forEach(item => {
            item.style.backgroundImage = `linear-gradient(to bottom,
            ${Utils.hex2rgba(style.background_main_top, 0.6)} ${topColor}
            ${Utils.hex2rgba(style.background_main, 0.6)} ${mainColor}
            ${Utils.hex2rgba(style.background_main, 0.6)}`;
        });
        
        document.querySelectorAll('.popup__content').forEach(item => {
            item.style.backgroundColor = Utils.hex2rgba(style.background_popup, 1);
        });


        let ef = document.getElementById('error-full');
        if (ef) ef.style.color = style.validator_error;
        
        let ec = document.getElementById('error-common');
        if (ec) ec.style.color = style.validator_error;
    }
    
    //
    // Convenience functions
    //
    static reload () {
        window.location.reload();
    }
    
    static async injectScript(url) {
        return new Promise((resolve, reject) => {
            let js = document.createElement('script');
            js.type = 'text/javascript';
            js.async = true;
            js.src = url;
            js.onload = () => resolve()
            js.onerror = (err) => reject(err)
            document.getElementsByTagName('head')[0].appendChild(js);
        })
    }

    static hex2rgba = (hex, alpha = 1) => {
        const [r, g, b] = hex.match(/\w\w/g).map(x => parseInt(x, 16));
        return `rgba(${r},${g},${b},${alpha})`;
    };

    static getById = (id)  => {
        return document.getElementById(id);
    }
    
    static setText(id, text) {
        Utils.getById(id).innerText = text;
    }

    static show(id) {
        Utils.getById(id).classList.remove("hidden");
    }
    
    static hide(id) {
        Utils.getById(id).classList.add("hidden");
    }

    static download(url, cback) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if(xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    let buffer    = xhr.response;
                    let byteArray = new Uint8Array(buffer);
                    let array     = Array.from(byteArray);

                    if (!array || !array.length) {
                        return cback("empty shader");
                    }
                
                    return cback(null, array);
                } else {
                    let errMsg = ["code", xhr.status].join(" ");
                    return cback(errMsg);
                }
            }
        }
        xhr.open('GET', url, true);
        xhr.responseType = "arraybuffer";
        xhr.send(null);
    }

    static handleString(next) {
        let result = true;
        const regex = new RegExp(/^-?\d+(\.\d*)?$/g);
        const floatValue = parseFloat(next);
        const afterDot = next.indexOf('.') > 0 ? next.substring(next.indexOf('.') + 1) : '0';
        if ((next && !String(next).match(regex)) ||
            (String(next).length > 1 && String(next)[0] === '0' && next.indexOf('.') < 0) ||
            (parseInt(afterDot, 10) === 0 && afterDot.length > 7) ||
            (afterDot.length > 8) ||
            (floatValue === 0 && next.length > 1 && next[1] !== '.') ||
            (floatValue < 1 && next.length > 10) ||
            (floatValue > 0 && (floatValue < MIN_AMOUNT || floatValue > MAX_AMOUNT))) {
          result = false;
        }
        return result;
    }

    // static handleString(next) {
    //     const REG_AMOUNT = /^(?:[1-9]\d*|0)?(?:\.(\d+)?)?$/;
    //     if (REG_AMOUNT.test(next)) {
    //         return false;
    //     }
    // }

    static showWebLoading() {
        let styles = Utils.getStyles()
        Utils.applyStyles(styles); 

        let bg = document.createElement("div");
        bg.style.width = "100%";
        bg.style.height = "100%";
        let loadContainer = document.createElement("div");
        loadContainer.className = "dapp-loading";
        loadContainer.id = "dapp-loader";

        loadContainer.style.textAlign = 'center';
        loadContainer.style.margin = '50px auto 0 auto';
        loadContainer.style.width = '585px';
        loadContainer.style.padding = '5%';
        loadContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        loadContainer.style.borderRadius = '10px';

        let titleElem = document.createElement("h3");
        titleElem.innerText = "Connecting to the BEAM Web Wallet."; 
        let subtitle = document.createElement("p");
        subtitle.innerText = "To use BEAM Faucet you should have BEAM Web Wallet installed and allow connection.";

        let reconnectButton = document.createElement("button");
        reconnectButton.innerText = "Try to connect again";
        reconnectButton.addEventListener('click', () => {
            Utils.reload();
        });
        let installButton = document.createElement("button");
        installButton.innerText = "Install BEAM Web Wallet";

        installButton.style.marginLeft = '30px';
        
        let controlsArea = document.createElement("div");
        
        loadContainer.appendChild(titleElem);
        loadContainer.appendChild(subtitle);
        loadContainer.appendChild(controlsArea);

        controlsArea.appendChild(reconnectButton);
        controlsArea.appendChild(installButton);

        bg.appendChild(loadContainer);

        document.body.appendChild(bg)
    }

    static hideWebLoading() {
        const elem = document.getElementById("dapp-loader");
        elem.parentNode.removeChild(elem);
    }
}
