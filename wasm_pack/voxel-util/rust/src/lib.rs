#[macro_use]
mod point;
mod cube;
mod meshify;

use wasm_bindgen::prelude::*;

static mut MESHIFIER: Option<meshify::Meshifier> = None;

#[wasm_bindgen]
pub fn meshify(
    voxels: Vec<usize>,
    palette: Vec<u32>,
    width: usize,
    height: usize,
    depth: usize,
) -> JsValue {
    let meshifier = unsafe {
        match &MESHIFIER {
            Some(meshifier) => meshifier,
            None => {
                MESHIFIER = Some(meshify::Meshifier::new());
                MESHIFIER.as_ref().unwrap()
            }
        }
    };

    let size = meshifier.meshify(&voxels, &palette, &point!(width, height, depth));

    JsValue::from_serde(&size).unwrap()
}
