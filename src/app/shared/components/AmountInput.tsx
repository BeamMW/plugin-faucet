import React, { useState } from 'react';
import { css } from '@linaria/core';
import { styled } from '@linaria/react';
import { useSelector } from 'react-redux';
import { AssetIcon } from '@app/shared/components';
import Input from './Input';
import Select, { Option } from '@app/shared/components/Select';
import Rate from './Rate';
import { selectDepositAssetsList } from '@app/containers/Main/store/selectors';

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
  margin: 0 5px 0 10px;
  max-width: 150px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`;

const AmountInput: React.FC<AmountInputProps> = ({
  value, error, pallete = 'purple', onChange, from, valid,
}) => {
  const assetsList = useSelector(selectDepositAssetsList());
  const [rawData, setRawData] = useState('');
  const [activeAsset, setAsset] = useState(0);

  const handleInput: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const { value: raw } = event.target;

    if ((raw !== '' && !REG_AMOUNT.test(raw)) || parseFloat(raw) > AMOUNT_MAX) {
      return;
    }
    setRawData(raw);
    onChange(raw, assetsList[activeAsset].aid);
  };

  const handleSelect = (next) => {
    setAsset(next);
    onChange(rawData, assetsList[next].aid);
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
        {assetsList.map((asset, index) => (
          <Option key={index} value={index}>
            <AssetIcon asset_id={asset.aid} className="without-transform" />
            <LabelStyled>{asset.parsedMetadata['N']}</LabelStyled>
            <span>(id:{asset.aid})</span>
          </Option>
        ))}
      </Select>
      
    </ContainerStyled>
  );
};

export default AmountInput;
