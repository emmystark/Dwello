import { useCallback } from 'react'
import { Transaction } from '@mysten/sui/transactions'
import { suiClient } from './walrus/client'
import { useSui } from './sui/SuiProviders'

const PACKAGE_ID =
  '0x67ebf4b12b0e8744c79f6aa10e6d716490ec89ff1acf75d7db879c6f2a5d2ea2'
const earningStoreID =
  '0x36936bf8afdad8467e9289f696da007f298b7b5b865794094bcbbcbcbdb90cb2'
const myCaretakerCapID =
  '0x43fba84f6be0a391588e72fcbe3cc9574b9814b3c7e103434432040b70dbfe84' //do not use this. It is in my wallet and not anywhere else
const USDC_TYPE =
  '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC'
const PAYMENT_AMOUNT = 10000n

export const useDwelloPayments = () => {
  const { wallet, account } = useSui()

  const createHouseAndGetId = useCallback(
    async (
      name: string,
      house_address: string,
      country: string,
      state: string,
      region: string,
      pricing: any,
      bedroom: any,
      bathroom: any,
    ): Promise<string> => {
      if (!wallet || !account) {
        throw new Error('Wallet not connected')
      }

      const accounts = (wallet as any).accounts || []
      const walletAccount =
        accounts.find((a: any) => a.address === account) || accounts[0]

      if (!walletAccount) {
        throw new Error('No wallet account available')
      }

      // Fetch CaretakerCap owned by this account. We don't rely on a strict
      // StructType filter here because the on-chain type may be generic
      // (e.g. CaretakerCap<...>), so we scan owned objects by type prefix.
      const owned = await suiClient.getOwnedObjects({
        owner: account,
        options: {
          showType: true,
          showOwner: true,
        },
      })

      const caretakerObject = owned.data.find((obj: any) => {
        const type = obj.data?.type as string | undefined
        return type?.startsWith(`${PACKAGE_ID}::house::CaretakerCap`)
      })

      const caretakerCapId = caretakerObject?.data?.objectId
      if (!caretakerCapId) {
        console.error(
          'CaretakerCap not found for account',
          account,
          'owned object types:',
          owned.data.map((o: any) => o.data?.type),
        )
        throw new Error(
          'CaretakerCap not found for this account. Make sure this wallet has a caretaker role on-chain for the Dwello package.',
        )
      }

      const pricingStr = typeof pricing === 'string' ? pricing : String(pricing ?? '')
      const pricingDigits = pricingStr.replace(/[^0-9]/g, '')
      const pricingNum = pricingDigits ? parseInt(pricingDigits, 10) : 0
      const pricingU8 = Math.max(0, Math.min(255, pricingNum))

      const bedroomNum =
        typeof bedroom === 'string' ? parseInt(bedroom || '0', 10) : Number(bedroom ?? 0)
      const bathroomNum =
        typeof bathroom === 'string' ? parseInt(bathroom || '0', 10) : Number(bathroom ?? 0)

      const bedroomU8 = Math.max(0, Math.min(255, bedroomNum))
      const bathroomU8 = Math.max(0, Math.min(255, bathroomNum))

      const txb = new Transaction()
      txb.moveCall({
        target: `${PACKAGE_ID}::house::create_house`,
        arguments: [
          txb.object(caretakerCapId),
          txb.pure.string(name),
          txb.pure.string(house_address),
          txb.pure.address(account),
          txb.pure.string(country),
          txb.pure.string(state),
          txb.pure.string(region),
          txb.pure.u8(pricingU8),
          txb.pure.u8(bedroomU8),
          txb.pure.u8(bathroomU8),
        ],
      })

      const feature: any = (wallet as any).features?.['sui:signAndExecuteTransaction']
      if (!feature || typeof feature.signAndExecuteTransaction !== 'function') {
        throw new Error('Connected wallet does not support signAndExecuteTransaction')
      }

      const result = await feature.signAndExecuteTransaction({
        transaction: txb,
        account: walletAccount,
        chain: (walletAccount.chains && walletAccount.chains[0]) || 'sui:testnet',
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      })

      const digest =
        (result as any).digest ||
        (result as any).effects?.transactionDigest ||
        (result as any).response?.digest

      if (!digest) {
        console.warn('No digest returned from wallet; cannot read events')
        return ''
      }

      const txBlock = await suiClient.getTransactionBlock({
        digest,
        options: { showEvents: true },
      })

      type HouseCreatedEventJson = {
        house_id: string
        name: string
        house_address: string
        caretaker: string
      }

      const houseCreatedEvent = txBlock.events?.find(
        (e: any) => e.type === `${PACKAGE_ID}::house::HouseCreatedEvent`,
      )

      if (!houseCreatedEvent) {
        throw new Error('HouseCreatedEvent not found!')
      }

      const parsed = houseCreatedEvent.parsedJson as HouseCreatedEventJson
      const houseId = parsed.house_id
      console.log('New house ID:', houseId)

      return houseId
    },
    [wallet, account],
  )

  const payforaccess = useCallback(
    async (houseId: string): Promise<void> => {
      if (!wallet || !account) {
        throw new Error('Wallet not connected')
      }

      const accounts = (wallet as any).accounts || []
      const walletAccount =
        accounts.find((a: any) => a.address === account) || accounts[0]

      if (!walletAccount) {
        throw new Error('No wallet account available')
      }

      const usdcType = USDC_TYPE
      const coins = await suiClient.getCoins({
        owner: account,
        coinType: usdcType,
        limit: 50,
      })

      const coinWithBalance = coins.data.find(
        (c: any) => BigInt(c.balance) >= PAYMENT_AMOUNT,
      )

      if (!coinWithBalance) {
        throw new Error(
          'No USDC coin with enough balance found in this wallet for access payment',
        )
      }

      const usdcCoinId = coinWithBalance.coinObjectId

      const txb = new Transaction()
      txb.moveCall({
        target: `${PACKAGE_ID}::payment::pay_for_access`,
        typeArguments: [usdcType],
        arguments: [
          txb.object(usdcCoinId),
          txb.object(houseId),
          txb.object(earningStoreID),
        ],
      })

      const feature: any = (wallet as any).features?.['sui:signAndExecuteTransaction']
      if (!feature || typeof feature.signAndExecuteTransaction !== 'function') {
        throw new Error('Connected wallet does not support signAndExecuteTransaction')
      }

      await feature.signAndExecuteTransaction({
        transaction: txb,
        account: walletAccount,
        chain: (walletAccount.chains && walletAccount.chains[0]) || 'sui:testnet',
        options: {
          showEffects: true,
        },
      })
    },
    [wallet, account],
  )

  const addEarnings = useCallback(
    async (amount: any): Promise<void> => {
      if (!wallet || !account) {
        throw new Error('Wallet not connected')
      }

      const accounts = (wallet as any).accounts || []
      const walletAccount =
        accounts.find((a: any) => a.address === account) || accounts[0]

      if (!walletAccount) {
        throw new Error('No wallet account available')
      }

      const txb = new Transaction()
      txb.moveCall({
        target: `${PACKAGE_ID}::caretaker_earnings::add_earnings`,
        arguments: [
          txb.object(earningStoreID),
          txb.object(walletAccount.address),
          txb.pure(amount),
        ],
      })

      const feature: any = (wallet as any).features?.['sui:signAndExecuteTransaction']
      if (!feature || typeof feature.signAndExecuteTransaction !== 'function') {
        throw new Error('Connected wallet does not support signAndExecuteTransaction')
      }

      await feature.signAndExecuteTransaction({
        transaction: txb,
        account: walletAccount,
        chain: (walletAccount.chains && walletAccount.chains[0]) || 'sui:testnet',
        options: {
          showEffects: true,
        },
      })
    },
    [wallet, account],
  )

  return {
    createHouseAndGetId,
    payforaccess,
    addEarnings,
  }
}

// Mark as used to satisfy lint rules without changing behavior
void myCaretakerCapID
