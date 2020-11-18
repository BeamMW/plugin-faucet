export default class Utils {
    static reload () {
        window.location.reload()
    }

    //
    // API Exposed by the wallet itself
    //
    static BEAM = null

    static onLoad(cback) {
        window.addEventListener('load', () => new QWebChannel(qt.webChannelTransport, (channel) => {
            Utils.BEAM = channel.objects.BEAM

            // Make everything beautiful
            let topColor =  [Utils.BEAM.style.appsGradientOffset, "px,"].join('')
            let mainColor = [Utils.BEAM.style.appsGradientTop, "px,"].join('')
            document.body.style.backgroundImage = [
                "linear-gradient(to bottom,",
                Utils.BEAM.style.background_main_top, topColor, 
                Utils.BEAM.style.background_main, mainColor,
                Utils.BEAM.style.background_main
            ].join(' ')
            document.body.style.color = Utils.BEAM.style.content_main

            // Notify application
            cback(Utils.BEAM)
        }))
    }

    static byId(id) {
        return document.querySelector(['#', id].join(''))
    }
    
    static setText(id, text) {
        Utils.byId(id).innerText = text
    }

    static show(id) {
        Utils.byId(id).classList.remove('invisible')
    }

    static hide(id) {
        Utils.byId(id).classList.add('invisible')
    }

    static callApi(callid, method, params) {
        let request = {
            "jsonrpc": "2.0",
            "id":      callid,
            "method":  method,
            "params":  params
        }
        Utils.BEAM.callWalletApi(JSON.stringify(request))
    }

    static download(url, cback) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if(xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    let buffer    = xhr.response
                    let byteArray = new Uint8Array(buffer);
                    let array     = Array.from(byteArray)

                    if (!array || !array.length) {
                        return cback("empty shader")
                    }
                
                    return cback(null, array)
                } else {
                    let errMsg = ["code", xhr.status].join(" ")
                    return cback(errMsg)
                }
            }
        }
        xhr.open('GET', url, true)
        xhr.responseType = "arraybuffer";
        xhr.send(null)
    }
}
