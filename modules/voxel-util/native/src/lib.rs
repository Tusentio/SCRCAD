extern crate neon;

#[macro_use]
mod point;
mod cube;
mod meshify;

use neon::prelude::*;

static mut MESHIFIER: Option<meshify::Meshifier> = None;

fn meshify(mut cx: FunctionContext) -> JsResult<JsObject> {
    unsafe {
        if MESHIFIER.is_none() {
            MESHIFIER = Some(meshify::Meshifier::new())
        }
    }

    let voxels = match cx
        .argument::<JsArray>(0)?
        .to_vec(&mut cx)?
        .iter()
        .map(|handle| match handle.downcast::<JsNumber>() {
            Ok(number) => Ok(number.value() as usize),
            Err(err) => Err(err),
        })
        .try_fold(Vec::new(), |mut acc, res| match res {
            Ok(voxel) => {
                acc.push(voxel);
                Ok(acc)
            }
            Err(err) => Err(err),
        }) {
        Ok(voxels) => voxels,
        Err(err) => return cx.throw_error(format!("Argument `voxels` is invalid: {}", err)),
    };

    let palette = match cx
        .argument::<JsArray>(1)?
        .to_vec(&mut cx)?
        .iter()
        .map(|handle| match handle.downcast::<JsNumber>() {
            Ok(number) => Ok(number.value() as u32),
            Err(err) => Err(err),
        })
        .try_fold(Vec::new(), |mut acc, res| match res {
            Ok(voxel) => {
                acc.push(voxel);
                Ok(acc)
            }
            Err(err) => Err(err),
        }) {
        Ok(voxels) => voxels,
        Err(err) => return cx.throw_error(format!("Argument `palette` is invalid: {}", err)),
    };

    let size = point!(
        cx.argument::<JsNumber>(2)?.value() as usize,
        cx.argument::<JsNumber>(3)?.value() as usize,
        cx.argument::<JsNumber>(4)?.value() as usize
    );

    let mesh = unsafe {
        MESHIFIER
            .as_ref()
            .unwrap()
            .meshify(&voxels, &palette, &size)
    };
    mesh.to_js_object(&mut cx)
}

register_module!(mut cx, { cx.export_function("meshify", meshify) });
