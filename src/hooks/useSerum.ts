import { useContext, useCallback } from 'react'
import { PublicKey } from '@solana/web3.js'

import { Market } from '@mithraic-labs/serum'
import { SerumContext } from '../context/SerumContext'
import {
  batchSerumMarkets,
  findMarketByAssets,
  getKeyForMarket,
} from '../utils/serum'
import useConnection from './useConnection'
import useNotifications from './useNotifications'
import {
  SerumOrderbooks,
  useSerumOrderbooks,
} from '../context/SerumOrderbookContext'
import { LocalSerumMarket } from '../types'

const useSerum = () => {
  const { pushNotification } = useNotifications()
  const { connection, dexProgramId } = useConnection()
  const { serumMarkets, setSerumMarkets } = useContext(SerumContext)
  const [_, setOrderbooks] = useSerumOrderbooks()

  const fetchMultipleSerumMarkets = useCallback(
    async (serumMarketKeys: PublicKey[], localLookUpKeys?: string[]) => {
      try {
        // set that the serum markets are loading
        if (localLookUpKeys) {
          const loading: Record<string, LocalSerumMarket> = {}
          localLookUpKeys.forEach((key) => {
            loading[key] = { loading: true }
          })
          setSerumMarkets((_markets) => ({ ..._markets, ...loading }))
        }
        // batch load the serum Market data
        const { serumMarketsInfo } = await batchSerumMarkets(
          connection,
          serumMarketKeys,
          {},
          dexProgramId,
        )
        const newMarkets = {}
        const newOrderbooks: SerumOrderbooks = {}
        serumMarketsInfo.forEach(({ market, orderbookData }) => {
          const key = getKeyForMarket(market)
          newMarkets[key] = {
            loading: false,
            serumMarket: market,
          }
          newOrderbooks[getKeyForMarket(market)] = orderbookData
        })
        setSerumMarkets((_markets) => ({ ..._markets, ...newMarkets }))
        setOrderbooks((_orderbooks) => ({ ..._orderbooks, ...newOrderbooks }))
      } catch (error) {
        console.error(error)
      }
    },
    [connection, dexProgramId, setOrderbooks, setSerumMarkets],
  )

  /**
   * Loads a serum market into the serumMarkets state
   * Or returns the instance if one already exists for the given mints
   *
   * @param serumMarketKey - Key for the Serum market
   * @param {string} mintA - Mint address of serum underlying asset
   * @param {string} mintB - Mint address of serum quote asset
   */
  const fetchSerumMarket = useCallback(
    async (
      serumMarketKey: PublicKey | undefined,
      mintA: string,
      mintB: string,
    ) => {
      const key = `${mintA}-${mintB}`

      // Set individual loading states for each market
      setSerumMarkets((markets) => ({
        ...markets,
        [key]: { loading: true },
      }))

      let serumMarket: Market
      let error
      try {
        if (serumMarketKey) {
          serumMarket = await Market.load(
            connection,
            serumMarketKey,
            {},
            dexProgramId,
          )
        } else {
          serumMarket = await findMarketByAssets(
            connection,
            new PublicKey(mintA),
            new PublicKey(mintB),
            dexProgramId,
          )
        }
      } catch (err) {
        console.error(err)
        error = err.message
        pushNotification({
          severity: 'error',
          message: `${err}`,
        })
      }

      const newMarket = {
        loading: false,
        error,
        serumMarket,
      }

      setSerumMarkets((markets) => {
        return { ...markets, [key]: newMarket }
      })

      return newMarket
    },
    [setSerumMarkets, connection, dexProgramId, pushNotification],
  )

  return {
    serumMarkets,
    setSerumMarkets,
    fetchSerumMarket,
    fetchMultipleSerumMarkets,
  }
}

export default useSerum