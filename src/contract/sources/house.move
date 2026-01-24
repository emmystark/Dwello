module rental_marketplace::house;
use sui::event;
use std::string::{Self, String};
use std::vector;

public struct House has key {
    id: UID,
    name: String,
    house_address: String,
    caretaker: address,
    country: String,
    state: String,
    region: String,
    pricing: u64,
    bedroom: u8,
    bathroom: u8,
    total_views: u64,
    // Walrus storage for images and metadata
    walrus_blob_ids: vector<String>,
    // Unique identifier for quick lookups
    created_at: u64,
    // Property metadata stored on-chain
    property_type: String,
    area_sqft: u64,
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
    pricing: u64,
    bedroom: u8,
    bathroom: u8,
    property_type: String,
    area_sqft: u64,
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
        walrus_blob_ids: vector::empty(),
        created_at: ctx.epoch(),
        property_type,
        area_sqft,
    };

    event::emit(HouseCreatedEvent {
        house_id: object::id(&house),
        name,
        house_address,
        caretaker,
    });

    transfer::share_object(house);
}

public fun increment_views(house: &mut House) {
    house.total_views = house.total_views + 1;
}

public fun get_caretaker(house: &House): address {
    house.caretaker
}

public entry fun add_walrus_blob(
    _: &CaretakerCap,
    house: &mut House,
    blob_id: String,
    _ctx: &mut TxContext
) {
    vector::push_back(&mut house.walrus_blob_ids, blob_id);
}

public fun get_walrus_blobs(house: &House): &vector<String> {
    &house.walrus_blob_ids
}

public fun get_house_price(house: &House): u64 {
    house.pricing
}

public entry fun addCaretaker(_: &CaretakerCap, caretaker: address, ctx: &mut TxContext) {
    transfer::transfer(
        CaretakerCap {
            id: object::new(ctx)
        },
        caretaker
    )
}


