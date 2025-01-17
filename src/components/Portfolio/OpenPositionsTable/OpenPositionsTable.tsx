import React, { memo, useState } from 'react';
import {
  Box,
  TableContainer,
  TableRow,
  TableBody,
  Table,
  makeStyles,
} from "@material-ui/core";
import { useConnectedWallet } from "@saberhq/use-solana";
import OpenPositionsTableHeader from './OpenPositionsTableHeader';
import PositionRow from './PositionRow';
import { Position } from '../Portfolio';
import { TCell } from '../../StyledComponents/Table/TableStyles';
import GokiButton from '../../GokiButton';
import CSS from 'csstype';

const useStyles = makeStyles((theme) => ({
  walletButtonCell: {
    textAlign: "-webkit-center" as CSS.Property.TextAlign,
  }
}));

// TODO handle the case where the writer has multiple underlying asset accounts
const OpenPositionsTable: React.VFC<{
  positions: Position[];
  className: string;
}> = ({ className, positions }) => {
  const classes = useStyles();
  const wallet = useConnectedWallet();
  const [page] = useState(0);
  const [rowsPerPage] = useState(10);

  return (
    <Box style={{ zIndex: 1 }}>
      <TableContainer>
        <Table stickyHeader aria-label="sticky table">
          <OpenPositionsTableHeader />
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
              positions
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => (
                <PositionRow
                  key={row.market.optionMintKey.toString()}
                  row={row}
                  className={className}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default memo(OpenPositionsTable);