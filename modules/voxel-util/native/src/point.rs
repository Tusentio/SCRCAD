#[macro_export]
macro_rules! point {
    ( $x:expr, $y:expr, $z:expr ) => {
        crate::point::Point {
            x: $x,
            y: $y,
            z: $z,
        }
    };
}

pub type Size = Point<usize>;

#[derive(Debug, Copy, Clone)]
pub struct Point<T>
where
    T: Copy,
{
    pub x: T,
    pub y: T,
    pub z: T,
}

impl Point<usize> {
    pub fn in_bounds(&self, size: &Size) -> bool {
        self.x < size.x && self.y < size.y && self.z < size.z
    }

    pub fn from_index(i: usize, size: &Size) -> Self {
        point!(i / size.z / size.y, i / size.z % size.y, i % size.z)
    }

    pub fn to_index(&self, size: &Size) -> usize {
        self.x * size.z * size.y + self.y * size.z + self.z
    }
}
