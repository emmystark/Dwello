module rental_marketplace::house;
use sui::event;
use std::string::{Self, String};

public struct House has key {
    id: UID,
    name: String,
    house_address: String,
    caretaker: address,
    country: String,
    state: String,
    region: String,
    pricing: u8,
    bedroom: u8,
    bathroom: u8,
    total_views: u64
}

public struct HouseCreatedEvent has copy, drop {
    house_id: ID,
    name: String,
    house_address: String,
    caretaker: address,
}

public struct CaretakerCap has key {
    id: UID,
}

fun init(ctx: &mut TxContext) {
    transfer::transfer(CaretakerCap{id: object::new(ctx)}, ctx.sender())
}

public entry fun create_house(
    _: &CaretakerCap,
    name: String,
    house_address: String,
    caretaker: address,
    country: String,
    state: String,
    region: String,
    pricing: u8,
    bedroom: u8,
    bathroom: u8,
    total_views: u64,
    ctx: &mut TxContext
) {
    let house = House {
        id: object::new(ctx),
        name,
        house_address,
        caretaker: ctx.sender(),
        country,
        state,
        region,
        pricing,
        bedroom,
        bathroom,
        total_views: 0,
    };

    event::emit(HouseCreatedEvent {
        house_id: object::id(&house),
        name,
        house_address,
        caretaker,
    });

    transfer::transfer(house, ctx.sender());
}

public fun increment_views(house: &mut House) {
        house.total_views = house.total_views + 1;
    }

public fun get_caretaker(house: &House): address {
        house.caretaker
    }
