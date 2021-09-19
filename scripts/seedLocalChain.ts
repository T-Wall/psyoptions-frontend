/**
 * TODO Create 4 CALL and 4 PUT markets for the Friday ending this month
 * TODO Initialize Serum markets for them
 * TODO seed some bids and asks with some random accounts
 */
import dotenv from 'dotenv';
import * as anchor from '@project-serum/anchor';
import { instructions } from '@mithraic-labs/psy-american';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import * as fs from 'fs';
import moment from 'moment';

import { getSolanaConfig } from './helpers';
import { getLastFridayOfMonths } from '../src/utils/dates';
import { getAssetsByNetwork } from '../src/utils/networkInfo';
import { ClusterName } from '../src/types';
import { createInitializeMarketTx } from '../src/utils/serum';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
dotenv.config();

const solanaConfig = getSolanaConfig();
// Get the default keypair and airdrop some tokens
const keyBuffer = fs.readFileSync(solanaConfig.keypair_path, 'utf8');
const wallet = new anchor.Wallet(new Keypair(JSON.parse(keyBuffer)));
const connection = new Connection('http://localhost:8899', {
  commitment: 'max',
});

const dexProgramId = new PublicKey(process.env.LOCAL_DEX_PROGRAM_ID);

const provider = new anchor.Provider(connection, wallet, {
  commitment: 'max',
});
const idlPath = `${process.env.OPTIONS_REPO}/target/idl/psy_american.json`;
const psyAmericanIdl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
const programId = new anchor.web3.PublicKey(process.env.LOCAL_PROGRAM_ID);

const program = new anchor.Program(psyAmericanIdl, programId, provider);

(async () => {
  // create markets for the end of the current month,
  // end of next month if last friday on this month passed
  const expirationDate = getLastFridayOfMonths(1)[0]
    ? getLastFridayOfMonths(1)[0]
    : getLastFridayOfMonths(2)[0];
  // We have to divide the JS timestamp by 1,000 to get the timestamp in miliseconds
  const expirationUnixTimestamp = expirationDate.unix();
  const assets = getAssetsByNetwork(ClusterName.localhost);
  const btc = assets.find((asset) => asset.tokenSymbol.match('BTC'));
  const usdc = assets.find((asset) => asset.tokenSymbol.match('USDC'));
  const btcKey = new PublicKey(btc.mintAddress);
  const usdcKey = new PublicKey(usdc.mintAddress);
  const wholeBtcPerContract = 0.1;
  const underlyingAmountPerContract = new BigNumber(
    wholeBtcPerContract,
  ).multipliedBy(new BigNumber(10).pow(btc.decimals));
  const quoteAssetPerContract = new BigNumber(
    35_000 * wholeBtcPerContract,
  ).multipliedBy(new BigNumber(10).pow(usdc.decimals));

  console.log(
    '*** initializing market with params',
    underlyingAmountPerContract.toString(),
    quoteAssetPerContract.toString(),
    btcKey.toString(),
    usdcKey.toString(),
    expirationUnixTimestamp,
  );

  const underlyingToken = await Token.createMint(
    connection,
    wallet.payer,
    wallet.payer.publicKey,
    wallet.payer.publicKey,
    8,
    TOKEN_PROGRAM_ID,
  );
  const quoteToken = await Token.createMint(
    connection,
    wallet.payer,
    wallet.payer.publicKey,
    wallet.payer.publicKey,
    2,
    TOKEN_PROGRAM_ID,
  );

  const { optionMarketKey } = await instructions.initializeMarket(
    program,
    wallet.payer,
    connection,
    {
      expirationUnixTimestamp: new anchor.BN(expirationUnixTimestamp),
      quoteAmountPerContract: new anchor.BN(quoteAssetPerContract.toNumber()),
      quoteMint: quoteToken.publicKey,
      underlyingAmountPerContract: new anchor.BN(
        underlyingAmountPerContract.toNumber(),
      ),
      underlyingMint: underlyingToken.publicKey,
    },
  );

  console.log(`*** created option: ${optionMarketKey}`);

  // const { optionMarketKey, optionMintKey } = await initializeMarket(
  //   wallet,
  //   underlyingAmountPerContract,
  //   quoteAssetPerContract,
  //   btcKey,
  //   usdcKey,
  //   expirationUnixTimestamp,
  // );

  // // This will likely be USDC or USDT but could be other things in some cases
  // const quoteLotSize = new BN(0.01 * 10 ** usdc.decimals);
  // // baseLotSize should be 1 -- the options market token doesn't have decimals
  // const baseLotSize = new BN('1');
  // console.log('*** intializing serum market', new Date().toISOString());
  // const { tx1, tx2, signers1, signers2, market } =
  //   await createInitializeMarketTx({
  //     connection,
  //     payer: wallet.publicKey,
  //     baseMint: optionMintKey,
  //     quoteMint: usdcKey,
  //     baseLotSize,
  //     quoteLotSize,
  //     dexProgramId,
  //   });

  // await sendAndConfirmTransaction(connection, tx1, [wallet, ...signers1], {
  //   commitment: 'confirmed',
  // });

  // await sendAndConfirmTransaction(connection, tx2, [wallet, ...signers2], {
  //   commitment: 'confirmed',
  // });
})();
