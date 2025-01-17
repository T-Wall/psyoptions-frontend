import React, { useState, useCallback } from 'react';
import clsx from "clsx";
import {
  Box,
  TableRow,
  makeStyles,
} from '@material-ui/core';
import moment from 'moment';
import BigNumber from 'bignumber.js';
import { PublicKey } from '@solana/web3.js';
import useSerum from '../../hooks/useSerum';
import {
  useSettleFunds,
  useUnsettledFundsForMarket,
} from '../../hooks/Serum';
import { TCell, TMobileCell } from '../StyledComponents/Table/TableStyles';
import { OptionType } from '../../types';
import TxButton from '../TxButton';
import useOptionsMarkets from '../../hooks/useOptionsMarkets';
import useScreenSize from '../../hooks/useScreenSize';
import { useSubscribeSerumOrderbook } from '../../hooks/Serum';

const useStyles = makeStyles((theme) => ({
  root: {},
  row: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  rowWrap: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    flexFlow: "wrap"
  },
  uppercase: {
    textTransform: "uppercase",
  },
  column: {
    display: "flex",
    flexDirection: "column",
  },
  tabletFont: {
    fontSize: "14px !important",
  },
  mobileFont: {
    fontSize: "10px !important",
  },
}));

const Empty = ({ children }) => (
  <span style={{ opacity: '0.3' }}>{children}</span>
);

const UnsettledRow = ({
  serumMarketKey,
  type,
  expiration,
  uAssetSymbol,
  qAssetSymbol,
  assetPair,
  strikePrice,
  contractSize,
  unsettledFunds,
  settleFunds,
  qAssetDecimals,
}: {
  serumMarketKey: PublicKey;
  type: OptionType;
  expiration: number;
  uAssetSymbol: string;
  qAssetSymbol: string;
  assetPair: string;
  strikePrice: string;
  contractSize: string;
  unsettledFunds: any;
  settleFunds: any;
  qAssetDecimals: number;
}) => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const { formFactor } = useScreenSize();
  const isMobile = formFactor === "mobile";
  useSubscribeSerumOrderbook(serumMarketKey.toString());

  const handleSettleFunds = useCallback(async () => {
    setLoading(true);
    await settleFunds();
    setLoading(false);
  }, [settleFunds]);

  const tokensUnsettled = new BigNumber(unsettledFunds.quoteFree.toString());

  const unsettledAssets = () => {
    if (tokensUnsettled.dividedBy(10 ** qAssetDecimals).toString() === '0') {
      return <Empty>{'-'}</Empty>;
    }
    return `${tokensUnsettled.dividedBy(10 ** qAssetDecimals).toString()}
      ${' '}${type === 'put' ? uAssetSymbol : qAssetSymbol}`;
  };

  return (
    <TableRow key={`tr-unsettled-${serumMarketKey}`}
      className={formFactor === 'tablet' ? classes.tabletFont :
      formFactor === 'mobile' ? classes.mobileFont : ''}>
      {formFactor === 'desktop' ?
      <>
        <TCell>{type}</TCell>
        <TCell>{assetPair}</TCell>
        <TCell>
          {`${moment.utc(expiration * 1000).format('LL')} 23:59:59 UTC`}
        </TCell>
        <TCell>{strikePrice}</TCell>
        <TCell>{`${contractSize} ${uAssetSymbol}`}</TCell>
        <TCell>{unsettledFunds.baseFree.toString()}</TCell>
        <TCell>{unsettledAssets()}</TCell>
        <TCell align="right">
          <TxButton
            variant="outlined"
            color="primary"
            onClick={handleSettleFunds}
            loading={loading}
          >
            {loading ? 'Settling Funds' : 'Settle Funds'}
          </TxButton>
        </TCell>
      </> :
      <>
        <TMobileCell className={clsx(classes.rowWrap,
          formFactor === "tablet" && classes.tabletFont,
          formFactor === "mobile" && classes.mobileFont)}>
          <Box pl={isMobile ? 1 : 2} className={classes.column}>
            <Box className={classes.uppercase}>{type}</Box>
            <Box>{assetPair}</Box>
          </Box>
          <Box pl={isMobile ? 1 : 2} className={classes.column}>
            <Box>{`Strike: ${strikePrice}`}</Box>
            <Box>{`${contractSize} ${uAssetSymbol}`}</Box>
            <Box>{`Qty: ${unsettledFunds.baseFree.toString()}`}</Box>
          </Box>
        </TMobileCell>
        <TMobileCell className={clsx(
          formFactor === "tablet" && classes.tabletFont,
          formFactor === "mobile" && classes.mobileFont)}>
          {`${moment.utc(expiration * 1000).format('LL')} 23:59:59 UTC`}
        </TMobileCell>
        <TMobileCell className={clsx(
          formFactor === "tablet" && classes.tabletFont,
          formFactor === "mobile" && classes.mobileFont)}>
          {unsettledAssets()}
        </TMobileCell>
        <TMobileCell align="right" className={clsx(
          formFactor === "tablet" && classes.tabletFont,
          formFactor === "mobile" && classes.mobileFont)}>
          <TxButton
            variant="outlined"
            color="primary"
            onClick={handleSettleFunds}
            loading={loading}
            size={isMobile ? 'small' : 'large'}
          >
            {loading ? 'Settling...' : 'Settle Funds'}
          </TxButton>
        </TMobileCell>
      </>}
    </TableRow>
  );
};

// Render all unsettled balances for a given market as table rows
const UnsettledBalancesRow: React.FC<{
  expiration: number;
  contractSize: string;
  type: OptionType;
  qAssetSymbol: string;
  uAssetSymbol: string;
  serumMarketKey: PublicKey;
  strikePrice: string;
  qAssetDecimals: number;
}> = ({
  expiration,
  contractSize,
  type,
  qAssetSymbol,
  uAssetSymbol,
  serumMarketKey,
  strikePrice,
  qAssetDecimals,
}) => {
  const { marketsBySerumKey } = useOptionsMarkets();
  const { serumMarkets } = useSerum();
  const serumMarketAddress = serumMarketKey.toString();
  const { serumMarket } = serumMarkets[serumMarketAddress] || {};
  const optionMarket = marketsBySerumKey[serumMarketAddress];
  const { settleFunds } = useSettleFunds(serumMarketAddress, optionMarket);
  const unsettledFunds = useUnsettledFundsForMarket(serumMarketAddress);

  if (
    !serumMarket ||
    (unsettledFunds.baseFree.toNumber() <= 0 &&
      unsettledFunds.quoteFree.toNumber() <= 0)
  ) {
    return null;
  }

  return (
    <UnsettledRow
      serumMarketKey={serumMarketKey}
      type={type}
      expiration={expiration}
      uAssetSymbol={uAssetSymbol}
      qAssetSymbol={qAssetSymbol}
      assetPair={type === 'put' ? `${qAssetSymbol}/${uAssetSymbol}` : `${uAssetSymbol}/${qAssetSymbol}`}
      strikePrice={strikePrice}
      contractSize={contractSize}
      unsettledFunds={unsettledFunds}
      settleFunds={settleFunds}
      qAssetDecimals={qAssetDecimals}
    />
  );
};

export default React.memo(UnsettledBalancesRow);
