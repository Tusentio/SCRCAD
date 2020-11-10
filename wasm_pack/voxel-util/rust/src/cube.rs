use crate::point::*;

pub type Shape = Vec<Point<u8>>;

static FACES: [[Point<u8>; 6]; 6] = [
    [
        point!(1, 1, 1),
        point!(1, 0, 1),
        point!(0, 0, 1),
        point!(1, 1, 1),
        point!(0, 0, 1),
        point!(0, 1, 1),
    ],
    [
        point!(0, 1, 0),
        point!(0, 0, 0),
        point!(1, 0, 0),
        point!(0, 1, 0),
        point!(1, 0, 0),
        point!(1, 1, 0),
    ],
    [
        point!(1, 1, 0),
        point!(1, 1, 1),
        point!(0, 1, 1),
        point!(1, 1, 0),
        point!(0, 1, 1),
        point!(0, 1, 0),
    ],
    [
        point!(0, 0, 0),
        point!(0, 0, 1),
        point!(1, 0, 1),
        point!(0, 0, 0),
        point!(1, 0, 1),
        point!(1, 0, 0),
    ],
    [
        point!(1, 1, 0),
        point!(1, 0, 0),
        point!(1, 0, 1),
        point!(1, 1, 0),
        point!(1, 0, 1),
        point!(1, 1, 1),
    ],
    [
        point!(0, 1, 1),
        point!(0, 0, 1),
        point!(0, 0, 0),
        point!(0, 1, 1),
        point!(0, 0, 0),
        point!(0, 1, 0),
    ],
];

pub static NEIGHBOR_OFFSETS: [Point<i8>; 6] = [
    point!(0, 0, 1),
    point!(0, 0, -1),
    point!(0, 1, 0),
    point!(0, -1, 0),
    point!(1, 0, 0),
    point!(-1, 0, 0),
];

pub fn get_shapes() -> Vec<Shape> {
    let mut shapes: Vec<Shape> = Vec::new();

    for i in 0..64 {
        let mut shape = Vec::new();

        for face_index in 0..6 {
            if (i >> face_index) & 0b1 == 0 {
                FACES[face_index]
                    .iter()
                    .for_each(|vertex| shape.push(*vertex));
            }
        }

        shapes.push(shape);
    }

    shapes
}
