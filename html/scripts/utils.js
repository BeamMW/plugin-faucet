const MIN_AMOUNT = 0.00000001;
const MAX_AMOUNT = 254000000;

export default class Utils {
    static BEAM = null;

    static reload () {
        window.location.reload();
    }

    static initApp = (callback, handler) => {
        if (Utils.isDesktopWallet()) {
            Utils.onDesktopLoad(async (beamAPI) => {
                beamAPI.api.callWalletApiResult.connect(handler); 
                callback();
            });
        } else if (Utils.isMobile()) {
            Utils.onMobileLoad(async (beamAPI) => {
                if(Utils.isAndroid()) {
                    Utils.onCallWalletApiResult((json) => {
                        handler(json.detail);
                    });
                }
                else {
                    beamAPI.callWalletApiResult(handler);
                }
                callback();
            });
        } else {
            let initApiInterval = null;
            const callbacks = {
                apiInjected: async () => {
                    const res = await window.BeamApi.createAppAPI(CONTRACT_ID, 'faucet', handler);
                    if (res) {
                        document.getElementById('faucet').style.height = '100%';
                        document.body.style.color = 'rgb(255, 255, 255)';
                        document.body.style.backgroundImage = 'linear-gradient(rgba(57, 57, 57, 0.6) -174px, rgba(23, 23, 23, 0.6) 56px, rgba(23, 23, 23, 0.6))';  
                        document.body.style.backgroundColor = 'rgb(50, 50, 50)';  
                        callback();
                    }
                }
            };
            window.addEventListener('message', async (ev) => {
                if (typeof ev.data === 'string' && callbacks[ev.data] !== undefined) {
                    clearInterval(initApiInterval);
                    await callbacks[ev.data]();
                }
            }, false);
        
            initApiInterval = setInterval(() => {
                window.postMessage({ type: "create_beam_api", name: "Faucet Dapp" }, window.origin);
            }, 3000);
        }
    }

    static isMobile = () => {
        const ua = navigator.userAgent;
        return (/android/i.test(ua) || /iPad|iPhone|iPod/.test(ua));
    }
    
    static isAndroid = () => {
        const ua = navigator.userAgent;
        return (/android/i.test(ua));
    }

    static isDesktopWallet = () => {
        const ua = navigator.userAgent;
        return (/QtWebEngine/i.test(ua));
    }
    
    //
    // API Exposed by the wallet itself
    //

    
    //for android
    static onCallWalletApiResult(cbak){
        document.addEventListener("onCallWalletApiResult", function(e) {
            cbak(e);
        });
    }
    
    static onDesktopLoad(cback) {
        window.addEventListener('load', () => new QWebChannel(qt.webChannelTransport, (channel) => {
            Utils.BEAM = channel.objects.BEAM;
            
            // Make everything beautiful
            Utils.applyStyles();
            cback(Utils.BEAM);
        }));
    }

    static onMobileLoad(cback) {
        Utils.BEAM = window.BEAM;
            
        // Make everything beautiful
        Utils.applyStyles();
        cback(Utils.BEAM);
    }
    
    static applyStyles() {
        let style = Utils.BEAM.style;
        
        let topColor =  [style.appsGradientOffset, "px,"].join('');
        let mainColor = [style.appsGradientTop, "px,"].join('');

        if (Utils.isMobile()) {
            document.head.innerHTML += '<meta name="viewport" content="width=device-width, initial-scale=1" />';
            
            document.body.classList.add('mobile');
            
            document.body.style.backgroundImage = [
                                                   "linear-gradient(to bottom,",
                                                   style.background_main_top, topColor,
                                                   style.background_main, mainColor,
                                                   style.background_main
                                                   ].join(' ');
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
        document.getElementById('error-full').style.color = style.validator_error;
        document.getElementById('error-common').style.color = style.validator_error;
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
        this.getById(id).classList.remove("hidden");
    }
    
    static hide(id) {
        this.getById(id).classList.add("hidden");
    }

    static async callApi(callid, method, params) {
        let request = {
            "jsonrpc": "2.0",
            "id":      callid,
            "method":  method,
            "params":  params
        }
        
        if (window.BeamApi !== undefined) {
            await window.BeamApi.callWalletApi(callid, method, params);
        } else {
            if (Utils.isMobile()) {
                Utils.BEAM.callWalletApi(JSON.stringify(request));
            }
            else {
                Utils.BEAM.api.callWalletApi(JSON.stringify(request));
            }
        }
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
}
