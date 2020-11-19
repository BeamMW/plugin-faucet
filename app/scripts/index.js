import Utils from "./utils.js"

const GROTHS_IN_BEAM = 100000000;
const TIMEOUT = 3000;

class Faucet {
    constructor () {
        this.timeout = undefined;
        this.pluginData = {
            contractId = undefined,
            inTransaction = false,
            backlogPeriod = undefined,
            withdrawLimit = undefined,
            withdrawHeight = 0,
            currHeight = 0
        }
    }

    start = () => {
        Utils.download("./faucetManager.wasm", (err, bytes) => {
            if (err) {
                let errTemplate = "Failed to load shader,"
                let errMsg = [errTemplate, err].join(" ");
                alert('sd')
            }
            alert('sd1')
            Utils.callApi("manager-view", "invoke_contract", {
                contract: bytes,
                args: "role=manager,action=view"
            })
        });
    }

    setError = (errmsg) => {
        Utils.hide('faucet');
        if (this.timeout) {
            clearTimeout(this.timeout);   
        }
        this.timeout = setTimeout(() => {
            this.start();
        }, TIMEOUT)
    }
    
    refresh = (now) => {
        if (this.timeout) {
            clearTimeout(this.timeout)   
        }
        this.timeout = setTimeout(() => {
            Utils.callApi("user-view", "invoke_contract", {
                args: `role=my_account,action=view,cid=${this.pluginData.contractId}`
            })
        }, now ? 0 : TIMEOUT)
    }
    
    parseShaderResult = (apiResult) => {
        if (typeof(apiResult.output) != 'string') {
            throw "Empty shader response"
        }
    
        const shaderOut = JSON.parse(apiResult.output)
        if (shaderOut.error) {
            throw ["Shader error: ", shaderOut.error].join("")
        }
    
        return shaderOut;
    }

    showFaucet = () => {
        const shouldWait  = this.pluginData.withdrawHeight 
            ? this.pluginData.withdrawHeight + this.pluginData.backlogPeriod > this.pluginData.currHeight 
            : false;
        const canWithdraw = !this.pluginData.inTransaction && !shouldWait;
    
        Utils.setText('cid', "Contract ID: " + this.pluginData.contractId);
        const bigValue = new Big(this.pluginData.withdrawLimit);
        Utils.setText('withdraw-limit', parseFloat(bigValue.div(GROTHS_IN_BEAM)));
        
        if (this.pluginData.inTransaction) {
            Utils.hide('buttons');
            Utils.show('intx');
        } else {
            Utils.show('buttons');
            Utils.hide('intx');
            canWithdraw ? Utils.show('withdraw') : Utils.hide('withdraw');
            shouldWait  ? Utils.show('wd-wait') : Utils.hide('wd-wait');
            Utils.setText('wd-wait-time', this.pluginData.withdrawHeight + this.pluginData.backlogPeriod - this.pluginData.currHeight);
        }
    
        Utils.show('faucet');
        this.refresh(false);
    }

    onApiResult = (json) => {    
        try {
            const apiAnswer = JSON.parse(json)
            if (apiAnswer.error) {
                throw JSON.stringify(apiAnswer.error)
            }
    
            const apiCallId = apiAnswer.id
            const apiResult = apiAnswer.result
            if (!apiResult) {
                throw "Failed to call wallet API"
            }
    
            if (apiCallId == "manager-view") {
                const shaderOut = this.parseShaderResult(apiResult);
                if (shaderOut.Cids) {
                    for (let idx = 0; idx < shaderOut.Cids.length; ++idx) {
                        const cid = shaderOut.Cids[idx]
                        if (cid == "c327a42e9037d060b8158d635990a53ea4cde2e217ed70eb5faf93cac22e4771") {
                            this.pluginData.contractId = cid;
                            break;
                        }
                    }
                }
    
                if (!this.pluginData.contractId) {
                    throw "Failed to verify contract cid"
                }
                
                Utils.callApi("manager-params", "invoke_contract", {
                    args: `role=manager,action=view_params,cid=${contractId}`
                });
    
                return 
            }
    
            if (apiCallId == "manager-params") {
                const shaderOut = this.parseShaderResult(apiResult)
    
                if (shaderOut.params) {
                    this.pluginData.backlogPeriod = shaderOut.params.backlogPeriod
                    this.pluginData.withdrawLimit = shaderOut.params.withdrawLimit
                }
                
                if (this.pluginData.backlogPeriod == undefined || this.pluginData.withdrawLimit == undefined) {
                    throw "Failed to get shader params"
                }
    
                return this.refresh(true);
            }
    
            if (apiCallId == "user-view") {
                const shaderOut = this.parseShaderResult(apiResult);
                if (shaderOut.accounts && shaderOut.accounts.length == 1) {
                    const account = shaderOut.accounts[0]
                    this.pluginData.withdrawHeight = account.h0
                } else {
                    this.pluginData.withdrawHeight = 0;
                }
    
                Utils.callApi("wallet-status", "wallet_status", {});
                return
            }
    
            if (apiCallId == "wallet-status") {
                if (!apiResult.current_height) {
                    throw "Failed to get wallet status"
                }
    
                this.pluginData.currHeight = apiResult.current_height
                Utils.callApi("tx-list", "tx_list", {})
                return
            }
    
            if (apiCallId == "tx-list") {
                if (!Array.isArray(apiResult)) {
                    throw ("Failed to get transactions list")
                }
    
                let ourActiveTx = (tx) => {
                    if (tx["tx_type_string"] == "contract") {
                        const ivdata = tx["invoke_data"]
                        for (let idx = 0; idx < ivdata.length; ++idx) {
                            if (ivdata[idx]["contract_id"] == this.pluginData.contractId) {
                                let status = tx["status"]
                                if (status == 2 || status == 3 || status == 4) {
                                    // cancelled, completed, failed
                                    continue
                                }
                                return true
                            }
                        }
                    }
                    return false
                }
    
                this.pluginData.inTransaction = false
                for (let idx = 0; idx < apiResult.length; ++idx) {
                    if (ourActiveTx(apiResult[idx])) {
                        this.pluginData.inTransaction = true
                        break
                    }
                }
                    
                return this.showFaucet()
            }
    
            if (apiCallId == "user-deposit") {
                return this.refresh(true)
            }
    
            if (apiCallId == "user-withdraw") {
                return this.refresh(true)
            }
        }
        catch(err) {
            return this.setError(err.toString());
        }
    }
}

Utils.onLoad(async (beamAPI) => {
    let faucet = new Faucet();
    Utils.byId('error').style.color = beamAPI.style.validator_error;
    beamAPI.callWalletApiResult.connect(faucet.onApiResult);
    faucet.start();

    Utils.byId('deposit').addEventListener('click', (ev) => {
        Utils.callApi("user-deposit", "invoke_contract", {
                args: `role=my_account,action=deposit,amount=500000000,aid=0,cid=${contractId}`
        });
        Utils.hide('buttons');
        // don't refresh here, need to wait until previous contract invoke completes
        ev.preventDefault();
        return false;
    });
    
    Utils.byId('withdraw').addEventListener('click', (ev) => {
        Utils.callApi("user-withdraw", "invoke_contract", {
            // TODO: amount
            args: `role=my_account,action=withdraw,amount=${withdrawLimit},aid=0,cid=${contractId}`
        });
        Utils.hide('buttons');
        // don't refresh here, need to wait until previous contract invoke completes
        ev.preventDefault();
        return false;
    });
});