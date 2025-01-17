import React, { memo, useMemo } from 'react';
import {
  Box,
  TableContainer,
  TableRow,
  TableBody,
  Table,
  makeStyles,
} from "@material-ui/core";
import { useConnectedWallet } from "@saberhq/use-solana";
import useOpenPositions from '../../../hooks/useOpenPositions';
import { useWrittenOptions } from '../../../hooks/useWrittenOptions';
import useOptionsMarkets from '../../../hooks/useOptionsMarkets';
import WrittenOptionRow from './WrittenOptionRow';
import WrittenOptionsTableHeader from './WrittenOptionsTableHeader';
import { TCell } from '../../StyledComponents/Table/TableStyles';
import GokiButton from '../../GokiButton';
import CSS from 'csstype';

const useStyles = makeStyles((theme) => ({
  walletButtonCell: {
    textAlign: "-webkit-center" as CSS.Property.TextAlign,
  }
}));

// TODO handle the case where the writer has multiple underlying asset accounts
const WrittenOptionsTable: React.VFC<{
  className: string;
}> = ({ className }) => {
  const classes = useStyles();
  const wallet = useConnectedWallet();
  const positions = useOpenPositions();
  const writtenOptions = useWrittenOptions();
  const { marketsByUiKey } = useOptionsMarkets();
  const nowInSeconds = Date.now() / 1000;

  // TODO - Add user-configurable sort order
  // For now just sort by expiration to make sure the expired options are below the active ones
  const writtenOptionKeys = useMemo(
    () =>
      Object.keys(writtenOptions).sort((keyA, keyB) => {
        const marketA = marketsByUiKey[keyA];
        const marketB = marketsByUiKey[keyB];
        return marketB?.expiration - marketA?.expiration;
      }),
    [writtenOptions, marketsByUiKey],
  );

  return (
    <Box style={{ zIndex: 1 }}>
      <TableContainer>
        <Table stickyHeader aria-label="sticky table">
          <WrittenOptionsTableHeader />
          <TableBody>
            {!wallet?.connected ? (
              <TableRow>
                <TCell align="center" colSpan={10} className={classes.walletButtonCell}>
                  <Box p={1}>
                    <GokiButton />
                  </Box>
                </TCell>
              </TableRow>
            ) : (
              <>
                {writtenOptionKeys.map((marketKey) => {
                  const market = marketsByUiKey[marketKey];
                  const heldContracts = positions[marketKey]
                    ? positions[marketKey].filter((position) => position.amount > 0)
                    : [];
                  return (
                    <WrittenOptionRow
                      expired={nowInSeconds > market.expiration}
                      key={marketKey}
                      marketKey={marketKey}
                      writerTokenAccounts={writtenOptions[marketKey]}
                      heldContracts={heldContracts}
                      className={className}
                    />
                  );
                })}
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default memo(WrittenOptionsTable);
