import React from 'react';
import { useRoutes } from 'react-router-dom';

import { ROUTES_PATH } from '@app/shared/constants';
import {
  Faucet,
} from '@app/containers/Main/containers';

const routes = [
  {
    path: ROUTES_PATH.MAIN.FAUCET,
    element: <Faucet />,
    exact: true,
  },
];

const FaucetContainer = () => {
  const content = useRoutes(routes);

  return <>{content}</>;
};

export default FaucetContainer;
