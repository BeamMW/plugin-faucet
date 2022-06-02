import React, { useState } from 'react';
import { css } from '@linaria/core';
import { styled } from '@linaria/react';

import { truncate } from '@core/utils';

import { useSelector } from 'react-redux';
import { IconBeam, IconBeamX } from '@app/shared/icons';
import Input from './Input';
import Select, { Option } from '@app/shared/components/Select';
import Rate from './Rate';

export const AMOUNT_MAX = 253999999.9999999;

interface AmountInputProps {
  value: string;
  error?: string;
  valid?: boolean;
  pallete?: 'purple' | 'blue';
  from?: 'deposit' | 'withdraw'
  onChange?: (value: string, activeAsset: number) => void; //TODO
}

const selectClassName = css`
  align-self: flex-start;
  margin-top: 10px;
`;

const ContainerStyled = styled.div`
  position: relative;
  display: flex;
  margin-bottom: 20px;

  > .input-area {
    width: 80%;
  }
`;

const containerStyle = css`
  flex-grow: 1;
`;

const REG_AMOUNT = /^(?!0\d)(\d+)(\.)?(\d{0,8})?$/;

const rateStyle = css`
  font-size: 12px;
  align-self: start;
  margin-left: 15px;
  text-align: start;
`;

const LabelStyled = styled.div`
  display: inline-block;
  vertical-align: bottom;
  line-height: 26px;
  margin-left: 8px;
`;

const AmountInput: React.FC<AmountInputProps> = ({
  value, error, pallete = 'purple', onChange, from, valid,
}) => {
  const assets = [
    {id: 0, asset_id: 0, title: 'BEAM', getIcon: ()=>{return <IconBeam/>}},
    {id: 1, asset_id: 12, title: 'BEAMX', getIcon: ()=>{return <IconBeamX/>}}
  ]

  const [rawData, setRawData] = useState('');
  const [activeAsset, setAsset] = useState(assets[0].id);

  const handleInput: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const { value: raw } = event.target;

    if ((raw !== '' && !REG_AMOUNT.test(raw)) || parseFloat(raw) > AMOUNT_MAX) {
      return;
    }
    setRawData(raw);
    onChange(raw, assets[activeAsset].asset_id);
  };

  const handleSelect = (next) => {
    setAsset(next);
    onChange(rawData, assets[next].asset_id);
  };

  return (
    <ContainerStyled>
      <div className='input-area'>
        <Input
          variant="proposal"
          valid={!error}
          label={error}
          value={value}
          pallete={pallete}
          maxLength={16}
          placeholder="0"
          className={containerStyle}
          onInput={handleInput}
        />
        {!error && activeAsset === 0 && <Rate value={parseFloat(value)} className={rateStyle} />}
      </div>
      <Select value={activeAsset} className={selectClassName} onSelect={handleSelect}>
        {assets.map(({ getIcon, id, title }) => (
          <Option key={id} value={id}>
            {getIcon()}
            <LabelStyled>{title}</LabelStyled>
          </Option>
        ))}
      </Select>
      
    </ContainerStyled>
  );
};

export default AmountInput;
