import Utils from "./utils.js"

const GROTHS_IN_BEAM = 100000000;

class Faucet {
    constructor() {
        this.timeout = undefined;
        this.pluginData = {
            contractId: undefined,
            inTransaction: false,
            backlogPeriod: undefined,
            withdrawLimit: undefined,
            withdrawHeight: 0,
            currHeight: 0,
        }
    }

    setError = (errmsg) => {
        Utils.hide('faucet')
        Utils.setText('error', errmsg)
        if (this.timeout) {
            clearTimeout(this.timeout)   
        }
        this.timeout = setTimeout(() => {
            Utils.setText('error', "")
            this.start()
        }, 3000);
    }

    start = () => {
        Utils.download("./faucetManager.wasm", (err, bytes) => {
            if (err) {
                let errTemplate = "Failed to load shader,";
                let errMsg = [errTemplate, err].join(" ");
                return this.setError(errMsg);
            }
    
            Utils.callApi("manager-view", "invoke_contract", {
                contract: bytes,
                args: "role=manager,action=view"
            })
        })
    }
    
    refresh = (now) => {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(() => {
            Utils.callApi("user-view", "invoke_contract", {
                args: ["role=my_account,action=view,cid=", this.pluginData.contractId].join("")
            })
        }, now ? 0 : 3000)
    }
    
    parseShaderResult = (apiResult) => {
        if (typeof(apiResult.output) != 'string') {
            throw "Empty shader response";
        }
    
        let shaderOut = JSON.parse(apiResult.output)
        if (shaderOut.error) {
            throw ["Shader error: ", shaderOut.error].join("")
        }
    
        return shaderOut
    }

    showFaucet = () => {
        const shouldWait  = this.pluginData.withdrawHeight ? this.pluginData.withdrawHeight 
            + this.pluginData.backlogPeriod > this.pluginData.currHeight : false;
        const canWithdraw = !this.pluginData.inTransaction && !shouldWait;
    
        Utils.setText('cid', "Contract ID: " + this.pluginData.contractId);
        Utils.setText('withdraw-limit', this.pluginData.withdrawLimit / 100000000);
        
        if (this.pluginData.inTransaction) {
            Utils.hide('buttons');
            Utils.show('intx');
            Utils.hide('wd-wait');
        } else {
            Utils.show('buttons');
            Utils.hide('intx');
            
            canWithdraw ? Utils.show('withdraw') : Utils.hide('withdraw');
            
            const waitFor = this.pluginData.withdrawHeight + this.pluginData.backlogPeriod - this.pluginData.currHeight;
            if (waitFor > 0) {
                shouldWait ? Utils.show('wd-wait') : Utils.hide('wd-wait');
                Utils.setText('wd-wait-time', ' ' + waitFor + ' ');
            } else {
                Utils.hide('wd-wait');
            }
        }
    
        Utils.show('faucet');
        this.refresh(false);
    }

    onApiResult = (json) => {    
        try {
            const apiAnswer = JSON.parse(json);
            if (apiAnswer.error) {
                throw JSON.stringify(apiAnswer.error)
            }
    
            const apiCallId = apiAnswer.id;
            const apiResult = apiAnswer.result;
            if (!apiResult) {
                throw "Failed to call wallet API"
            }
    
            if (apiCallId == "manager-view")
            {
                let shaderOut = this.parseShaderResult(apiResult)
                if (shaderOut.contracts) {
                    for (let idx = 0; idx < shaderOut.contracts.length; ++idx) {
                        let cid = shaderOut.contracts[idx].cid
                        if (cid == "c327a42e9037d060b8158d635990a53ea4cde2e217ed70eb5faf93cac22e4771") {
                            this.pluginData.contractId = cid;
                            break
                        }
                    }
                }
    
                if (!this.pluginData.contractId) {
                    throw "Failed to verify contract cid"
                }

                Utils.callApi("manager-params", "invoke_contract", {
                    args: ["role=manager,action=view_params,cid=", this.pluginData.contractId].join('')
                })
    
                return 
            }
    
            if (apiCallId == "manager-params") {
                let shaderOut = this.parseShaderResult(apiResult)
    
                if (shaderOut.params) {
                    this.pluginData.backlogPeriod = shaderOut.params.backlogPeriod
                    this.pluginData.withdrawLimit = shaderOut.params.withdrawLimit
                }
                
                if (this.pluginData.backlogPeriod == undefined || this.pluginData.withdrawLimit == undefined) {
                    throw "Failed to get shader params"
                }
    
                return this.refresh(true)
            }
    
            if (apiCallId == "user-view") {
                let shaderOut = this.parseShaderResult(apiResult)
                if (shaderOut.accounts && shaderOut.accounts.length == 1) {
                    let account = shaderOut.accounts[0]
                    this.pluginData.withdrawHeight = account.h0
                } else {
                    this.pluginData.withdrawHeight = 0;
                }
    
                Utils.callApi("wallet-status", "wallet_status", {})
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
                        let ivdata = tx["invoke_data"]
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
        catch(err) 
        {
            return this.setError(err.toString())
        }
    }
}

Utils.onLoad(async (beamAPI) => {
    let faucet = new Faucet();
    Utils.getById('error').style.color = beamAPI.style.validator_error;
    beamAPI.callWalletApiResult.connect(faucet.onApiResult);
    faucet.start();

    Utils.getById('deposit').addEventListener('click', (ev) => {
        Utils.show('deposit-popup');
    });
    
    Utils.getById('withdraw').addEventListener('click', (ev) => {
        Utils.show('withdraw-popup');
    });

    Utils.getById('cancel-button-popup-with').addEventListener('click', (ev) => {
        Utils.hide('withdraw-popup');
    });

    Utils.getById('cancel-button-popup-dep').addEventListener('click', (ev) => {
        Utils.hide('deposit-popup');
    });

    Utils.getById('deposit-button-popup').addEventListener('click', (ev) => {
        const bigValue = new Big(Utils.getById('deposit-input').value);
        const value = bigValue.times(GROTHS_IN_BEAM);
        Utils.callApi("user-deposit", "invoke_contract", {
            args: `role=my_account,action=deposit,amount=${parseInt(value)},aid=0,cid=${faucet.pluginData.contractId}`
        });
        Utils.hide('buttons');
        Utils.hide('deposit-popup');
        // don't refresh here, need to wait until previous contract invoke completes
        ev.preventDefault();
        return false;
    });

    Utils.getById('withdraw-button-popup').addEventListener('click', (ev) => {
        Utils.callApi("user-withdraw", "invoke_contract", {
            // TODO: amount
            args: ["role=my_account,action=withdraw,amount=", faucet.pluginData.withdrawLimit, "aid=0,cid=", faucet.pluginData.contractId].join('')
        })
        Utils.hide('buttons');
        Utils.hide('withdraw-popup');
        // don't refresh here, need to wait until previous contract invoke completes
        ev.preventDefault()
        return false
    });
});