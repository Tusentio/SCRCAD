use crate::cube;
use crate::point::*;

use serde::*;

#[derive(Debug, Clone, Serialize)]
pub struct VertexGroup {
    start: usize,
    count: usize,
    material_index: usize,
}

impl VertexGroup {
    fn zeroed() -> VertexGroup {
        VertexGroup {
            start: 0,
            count: 0,
            material_index: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct Mesh {
    vertices: Vec<Point<u32>>,
    vertex_groups: Vec<VertexGroup>,
}

#[derive(Debug, Clone)]
pub struct Meshifier {
    shapes: Vec<cube::Shape>,
}

impl Meshifier {
    pub fn new() -> Self {
        Meshifier {
            shapes: cube::get_shapes(),
        }
    }

    pub fn meshify(&self, voxels: &Vec<usize>, palette: &Vec<u32>, size: &Point<usize>) -> Mesh {
        let mut indexed_voxels: Vec<(usize, usize)> = voxels
            .iter()
            .map(|&color_index| color_index)
            .enumerate()
            .collect();
        indexed_voxels.sort_unstable_by_key(|indexed_voxel| indexed_voxel.1);

        let mut vertices: Vec<Point<u32>> = Vec::new();
        let mut vertex_groups: Vec<VertexGroup> = Vec::new();

        {
            let mut last_vertex_group = VertexGroup::zeroed();

            for (position_index, color_index) in indexed_voxels {
                let position = Point::from_index(position_index, &size);

                let color = palette[color_index];
                let alpha = color & 0xff;
                if alpha == 0 {
                    continue;
                }

                if last_vertex_group.material_index != color_index {
                    if last_vertex_group.count > 0 {
                        vertex_groups.push(last_vertex_group);
                    }

                    last_vertex_group = VertexGroup {
                        start: vertices.len(),
                        count: 0,
                        material_index: color_index,
                    };
                }

                let shape_index = {
                    let mut shape_index = 0;

                    for (side_index, neighbor_offset) in cube::NEIGHBOR_OFFSETS.iter().enumerate() {
                        let neighbor_position = point!(
                            (position.x as i64 + neighbor_offset.x as i64) as usize,
                            (position.y as i64 + neighbor_offset.y as i64) as usize,
                            (position.z as i64 + neighbor_offset.z as i64) as usize
                        );

                        let neighbor_position_index = if neighbor_position.in_bounds(&size) {
                            neighbor_position.to_index(&size)
                        } else {
                            continue;
                        };

                        let neighbor_color_index = voxels[neighbor_position_index];
                        let neighbor_color = palette[neighbor_color_index];
                        let neighbor_alpha = neighbor_color & 0xff;

                        let side_occluded = neighbor_alpha >= alpha;
                        shape_index |= (side_occluded as usize) << side_index;
                    }

                    shape_index
                };

                let shape = &self.shapes[shape_index];
                for vertex in shape {
                    let offset_vertex = point!(
                        vertex.x as u32 + position.x as u32,
                        vertex.y as u32 + position.y as u32,
                        vertex.z as u32 + position.z as u32
                    );

                    vertices.push(offset_vertex);
                }

                last_vertex_group.count += shape.len();
            }

            if last_vertex_group.count > 0 {
                vertex_groups.push(last_vertex_group);
            }

            Mesh {
                vertices,
                vertex_groups,
            }
        }
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn meshify() {
        let meshifier = super::Meshifier::new();

        let mesh = meshifier.meshify(
            &vec![0, 1, 2, 3, 4, 0, 1, 2, 3],
            &vec![0x00000000, 0x000000ff, 0x111111ff, 0x222222ff, 0x333333ff],
            &point!(1, 3, 3),
        );

        println!("{:?}", mesh);
    }
}
