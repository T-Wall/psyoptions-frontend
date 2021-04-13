import { OpenOrders } from '@mithraic-labs/serum'
import { PublicKey } from '@solana/web3.js'
import { useCallback, useEffect, useRef } from 'react'
import { useSerumOpenOrders } from '../../context/SerumOpenOrdersContext'
import useConnection from '../useConnection'

/**
 * Handle subscriptions to serum OpenOrders for given market key
 */
export const useSubscribeOpenOrders = (key: string): void => {
  const { connection, dexProgramId } = useConnection()
  const [serumOpenOrders, setSerumOpenOrders] = useSerumOpenOrders()
  const openOrders = serumOpenOrders[key]

  useEffect(() => {
    let subscriptions: number[]
    if (openOrders) {
      subscriptions = openOrders.map((openOrder) =>
        connection.onAccountChange(openOrder.address, (accountInfo) => {
          const _openOrder = OpenOrders.fromAccountInfo(
            openOrder.address,
            accountInfo,
            dexProgramId,
          )
          setSerumOpenOrders((prevSerumOpenOrders) => {
            // find the index of the OpenOrders instance that should be replaced
            const index = prevSerumOpenOrders[key]?.findIndex((prevOpenOrder) =>
              prevOpenOrder.address.equals(openOrder.address),
            )
            // immutably replace the OpenOrders instance with the matching address
            const updatedOpenOrders = Object.assign(
              [],
              prevSerumOpenOrders[key],
              {
                [index]: _openOrder,
              },
            )
            return {
              ...prevSerumOpenOrders,
              [key]: updatedOpenOrders,
            }
          })
        }),
      )
    }
    return () => {
      if (subscriptions) {
        subscriptions.forEach((sub) =>
          connection.removeAccountChangeListener(sub),
        )
      }
    }
  }, [connection, dexProgramId, key, openOrders, setSerumOpenOrders])
}

/**
 * Create a subscription for an OpenOrders account that may not be in
 * application state yet. i.e. new OpenOrders account that will be created.
 */
export const useCreateAdHocOpenOrdersSubscription = (
  key: string,
): ((publicKey: PublicKey) => void) => {
  const { connection, dexProgramId } = useConnection()
  const [, setSerumOpenOrders] = useSerumOpenOrders()
  const subRef = useRef<number | null>(null)

  useEffect(() => {
    const _subRef = subRef

    return () => {
      if (_subRef.current) {
        connection.removeAccountChangeListener(_subRef.current)
      }
    }
  }, [connection])

  return useCallback(
    (publicKey: PublicKey) => {
      const sub = connection.onAccountChange(publicKey, (accountInfo) => {
        const _openOrder = OpenOrders.fromAccountInfo(
          publicKey,
          accountInfo,
          dexProgramId,
        )
        setSerumOpenOrders((prevSerumOpenOrders) => {
          // find the index of the OpenOrders instance that should be replaced
          let index = prevSerumOpenOrders[key]?.findIndex((prevOpenOrder) =>
            prevOpenOrder.address.equals(publicKey),
          )
          // if used to listen to an account before it's initialized,
          // then we must set the index to 0
          if (index < 0) {
            index = 0
          }
          // immutably replace the OpenOrders instance with the matching address
          const updatedOpenOrders = Object.assign(
            [],
            prevSerumOpenOrders[key],
            {
              [index]: _openOrder,
            },
          )
          return {
            ...prevSerumOpenOrders,
            [key]: updatedOpenOrders,
          }
        })
      })

      subRef.current = sub
    },
    [connection, dexProgramId, key, setSerumOpenOrders],
  )
}