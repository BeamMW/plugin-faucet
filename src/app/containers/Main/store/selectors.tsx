import { createSelector } from 'reselect';
import { AppState } from '../../../shared/interface';

const selectMain = (state: AppState) => state.main;

export const selectAppParams = () => createSelector(selectMain, (state) => state.appParams);
export const selectRate = () => createSelector(selectMain, (state) => state.rate);
export const selectPopupsState = () => createSelector(selectMain, 
    (state) => state.popupsState);
export const selectDonatedBeam = () => createSelector(selectMain, (state) => state.donatedBeam);
export const selectDonatedBeamX = () => createSelector(selectMain, (state) => state.donatedBeamX);
export const selectIsInProgress = () => createSelector(selectMain, (state) => state.isInProgress);
export const selectFunds = () => createSelector(selectMain, (state) => state.funds);
