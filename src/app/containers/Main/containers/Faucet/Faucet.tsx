import React, { useEffect, useState } from 'react';
import { styled } from '@linaria/react';
import { css } from '@linaria/core';

import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Window, Button } from '@app/shared/components';
import { selectAppParams, selectRate, selectPopupsState, selectIsInProgress, selectDonatedBeamX, selectDonatedBeam, selectFunds } from '../../store/selectors';
import { loadRate, setPopupState } from '@app/containers/Main/store/actions';
import { IconDepositBlue, IconWithdrawBlue, IconBeamWithdraw, 
  IconBeamDonated, IconFaucetEmpty, IconBeam, IconBeamX } from '@app/shared/icons';
import { UserWithdraw } from '@core/api';
import { numFormatter, fromGroths } from '@core/appUtils';
import { PROPOSALS, ROUTES } from '@app/shared/constants';
import { selectSystemState, selectTransactions } from '@app/shared/store/selectors';
import Select, { Option } from '@app/shared/components/Select';

const StyledContainer = styled.div`
  margin: 50px auto 30px auto;
  padding: 30px 100px;
  border-radius: 10px;
  background-image: linear-gradient(105deg, rgba(11, 204, 247, .1) 2%, rgba(255, 255, 255, .1) 98%);
  display: flex;
  flex-direction: column;

  > .title {
    font-size: 16px;
    font-style: italic;
    margin-bottom: 20px;
    text-align: center;
  }

  > .empty {
    margin: 0 auto;
  }
`;

const EnjoyContainer = styled.div`
  margin: 50px auto 30px auto;
  padding: 10px 15px;
  border-radius: 10px;
  background-image: linear-gradient(105deg, rgba(11, 204, 247, .1) 2%, rgba(255, 255, 255, .1) 98%);
  display: flex;
  flex-direction: column;

  > .icon-inprogress {
    position: absolute;
  }

  > .enjoy {
    font-size: 24px;
    font-style: italic;
    padding: 45px 55px;
  }
`;

const StyledHelp = styled.div`
  opacity: 0.7;
  font-size: 16px;
  font-style: italic;
  margin: 0 auto 20px;
`;

const StyledDonated = styled.div`
  margin: 30px auto 50px;
  display: flex;
  flex-direction: column;

  > .thank {
    font-size: 24px;
    font-style: italic;
  }

  > .total-title {
    font-size: 16px;
    font-style: italic;
    color: #00f6d2;
    text-align: center;
    margin-top: 20px;
  }

  > .donated {
    font-size: 32px;
    color: #00f6d2;
    margin: 6px auto 10px;
  }

  > .separator {
    height: 1px;
    width: 100%;
    background-color: rgba(255, 255, 255, .7);
  }

  > .donated-icon {
    margin: 20px auto 0;
  }
`;

const donateButtonClass = css`
  max-width: 220px !important;
`;

const getButtonClass = css`
  margin-top: 20px !important;
`;

const selectClassName = css`
  align-self: flex-start;
  margin: 10px auto 0;
`;

const LabelStyled = styled.div`
  display: inline-block;
  vertical-align: bottom;
  line-height: 26px;
  margin-left: 10px;
`;

const EpochesBase: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const rate = useSelector(selectRate());
  const appParams = useSelector(selectAppParams());
  const popupsState = useSelector(selectPopupsState());
  const [isInProgress, setInProgress] = useState(false);
  const donatedBeam = useSelector(selectDonatedBeam());
  const donatedBeamX = useSelector(selectDonatedBeamX());
  const sysState = useSelector(selectSystemState());
  const funds = useSelector(selectFunds());
  const transactions = useSelector(selectTransactions());
  const [isBlocked, setIsBlocked] = useState(false);
  const assets = [
    {id: 0, asset_id: 0, title: 'BEAM', getIcon: ()=>{return <IconBeam/>}},
    {id: 1, asset_id: 31, title: 'BEAMX', getIcon: ()=>{return <IconBeamX/>}}
  ]
  const [activeAsset, setAsset] = useState(assets[0].id);
  const handleSelect = (next) => {
    setAsset(next);
  };

  useEffect(() => {
    if (!rate) {
      dispatch(loadRate.request());
    }
  }, [dispatch, rate]);

  useEffect(() => {
    let isInProgress = false;
    for (var tr of transactions) {
      if (tr.status === 5 && tr.income) {
        isInProgress = true;
      }
    }

    const lastH = transactions.find(()=> {return tr.status === 3 && tr.income});
    if (lastH) {
      const lh = sysState.current_height - lastH.height;
      setIsBlocked(lh <= appParams.backlogPeriod);
    }

    setInProgress(isInProgress);
  }, [transactions]);

  const donateClicked = () => {
    dispatch(setPopupState({type: 'deposit', state: !popupsState.deposit}));
  };

  return (
    <>
      <Window>
        {funds.length > 0 && appParams.enabled ?
          <>
            {isInProgress ? 
            <EnjoyContainer>
              <IconBeamWithdraw className='icon-inprogress'/>
              <div className='enjoy'>Enjoy trying the Beam Wallet!</div>
            </EnjoyContainer> :
            <StyledContainer>
              <div className='title'>See the wallet in action</div>
              <Select value={activeAsset} className={selectClassName} onSelect={handleSelect}>
                {assets.map(({ getIcon, id, title }) => (
                  <Option key={id} value={id}>
                    {getIcon()}
                    <LabelStyled>{title}</LabelStyled>
                  </Option>
                ))}
              </Select>
              <Button variant="regular" className={getButtonClass}
                onClick={()=>{
                  UserWithdraw(appParams.withdrawLimit, assets[activeAsset].asset_id);
                }}
                disabled={isBlocked}
                pallete='blue' icon={IconWithdrawBlue} >
                  get your first beam{activeAsset === 0 ? '' : 'x'}s
              </Button>
            </StyledContainer>
            }
          </> :
          <StyledContainer>
            <div className='title'>The faucet is empty,<br/>please try again later </div>
            <IconFaucetEmpty className='empty'/>
          </StyledContainer>
        }
        {
          donatedBeam > 0 || donatedBeamX > 0 ?
          <StyledDonated>
            <div className='thank'>Thank you for your support!</div>
            <div className='total-title'>In total you’ve deposited to the faucet</div>
            {donatedBeam > 0 && <div className='donated'>{numFormatter(fromGroths(donatedBeam))} BEAM</div>}
            {donatedBeam > 0 && donatedBeamX > 0 && <div className='separator'></div>}
            {donatedBeamX > 0 && <div className='donated'>{numFormatter(fromGroths(donatedBeamX))} BEAMX</div>}
            <IconBeamDonated className='donated-icon'/>
          </StyledDonated> : null
        }
        {
          donatedBeam === 0 && donatedBeamX === 0 &&
          <StyledHelp>Help more people to start using Beam</StyledHelp>
        }
        <Button variant="regular" className={donateButtonClass}
          onClick={()=>{
            donateClicked()
          }}
          pallete='purple' icon={IconDepositBlue}>
            {donatedBeam > 0 || donatedBeamX > 0 ? 'donate more' : 'donate to faucet'}
        </Button>
      </Window>
    </>
  );
};

export default EpochesBase;
