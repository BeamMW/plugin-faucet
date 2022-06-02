import { call, put, takeLatest, select } from 'redux-saga/effects';
import { navigate } from '@app/shared/store/actions';
import { ROUTES, } from '@app/shared/constants';
import { LoadViewParams, LoadViewFunds } from '@core/api';
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

export function* loadParamsSaga(
    action: ReturnType<typeof actions.loadAppParams.request>,
  ): Generator {
    try {
        const result = (yield call(LoadViewParams, action.payload ? action.payload : null)) as FaucetAppParams;
        yield put(actions.loadAppParams.success(result));


        const funds = (yield call(LoadViewFunds)) as FaucetFund[];
        yield put(actions.setFaucetFunds(funds));

        console.log(funds);

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
            } else if (tr.invoke_data[0].amounts[0].asset_id === 31) {
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
