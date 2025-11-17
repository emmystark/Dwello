module rental_marketplace::payment {
    use sui::coin::{Self, Coin};
    use usdc::USDC;
    use sui::event;
    use rental_marketplace::house;
    use rental_marketplace::caretaker_earnings;

    /// 0.01 USDC assuming 6 decimals => 10,000 base units
    const PAYMENT_AMOUNT: u64 = 10000;

    /// Platform wallet to receive 70% of the fee.
    /// Replace this with the actual platform address after deployment if needed.
    const PLATFORM_WALLET: address = @0xda140be42f5a8ec39cd1a6f9eb4c48de1054ea0835062812da013bb6ba763f2f;

    /// Error codes
    const EInsufficientPayment: u64 = 1;

    /// AccessPass is a simple NFT proving payment for a specific house by a specific user.
    /// It is transferable, but typically held by the payer to unlock UI features.
    public struct AccessPass has key, store {
        id: UID,
        user: address,
        house_id: ID,
        paid_at: u64,
        amount: u64,
    }

    /// Event for successful payments.
    public struct PaymentMade has copy, drop {
        user: address,
        house_id: ID,
        amount: u64,
        caretaker_share: u64,
        platform_share: u64,
    }

    /// Pay for access using a generic coin type (e.g., USDC with 6 decimals).
    /// - `coin` must carry at least PAYMENT_AMOUNT base units.
    /// - Splits 70% to platform, 30% recorded to caretaker earnings.
    /// - Mints an AccessPass NFT to the user.
    /// - Increments house view counter.
    /// - Requires a mutable reference to the shared `CaretakerEarnings` table object.
    public fun pay_for_access<USDC>(
        mut coin_in: Coin<USDC>,
        target_house: &mut house::House,
        earnings_store: &mut caretaker_earnings::CaretakerEarnings,
        paid_at: u64,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        let value = coin::value(&coin_in);
        assert!(value >= PAYMENT_AMOUNT, EInsufficientPayment);

        // Compute split: 70% platform, 30% caretaker
        let platform_share = (PAYMENT_AMOUNT * 70) / 100;
        let caretaker_share = PAYMENT_AMOUNT - platform_share;

        // If user sent more than needed, return change.
        let mut change_opt: Option<Coin<USDC>> = if (value > PAYMENT_AMOUNT) {
            let change_val = value - PAYMENT_AMOUNT;
            let change_coin = coin::split(&mut coin_in, change_val, ctx);
            option::some(change_coin)
        } else {
            option::none()
        };

        // Now coin_in has exactly PAYMENT_AMOUNT
        // Split caretaker share from coin_in
        let caretaker_coin = coin::split(&mut coin_in, caretaker_share, ctx);
        // coin_in now has platform_share remaining

        // Send platform funds
        transfer::public_transfer(coin_in, PLATFORM_WALLET);

        // Record caretaker earnings
        // Get caretaker address using the public getter function
        let caretaker_addr = house::get_caretaker(target_house);
        caretaker_earnings::add_earnings(earnings_store, caretaker_addr, caretaker_share);
        
        // Send caretaker coin to platform as escrow for MVP
        // (In production, implement a withdraw mechanism)
        transfer::public_transfer(caretaker_coin, PLATFORM_WALLET);

        // Mint AccessPass to the payer as proof
        let house_id = object::id(target_house);
        let pass = AccessPass {
            id: object::new(ctx),
            user: sender,
            house_id,
            paid_at,
            amount: PAYMENT_AMOUNT,
        };
        transfer::transfer(pass, sender);

        // Increment views
        house::increment_views(target_house);

        event::emit(PaymentMade {
            user: sender,
            house_id,
            amount: PAYMENT_AMOUNT,
            caretaker_share,
            platform_share,
        });

        // Return change if any
        if (option::is_some(&change_opt)) {
            let change = option::extract(&mut change_opt);
            transfer::public_transfer(change, sender);
        };
        option::destroy_none(change_opt);
    }

    /// Getter for reading PLATFORM_WALLET on-chain if needed
    public fun platform_wallet(): address { PLATFORM_WALLET }
    public fun payment_amount(): u64 { PAYMENT_AMOUNT }
}