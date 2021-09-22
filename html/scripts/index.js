import Utils from "./utils.js"

const TIMEOUT = 3000;
const GROTHS_IN_BEAM = 100000000;
const REJECTED_CALL_ID = -32021;
const IN_PROGRESS_ID = 5;
const CONTRACT_ID = "50ab294a5ff6cedcfd74860898faf3f00967b9f1296c94f19dec24f2ab55595f";

class Faucet {
    constructor() {
        this.timeout = undefined;
        this.pluginData = {
            contractId: undefined,
            inProgress: false,
            isWithdraw: null,
            backlogPeriod: undefined,
            withdrawLimit: undefined,
            withdrawHeight: 0,
            total: 0,
            bytes: null
        }
    }

    setError = (errmsg) => {
        let errorElementId = "error-common";
        if (document.getElementById('faucet').classList.contains('hidden')) {
            errorElementId = "error-full";
            Utils.show('error-full-container');
        } else {
            Utils.show('error-common');
        }

        Utils.setText(errorElementId, errmsg)
        if (this.timeout) {
            clearTimeout(this.timeout);   
        }
        this.timeout = setTimeout(() => {
            Utils.setText(errorElementId, errmsg)
            this.start();
        }, TIMEOUT)
    }

    start = () => {
        Utils.download("./faucetManager.wasm", (err, bytes) => {
            if (err) {
                let errTemplate = "Failed to load shader,";
                let errMsg = [errTemplate, err].join(" ");
                return this.setError(errMsg);
            }
            this.pluginData.bytes = bytes;
    
            Utils.callApi("manager-view", "invoke_contract", {
                contract: bytes,
                create_tx: false,
                args: "role=manager,action=view"
            })
        })
    }
    
