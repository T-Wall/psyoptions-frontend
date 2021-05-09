import React, { useCallback } from 'react'
import { Link } from '@material-ui/core'
import { closePositionInstruction } from '@mithraic-labs/psyoptions'
import { PublicKey, Transaction } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, Token } from '@solana/spl-token'
import useConnection from './useConnection'
import useWallet from './useWallet'
import useNotifications from './useNotifications'
import { buildSolanaExplorerUrl } from '../utils/solanaExplorer'
import { initializeTokenAccountTx, WRAPPED_SOL_ADDRESS } from '../utils/token'
import { useSolanaMeta } from '../context/SolanaMetaContext'

/**
 * Close the Option the wallet has written in order to return the
 * underlying asset to the option writer
 *
 * @param market Market for the option to be closed
 * @param optionTokenSrcKey PublicKey where the Option Token will be burned from
 * @param underlyingAssetDestKEy PublicKey where the unlocked underlying asset will be sent
 * @param writerTokenSourceKey PublicKey of the address where the Writer Token will be burned from
 */

// Solana has a maximum packet size when sending a transaction.
// As of writing 25 mints is a good round number that won't
// breach that limit when OptionToken and WriterToken accounts
// are included in TX.
const MAX_MINTS_PER_TX = 25

export const useClosePosition = (
  market,
  optionTokenSrcKey,
  underlyingAssetDestKey,
  writerTokenSourceKey
) => {
  const { connection, endpoint } = useConnection()
  const { pushNotification } = useNotifications()
  const { pubKey, wallet } = useWallet()
  const { splTokenAccountRentBalance } = useSolanaMeta()

  const closePosition = useCallback(async (contractsToClose = 1) => {
    try {
      let remaining = contractsToClose
      const closeTxs = []

      while (remaining > 0) {
        const tx = new Transaction()
        const signers = []
        let _underlyingAssetDestKey = underlyingAssetDestKey
        if (market.uAssetMint === WRAPPED_SOL_ADDRESS) {
          // need to create a sol account
          const {
            transaction,
            newTokenAccount: wrappedSolAccount,
          } = await initializeTokenAccountTx({ // eslint-disable-line
            connection,
            payer: { publicKey: pubKey },
            mintPublicKey: new PublicKey(WRAPPED_SOL_ADDRESS),
            owner: pubKey,
            rentBalance: splTokenAccountRentBalance,
          })
          tx.add(transaction)
          signers.push(wrappedSolAccount)
          _underlyingAssetDestKey = wrappedSolAccount.publicKey
        }

        const closePositionIx = await closePositionInstruction({ // eslint-disable-line
          programId: new PublicKey(endpoint.programId),
          optionMarketKey: market.optionMarketKey,
          underlyingAssetPoolKey: market.underlyingAssetPoolKey,
          optionMintKey: market.optionMintKey,
          optionTokenSrcKey,
          optionTokenSrcAuthKey: pubKey,
          writerTokenMintKey: market.writerTokenMintKey,
          writerTokenSourceKey,
          writerTokenSourceAuthorityKey: pubKey,
          underlyingAssetDestKey: _underlyingAssetDestKey,
        })
        // loop this by # of times given by parameter
        const loopRemaining = remaining
        for (let i = 1; i <= Math.min(MAX_MINTS_PER_TX, loopRemaining); i += 1) {
          tx.add(closePositionIx)
          remaining -= 1
        }
        // Close out the wrapped SOL account so it feels native
        if (market.uAssetMint === WRAPPED_SOL_ADDRESS) {
          tx.add(
            Token.createCloseAccountInstruction(
              TOKEN_PROGRAM_ID,
              _underlyingAssetDestKey,
              pubKey, // Send any remaining SOL to the owner
              pubKey,
              [],
            ),
          )
        }
            
        tx.feePayer = pubKey
        const { blockhash } = await connection.getRecentBlockhash() // eslint-disable-line
        tx.recentBlockhash = blockhash
        
        if (signers.length) {
          tx.partialSign(...signers)
        }

        closeTxs.push(tx)
      }
      const signed = await wallet.signAllTransactions(closeTxs)

      await Promise.all(
        signed.map(async (signedTx) => {
          const txid = await connection.sendRawTransaction(signedTx.serialize())
          pushNotification({
            severity: 'info',
            message: `Submitted Transaction: Close Position`,
            link: (
              <Link href={buildSolanaExplorerUrl(txid)} target="_new">
                View on Solana Explorer
              </Link>
            ),
          })
          await connection.confirmTransaction(txid)

          pushNotification({
            severity: 'success',
            message: `Transaction Confirmed: Close Position`,
            link: (
              <Link href={buildSolanaExplorerUrl(txid)} target="_new">
                View on Solana Explorer
              </Link>
            ),
          })
        })
      )
    } catch (err) {
      pushNotification({
        severity: 'error',
        message: `${err}`,
      })
    }
  }, [
    underlyingAssetDestKey,
    market.uAssetMint,
    market.optionMarketKey,
    market.underlyingAssetPoolKey,
    market.optionMintKey,
    market.writerTokenMintKey,
    endpoint.programId,
    optionTokenSrcKey,
    pubKey,
    writerTokenSourceKey,
    connection,
    wallet,
    pushNotification,
    splTokenAccountRentBalance,
  ])

  return {
    closePosition,
  }
}
