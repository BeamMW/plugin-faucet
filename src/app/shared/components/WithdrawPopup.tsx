/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useRef, useState, useEffect } from 'react';
import { Button, AmountInput, Popup, Rate } from '@app/shared/components';
import { IconCancel, IconWithdrawBlue, IconAddMax } from '@app/shared/icons';
import { useDispatch, useSelector } from 'react-redux';
import { selectErrorMessage, selectSystemState } from '@app/shared/store/selectors';
import { useFormik } from 'formik';
import { toGroths, fromGroths } from '@core/appUtils';
import { UserWithdraw } from '@core/api';
import { styled } from '@linaria/react';
import { css } from '@linaria/core';
import { selectAppParams } from '@app/containers/Main/store/selectors';
import Select, { Option } from '@app/shared/components/Select';

interface WithdrawPopupProps {
  visible?: boolean;
  onCancel?: ()=>void;
}

interface WithdrawFormData {
    withdraw_amount: string;
}

const WithdrawButtonsClass = css`
    max-width: 145px !important;
`;

const AmountContainer = styled.div`
    display: flex;
    flex-align: row;

    > .amount-input-class {
        width: 340px !important;
    }

    > .amount-max-class {
        margin-top: 14px;
        margin-left: 17px;
        font-weight: bold;
        font-size: 14px;
        color: #0BCCF7;
        display: flex;
    }
`;

const WithdrawPopupClass = css`
    width: 450px !important;
`;

const selectClassName = css`
  align-self: flex-start;
  margin: 10px auto 0;
`;

const LabelStyled = styled.div`
  display: inline-block;
  vertical-align: bottom;
  line-height: 26px;
`;

const WithdrawPopup: React.FC<WithdrawPopupProps> = ({ visible, onCancel }) => {
  const appParams = useSelector(selectAppParams());
  const assets = [
    {id: 0, asset_id: 0, title: 'BEAM'},
    {id: 1, asset_id: 31, title: 'BEAMX'}
  ]

  const [activeAsset, setAsset] = useState(assets[0].id);
  const handleGet = () => {
    
  }
  const handleSelect = (next) => {
    setAsset(next);
  };


  return (
    <Popup
      className={WithdrawPopupClass}
      visible={visible}
      title="Get"
      cancelButton={(
        <Button variant='ghost' className={WithdrawButtonsClass} icon={IconCancel} onClick={()=>{
            onCancel();
          }}>
          cancel
        </Button>
      )}
      confirmButton={(
        <Button variant='regular' className={WithdrawButtonsClass} pallete='blue'
        icon={IconWithdrawBlue} onClick={handleGet}>
          Get
        </Button>
      )}
      onCancel={()=> {
        onCancel();
      }}
    >
      <AmountContainer>
        
      </AmountContainer>
    </Popup>
  );
};

export default WithdrawPopup;
