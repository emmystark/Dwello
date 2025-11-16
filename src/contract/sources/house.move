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
    bathroom: u8
}

public struct CaretakerCap has key {
    id: UID,
}

fun init(ctx: &mut TxContext) {
    transfer::transfer(CaretakerCap{id: object::new(ctx)}, ctx.sender())
}

