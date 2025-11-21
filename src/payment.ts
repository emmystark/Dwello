import { useSignAndExecuteTransaction } from "@mysten/dapp-kit"
import { Transaction } from '@mysten/sui/transactions';
import {suiClient} from './walrus/client.ts'
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';

const PACKAGE_ID = "0x67ebf4b12b0e8744c79f6aa10e6d716490ec89ff1acf75d7db879c6f2a5d2ea"
const earningStoreID = "0x36936bf8afdad8467e9289f696da007f298b7b5b865794094bcbbcbcbdb90cb2"
const myCaretakerCapID = "0x43fba84f6be0a391588e72fcbe3cc9574b9814b3c7e103434432040b70dbfe84" //do not use this. It is in my wallet and not anywhere else

const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()

async function createHouseAndGetId(name: string, house_address: string,  country: string, state: string, region: string, pricing: any, bedroom: any, bathroom: any): Promise<string> {

    function useFetchCaretakerCap() {
        const account = useCurrentAccount();
        if (!account) {
          return { data: [] };
    }
  // Replace PACKAGE_ID and MODULE_NAME with your actual values
  const { data, isLoading, isError, error, refetch } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: account.address,
      limit: 1,
      filter: {
        MatchAll: [
          {
            StructType: `${PACKAGE_ID}::caretaker::CaretakerCap`,
          },
          {
            AddressOwner: account.address,
          },
        ],
      },
      options: {
        showOwner: true,
        showType: true,
      },
    },
    { queryKey: ['CaretakerCap'] },
  );
  return {
    data: data && data.data.length > 0 ? data.data : [],
    isLoading,
    isError,
    error,
    refetch,
  };
}

const { data: caretakerCaps } = useFetchCaretakerCap();
const caretakerCapId = caretakerCaps[0]?.data?.objectId ?? null;

// Now you can safely use caretakerCapId
if (caretakerCapId) {
    const txb = new Transaction();
    // Add your Move call to create_house
    txb.moveCall({
      target: `${PACKAGE_ID}::house::create_house`,
      arguments: [
        txb.object(caretakerCapId),
        txb.pure.string(name),
        txb.pure.string(house_address),
        txb.pure.string(country),
        txb.pure.string(state),
        txb.pure.string(region),
        txb.pure(pricing),
        txb.pure(bedroom),
        txb.pure(bathroom)
      ],
    });
    
    // Sign and execute the transaction 
    const result = await signAndExecute({transaction: txb})
    const digest = result.digest;
    const txBlock = await suiClient.getTransactionBlock({ digest });
    
type HouseCreatedEventJson = {
  house_id: string;
  name: string;
  house_address: string;
  caretaker: string;
};

const houseCreatedEvent = txBlock.events?.find(
  (e: any) => e.type === `${PACKAGE_ID}::house::HouseCreatedEvent`
);

if (!houseCreatedEvent) {
  throw new Error('HouseCreatedEvent not found!');
}

// Type assertion to tell TypeScript the expected shape
const parsed = houseCreatedEvent.parsedJson as HouseCreatedEventJson;

const houseId = parsed.house_id;
console.log('New house ID:', houseId);

return houseId;

}
else{
    throw new Error("Error")
}

}

async function payforaccess(houseId: string, usdcCoinId: string, earningStoreID: string): Promise<void> {

    const txb = new Transaction();
    // Add your Move call to pay_for_access}
    txb.moveCall({
        target: `${PACKAGE_ID}::payment::pay_for_access`,
        arguments: [
            txb.object(usdcCoinId),
            txb.object(houseId),
            txb.object(earningStoreID)

        ]

    });

    await signAndExecute({transaction: txb})

}

async function addEarnings(earningStoreID: string, amount: any) {
  const account = useCurrentAccount();
  if (!account) {
    throw new Error("No account found");
}
  const txb = new Transaction();
  // Add your Move call to add_earnings
  txb.moveCall({
      target: `${PACKAGE_ID}::caretaker_earnings::add_earnings`,
      arguments: [
          txb.object(earningStoreID),
          txb.object(account.address),
          txb.pure(amount)

      ]
    })
  await signAndExecute({transaction: txb})
  }
