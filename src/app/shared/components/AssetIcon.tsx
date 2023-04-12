import React from 'react';
import {
  BeamIcon as BeamIconSvg,
  IconBeamX as BeamXIconSvg,
  AssetIcon as AssetIconSvg } from '@app/shared/icons';

import { styled } from '@linaria/react';
import { PALLETE_ASSETS } from '@app/shared/constants';

export interface AssetIconProps extends Partial<any> {
  asset_id?: number;
  className?: string;
}

const ContainerStyled = styled.div<AssetIconProps>`
  display: inline-block;
  vertical-align: middle;
  width: 26px;
  height: 26px;
  margin-right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ asset_id }) => (PALLETE_ASSETS[asset_id] ? PALLETE_ASSETS[asset_id] : PALLETE_ASSETS[asset_id % PALLETE_ASSETS.length])};
  &.without-transform {
    transform: none;
  }
`;

const AssetIcon: React.FC<AssetIconProps> = ({ asset_id = 0, className }) => {
  let IconComponent;
  if (asset_id === 0) {
    IconComponent = BeamIconSvg;
  } else if (asset_id === 7) {
    IconComponent = BeamXIconSvg;
  } else {
    IconComponent = AssetIconSvg;
  }
  return (
    <ContainerStyled asset_id={asset_id} className={className}>
      <IconComponent/>
    </ContainerStyled>
  );
};

export default AssetIcon;