    refresh = (now) => {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(() => {
            this.loadTotal();
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

    loadTotal = () => {
        Utils.callApi("view_funds", "invoke_contract", {
            contract: this.pluginData.bytes,
            create_tx: false,
            args: ["role=manager,action=view_funds,cid=", this.pluginData.contractId].join("")
        })
    }

    showFaucet = () => {
        const canWithdraw = !this.pluginData.inProgress && this.pluginData.total > 0;
    
        Utils.setText('cid', "Contract ID: " + this.pluginData.contractId);
        Utils.setText('withdraw-limit', this.pluginData.withdrawLimit / GROTHS_IN_BEAM);
        
        if (this.pluginData.inProgress) {
            Utils.hide('buttons');
            Utils.show('intx');
        } else {
            Utils.show('buttons');
            Utils.hide('intx');
            
            canWithdraw ? Utils.show('withdraw') : Utils.hide('withdraw');
        }
    
        Utils.hide('error-full-container');
        Utils.hide('error-common');
        Utils.show('faucet');
        this.refresh(false);
    }

    onApiResult = (json) => {
        try {
            const apiAnswer = JSON.parse(json);
            if (apiAnswer.error) {
                if (apiAnswer.error.code == REJECTED_CALL_ID) {
                    return;
                }
                throw JSON.stringify(apiAnswer.error)
            }
    
            const apiCallId = apiAnswer.id;
            const apiResult = apiAnswer.result;
            if (!apiResult) {
                throw "Failed to call wallet API"
            }
    
            if (apiCallId == "manager-view") {
                let shaderOut = this.parseShaderResult(apiResult)
                if (shaderOut.contracts) {
                    for (let idx = 0; idx < shaderOut.contracts.length; ++idx) {
                        let cid = shaderOut.contracts[idx].cid
                        if (cid == CONTRACT_ID) {
                            this.pluginData.contractId = cid;
                            break
                        }
                    }
                }
    
                if (!this.pluginData.contractId) {
                    throw "Failed to verify contract cid"
                }

                Utils.callApi("manager-params", "invoke_contract", {
                    create_tx: false,
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

                Utils.callApi("tx-list", "tx_list", {})
                return
            }

            if (apiCallId == "tx-list") {
                if (!Array.isArray(apiResult)) {
                    throw "Failed to get transactions list";
                }

                this.pluginData.inProgress = false;
                this.pluginData.isWithdraw = null;

                for (let element of apiResult) {
                    if (element["tx_type_string"] == "contract") {
                        const ivdata = element["invoke_data"];
                        let isProgressDetected = false;
                        for (let data of ivdata) {
                            if (data["contract_id"] == this.pluginData.contractId) {
                                const status = element["status"]
                                if (status === IN_PROGRESS_ID) {
                                    isProgressDetected = true;
                                    break;
                                }
                            }
                        };

                        if (isProgressDetected) {
                            this.pluginData.inProgress = true;
                            this.pluginData.isWithdraw = element["comment"] === "withdraw from Faucet"; 
                            break;
                        }
                    }
                };
                return this.showFaucet();
            }

            if (apiCallId == "view_funds") {
                let shaderOut = this.parseShaderResult(apiResult);

                if (shaderOut.funds === undefined) {
                    throw 'Failed to load funds';
                }

                this.pluginData.total = shaderOut.funds.length > 0 ? 
                    shaderOut.funds[0]['Amount'] / GROTHS_IN_BEAM : 0;
                Utils.setText('in-vault', this.pluginData.total);
                
                Utils.callApi("user-view", "invoke_contract", {
                    create_tx: false,
                    args: ["role=my_account,action=view,cid=", this.pluginData.contractId].join("")
                })
            }

            if (apiCallId == "user-deposit" || apiCallId == "user-withdraw") {
                if (apiResult.raw_data === undefined || apiResult.raw_data.length < 1) {
                    throw 'Failed to load raw data';
                }

                Utils.callApi("process_invoke_data", "process_invoke_data", {
                    data: apiResult.raw_data
                });
                return this.refresh(true);
            }  else if (apiCallId == "process_invoke_data") {
                return this.refresh(true);
            }
        }
        catch(err) 
        {
            return this.setError(err.toString())
        }
    }
}

function appStart(faucet) {
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

    Utils.getById('deposit-input').addEventListener('keydown', (event) => {
        const specialKeys = [
            'Backspace', 'Tab', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp',
            'Control', 'Delete', 'F5'
          ];

        if (specialKeys.indexOf(event.key) !== -1) {
            return;
        }

        const current = Utils.getById('deposit-input').value;
        const next = current.concat(event.key);
      
        if (!Utils.handleString(next)) {
            event.preventDefault();
        }
    })

    Utils.getById('deposit-input').addEventListener('paste', (event) => {
        const text = event.clipboardData.getData('text');
        if (!Utils.handleString(text)) {
            event.preventDefault();
        }
    })

    Utils.getById('deposit-input').oninput = function() {
        const inputValue = Utils.getById('deposit-input').value
        if(inputValue === '' || inputValue === '0' || inputValue === '0.'  || inputValue > 100) {
            Utils.getById('deposit-button-popup').classList.add("disabled")
      }
         else (Utils.getById('deposit-button-popup').classList.remove("disabled"))
      };

    Utils.getById('deposit-button-popup').addEventListener('click', (ev) => {
        const bigValue = new Big(Utils.getById('deposit-input').value);
        const value = bigValue.times(GROTHS_IN_BEAM);
        Utils.callApi("user-deposit", "invoke_contract", {
            create_tx: false,
            args: `role=my_account,action=deposit,amount=${parseInt(value)},aid=0,cid=${faucet.pluginData.contractId}`
        });
        
        Utils.hide('buttons');
        Utils.hide('deposit-popup');
        ev.preventDefault();
        return false;
    });

    Utils.getById('withdraw-button-popup').addEventListener('click', (ev) => {
        Utils.callApi("user-withdraw", "invoke_contract", {
            create_tx: false,
            args: ["role=my_account,action=withdraw,amount=", faucet.pluginData.withdrawLimit, "aid=0,cid=", faucet.pluginData.contractId].join('')
        })
        Utils.hide('buttons');
        Utils.hide('withdraw-popup');
        // don't refresh here, need to wait until previous contract invoke completes
        ev.preventDefault()
        return false
    });
}

const faucet = new Faucet();
Utils.initialize((err) => {
    if (err) {
        // TODO:handle error
        alert('INIT ERROR: ' + err)
        return
    }
    
    if (Utils.isWeb()) {
        document.getElementById('faucet').style.height = '100%';
    }

    appStart(faucet)
    // TODO: why we pass CID here at all?
}, faucet.onApiResult, CONTRACT_ID)
