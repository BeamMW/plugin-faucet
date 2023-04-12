import { call, put, takeLatest, select } from 'redux-saga/effects';
import { navigate } from '@app/shared/store/actions';
import { ROUTES, } from '@app/shared/constants';
import { LoadViewParams, LoadViewFunds, LoadAllAssets } from '@core/api';
import { selectTransactions } from '@app/shared/store/selectors';

import { actions } from '.';
import store from '../../../../index';
import { FaucetAppParams, FaucetFund, Transaction } from '@app/core/types';

import { setIsLoaded } from '@app/shared/store/actions';
import { selectIsLoaded } from '@app/shared/store/selectors';
import { RateResponse } from '../interfaces';

const FETCH_INTERVAL = 310000;
const API_URL = 'https://api.coingecko.com/api/v3/simple/price';
const RATE_PARAMS = 'ids=beam&vs_currencies=usd';

function parseMetadata(metadata) {
  const splittedMetadata = metadata.split(';');
  splittedMetadata.shift();
  const obj = splittedMetadata.reduce((accumulator, value, index) => {
    const data = value.split(/=(.*)/s);
    return {...accumulator, [data[0]]: data[1]};
  }, {});
  return obj;
}

export function* loadParamsSaga(
    action: ReturnType<typeof actions.loadAppParams.request>,
  ): Generator {
    try {
      const beamCoin = {
        aid: 0,
        metadata: '',
        parsedMetadata: {
          N: 'Beam'
        }
      };
      const result = (yield call(LoadViewParams, action.payload ? action.payload : null)) as FaucetAppParams;
      yield put(actions.loadAppParams.success(result));

      const assetsList = (yield call(LoadAllAssets)) as any;
      const fundsInContract = (yield call(LoadViewFunds)) as FaucetFund[];
      assetsList.forEach(element => {
        element['parsedMetadata'] = parseMetadata(element.metadata);
      });
      assetsList.unshift(beamCoin);
      yield put(actions.setDepositAssetsList(assetsList))
      yield put(actions.setFaucetFunds(fundsInContract));

      const enabledAssets = [];
      fundsInContract.map(item => {
        const asset = assetsList.find(asset => {
          return asset.aid === item.Aid;
        })
        enabledAssets.push(asset);
      });
      yield put(actions.setAssetsList(enabledAssets));

      const isLoaded = yield select(selectIsLoaded());
      if (!isLoaded) {
        store.dispatch(setIsLoaded(true));
        yield put(navigate(ROUTES.MAIN.FAUCET));
      }

      const trs = (yield select(selectTransactions())) as Transaction[];

      let donatedBeam = 0;
      let donatedBeamX = 0;

      for (var tr of trs) {
        if (tr.status === 3 && !tr.income) {
          if (tr.invoke_data[0].amounts[0].asset_id === 0) {
            donatedBeam += tr.invoke_data[0].amounts[0].amount;
          } else if (tr.invoke_data[0].amounts[0].asset_id === 7) {
            donatedBeamX += tr.invoke_data[0].amounts[0].amount;
          }
        }
      }
      yield put(actions.setDonatedBeam(donatedBeam));
      yield put(actions.setDonatedBeamx(donatedBeamX));
    } catch (e) {
      yield put(actions.loadAppParams.failure(e));
    }
}

async function loadRatesApiCall() {
  const response = await fetch(`${API_URL}?${RATE_PARAMS}`);
  const promise: RateResponse = await response.json();
  return promise.beam.usd;
}

export function* loadRate() {
  try {
    const result: number = yield call(loadRatesApiCall);

    yield put(actions.loadRate.success(result));
    setTimeout(() => store.dispatch(actions.loadRate.request()), FETCH_INTERVAL);
  } catch (e) {
    yield put(actions.loadRate.failure(e));
  }
}

function* mainSaga() {
    yield takeLatest(actions.loadAppParams.request, loadParamsSaga);
    yield takeLatest(actions.loadRate.request, loadRate);
}

export default mainSaga;
