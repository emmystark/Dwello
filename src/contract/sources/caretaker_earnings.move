// File: contracts/sources/caretaker_earnings.move
module rental_marketplace::caretaker_earnings;
    use sui::event;
    use sui::table::{Self, Table};

    /// Shared singleton tracking aggregated earnings for each caretaker address.
    ///
    /// The payment module updates this ledger on every successful purchase so caretakers
    /// can see their revenue within the UI. A future withdraw flow could consume these
    /// balances to send funds out of an escrow contract.
    public struct CaretakerEarnings has key {
        id: UID,
        balances: Table<address, u64>,
    }

    /// Fired whenever earnings are credited for a caretaker.
    public struct EarningsAdded has copy, drop {
        caretaker: address,
        delta: u64,
        new_total: u64,
    }

    /// Bootstraps the singleton earnings table and shares it.
    ///
    /// Call once post-deployment. Capture and store the resulting object ID
    /// (deploy script writes this into the frontend `.env.local`).
    fun init(ctx: &mut TxContext) {
        let balances = table::new<address, u64>(ctx);
        let earnings = CaretakerEarnings { id: object::new(ctx), balances };
        transfer::share_object(earnings);
    }

    /// Ensures a caretaker row exists with zero balance.
    public fun initialize_earnings(store: &mut CaretakerEarnings, caretaker: address) {
        if (!table::contains(&store.balances, caretaker)) {
            table::add(&mut store.balances, caretaker, 0);
        }
    }

    /// Adds `amount` (in smallest USDC units) to the caretaker's balance.
    public fun add_earnings(store: &mut CaretakerEarnings, caretaker: address, amount: u64) {
        if (!table::contains(&store.balances, caretaker)) {
            table::add(&mut store.balances, caretaker, 0);
        };
        let prev = *table::borrow_mut(&mut store.balances, caretaker);
        let updated = prev + amount;
        *table::borrow_mut(&mut store.balances, caretaker) = updated;
        event::emit(EarningsAdded { caretaker, delta: amount, new_total: updated });
    }