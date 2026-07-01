use std::fs;
use std::io;
use std::path::Path;

const ICON_SIZES: [usize; 4] = [32, 64, 128, 256];
const PNG_ICON_SIZES: [usize; 3] = [32, 128, 256];
const ICNS_ICON_SIZES: [(usize, &[u8]); 6] = [
    (16, b"icp4"),
    (32, b"icp5"),
    (64, b"icp6"),
    (128, b"ic07"),
    (256, b"ic08"),
    (512, b"ic09"),
];
const BITMAP_INFO_HEADER_SIZE: u32 = 40;
const ICO_HEADER_SIZE: u32 = 6;
const ICO_DIRECTORY_ENTRY_SIZE: u32 = 16;
const SAMPLE_GRID_SIZE: usize = 3;

type Color = [f32; 4];

fn push_u16(buffer: &mut Vec<u8>, value: u16) {
    buffer.extend_from_slice(&value.to_le_bytes());
}

fn push_u32(buffer: &mut Vec<u8>, value: u32) {
    buffer.extend_from_slice(&value.to_le_bytes());
}

fn push_i32(buffer: &mut Vec<u8>, value: i32) {
    buffer.extend_from_slice(&value.to_le_bytes());
}

fn push_be_u32(buffer: &mut Vec<u8>, value: u32) {
    buffer.extend_from_slice(&value.to_be_bytes());
}

fn clamp01(value: f32) -> f32 {
    value.clamp(0.0, 1.0)
}

fn smooth_alpha(distance: f32, half_width: f32, edge: f32) -> f32 {
    clamp01((half_width + edge - distance) / (edge * 2.0))
}

fn blend_pixel(base: Color, overlay: Color, alpha: f32) -> Color {
    let source_alpha = clamp01(alpha * overlay[3]);
    let inverse_alpha = 1.0 - source_alpha;

    [
        overlay[0] * source_alpha + base[0] * inverse_alpha,
        overlay[1] * source_alpha + base[1] * inverse_alpha,
        overlay[2] * source_alpha + base[2] * inverse_alpha,
        source_alpha + base[3] * inverse_alpha,
    ]
}

fn lerp(a: f32, b: f32, position: f32) -> f32 {
    a + (b - a) * clamp01(position)
}

fn gradient_color(x: f32, y: f32) -> Color {
    let position = clamp01((x * 0.62) + (y * 0.38));
    let mid = 0.5;

    if position < mid {
        let local = position / mid;
        [lerp(0.055, 0.149, local), lerp(0.647, 0.486, local), 1.0, 1.0]
    } else {
        let local = (position - mid) / (1.0 - mid);
        [lerp(0.149, 0.541, local), lerp(0.486, 0.176, local), lerp(1.0, 1.0, local), 1.0]
    }
}

fn dot(a: (f32, f32), b: (f32, f32)) -> f32 {
    a.0 * b.0 + a.1 * b.1
}

fn distance_to_segment(point: (f32, f32), start: (f32, f32), end: (f32, f32)) -> f32 {
    let segment = (end.0 - start.0, end.1 - start.1);
    let length_squared = dot(segment, segment);

    if length_squared <= f32::EPSILON {
        return ((point.0 - start.0).powi(2) + (point.1 - start.1).powi(2)).sqrt();
    }

    let position = clamp01(dot((point.0 - start.0, point.1 - start.1), segment) / length_squared);
    let closest = (start.0 + segment.0 * position, start.1 + segment.1 * position);

    ((point.0 - closest.0).powi(2) + (point.1 - closest.1).powi(2)).sqrt()
}

fn cubic_bezier(position: f32, start: (f32, f32), control_a: (f32, f32), control_b: (f32, f32), end: (f32, f32)) -> (f32, f32) {
    let inverse = 1.0 - position;
    let inverse_squared = inverse * inverse;
    let position_squared = position * position;

    (
        inverse_squared * inverse * start.0 + 3.0 * inverse_squared * position * control_a.0 + 3.0 * inverse * position_squared * control_b.0 + position_squared * position * end.0,
        inverse_squared * inverse * start.1 + 3.0 * inverse_squared * position * control_a.1 + 3.0 * inverse * position_squared * control_b.1 + position_squared * position * end.1,
    )
}

fn add_cubic(points: &mut Vec<(f32, f32)>, start: (f32, f32), control_a: (f32, f32), control_b: (f32, f32), end: (f32, f32)) {
    for step in 1..=26 {
        points.push(cubic_bezier(step as f32 / 26.0, start, control_a, control_b, end));
    }
}

fn sivflow_mark_points() -> Vec<(f32, f32)> {
    let mut points = vec![(319.0 / 512.0, 174.0 / 512.0)];

    add_cubic(&mut points, (319.0 / 512.0, 174.0 / 512.0), (283.0 / 512.0, 168.0 / 512.0), (222.0 / 512.0, 169.0 / 512.0), (191.0 / 512.0, 198.0 / 512.0));
    add_cubic(&mut points, (191.0 / 512.0, 198.0 / 512.0), (164.0 / 512.0, 223.0 / 512.0), (171.0 / 512.0, 258.0 / 512.0), (225.0 / 512.0, 263.0 / 512.0));
    add_cubic(&mut points, (225.0 / 512.0, 263.0 / 512.0), (281.0 / 512.0, 268.0 / 512.0), (331.0 / 512.0, 263.0 / 512.0), (324.0 / 512.0, 305.0 / 512.0));
    add_cubic(&mut points, (324.0 / 512.0, 305.0 / 512.0), (316.0 / 512.0, 354.0 / 512.0), (237.0 / 512.0, 356.0 / 512.0), (181.0 / 512.0, 342.0 / 512.0));

    points
}

fn rounded_rect_alpha(x: f32, y: f32, left: f32, top: f32, width: f32, height: f32, radius: f32, edge: f32) -> f32 {
    let center_x = left + width / 2.0;
    let center_y = top + height / 2.0;
    let qx = (x - center_x).abs() - (width / 2.0 - radius);
    let qy = (y - center_y).abs() - (height / 2.0 - radius);
    let outside_x = qx.max(0.0);
    let outside_y = qy.max(0.0);
    let outside = (outside_x.powi(2) + outside_y.powi(2)).sqrt();
    let inside = qx.max(qy).min(0.0);
    let signed_distance = outside + inside - radius;

    clamp01((-signed_distance + edge) / (edge * 2.0))
}

fn polyline_alpha(point: (f32, f32), points: &[(f32, f32)], stroke_width: f32, edge: f32) -> f32 {
    let mut min_distance = f32::MAX;

    for segment in points.windows(2) {
        min_distance = min_distance.min(distance_to_segment(point, segment[0], segment[1]));
    }

    smooth_alpha(min_distance, stroke_width / 2.0, edge)
}

fn polygon_contains(point: (f32, f32), polygon: &[(f32, f32)]) -> bool {
    let mut inside = false;
    let mut previous = polygon.len() - 1;

    for current in 0..polygon.len() {
        let current_point = polygon[current];
        let previous_point = polygon[previous];
        let intersects = ((current_point.1 > point.1) != (previous_point.1 > point.1)) && (point.0 < (previous_point.0 - current_point.0) * (point.1 - current_point.1) / (previous_point.1 - current_point.1) + current_point.0);

        if intersects {
            inside = !inside;
        }

        previous = current;
    }

    inside
}

fn polygon_alpha(point: (f32, f32), polygon: &[(f32, f32)], edge: f32) -> f32 {
    let mut min_distance = f32::MAX;

    for index in 0..polygon.len() {
        let next = (index + 1) % polygon.len();
        min_distance = min_distance.min(distance_to_segment(point, polygon[index], polygon[next]));
    }

    if polygon_contains(point, polygon) {
        clamp01(0.5 + min_distance / edge)
    } else {
        clamp01(0.5 - min_distance / edge)
    }
}

fn sample_icon_color(x: f32, y: f32, mark_points: &[(f32, f32)]) -> Color {
    let mut color = [1.0, 1.0, 1.0, 1.0];
    let tile_shadow_alpha = rounded_rect_alpha(x, y, 0.11, 0.125, 0.79, 0.79, 0.17, 0.012) * 0.16;
    color = blend_pixel(color, [0.059, 0.09, 0.165, 1.0], tile_shadow_alpha);

    let tile_alpha = rounded_rect_alpha(x, y, 0.105, 0.11, 0.79, 0.79, 0.16, 0.01);
    color = blend_pixel(color, [1.0, 1.0, 1.0, 1.0], tile_alpha);

    let bracket_width = 0.018;
    let bracket_edge = 0.006;
    let top_left = [(0.258, 0.412), (0.258, 0.301), (0.309, 0.25), (0.416, 0.25)];
    let top_right = [(0.584, 0.25), (0.691, 0.25), (0.742, 0.301), (0.742, 0.412)];
    let bottom_left = [(0.258, 0.588), (0.258, 0.699), (0.309, 0.75), (0.416, 0.75)];
    let bottom_right = [(0.584, 0.75), (0.691, 0.75), (0.742, 0.699), (0.742, 0.588)];

    for bracket in [top_left, top_right, bottom_left, bottom_right] {
        let alpha = polyline_alpha((x, y), &bracket, bracket_width, bracket_edge);
        color = blend_pixel(color, gradient_color(x, y), alpha);
    }

    let mark_alpha = polyline_alpha((x, y), mark_points, 0.122, 0.012);
    color = blend_pixel(color, gradient_color(x, y), mark_alpha);

    let pencil = [(0.307, 0.703), (0.387, 0.621), (0.426, 0.688), (0.342, 0.725)];
    let pencil_alpha = polygon_alpha((x, y), &pencil, 0.008);
    color = blend_pixel(color, [0.067, 0.102, 0.227, 1.0], pencil_alpha);

    let shine = [(0.386, 0.621), (0.447, 0.674)];
    let shine_alpha = polyline_alpha((x, y), &shine, 0.02, 0.006);
    blend_pixel(color, [1.0, 1.0, 1.0, 1.0], shine_alpha)
}

fn render_icon(size: usize) -> Vec<u8> {
    let mut pixels = Vec::with_capacity(size * size * 4);
    let mark_points = sivflow_mark_points();

    for y in 0..size {
        for x in 0..size {
            let mut accumulated = [0.0, 0.0, 0.0, 0.0];

            for sample_y in 0..SAMPLE_GRID_SIZE {
                for sample_x in 0..SAMPLE_GRID_SIZE {
                    let px = (x as f32 + (sample_x as f32 + 0.5) / SAMPLE_GRID_SIZE as f32) / size as f32;
                    let py = (y as f32 + (sample_y as f32 + 0.5) / SAMPLE_GRID_SIZE as f32) / size as f32;
                    let color = sample_icon_color(px, py, &mark_points);

                    for channel in 0..4 {
                        accumulated[channel] += color[channel];
                    }
                }
            }

            let sample_count = (SAMPLE_GRID_SIZE * SAMPLE_GRID_SIZE) as f32;
            pixels.push((clamp01(accumulated[0] / sample_count) * 255.0).round() as u8);
            pixels.push((clamp01(accumulated[1] / sample_count) * 255.0).round() as u8);
            pixels.push((clamp01(accumulated[2] / sample_count) * 255.0).round() as u8);
            pixels.push((clamp01(accumulated[3] / sample_count) * 255.0).round() as u8);
        }
    }

    pixels
}

fn create_bitmap_icon_image(size: usize, pixels: &[u8]) -> Vec<u8> {
    let xor_bitmap_bytes = size * size * 4;
    let and_mask_stride = ((size + 31) / 32) * 4;
    let and_mask_bytes = and_mask_stride * size;
    let image_bytes = BITMAP_INFO_HEADER_SIZE as usize + xor_bitmap_bytes + and_mask_bytes;
    let mut buffer = Vec::with_capacity(image_bytes);

    push_u32(&mut buffer, BITMAP_INFO_HEADER_SIZE);
    push_i32(&mut buffer, size as i32);
    push_i32(&mut buffer, (size * 2) as i32);
    push_u16(&mut buffer, 1);
    push_u16(&mut buffer, 32);
    push_u32(&mut buffer, 0);
    push_u32(&mut buffer, xor_bitmap_bytes as u32);
    push_i32(&mut buffer, 0);
    push_i32(&mut buffer, 0);
    push_u32(&mut buffer, 0);
    push_u32(&mut buffer, 0);

    for y in (0..size).rev() {
        for x in 0..size {
            let pixel_index = (y * size + x) * 4;
            buffer.extend_from_slice(&[pixels[pixel_index + 2], pixels[pixel_index + 1], pixels[pixel_index], pixels[pixel_index + 3]]);
        }
    }

    buffer.extend(std::iter::repeat(0).take(and_mask_bytes));
    buffer
}

fn generate_ico_bytes() -> Vec<u8> {
    let images: Vec<(usize, Vec<u8>)> = ICON_SIZES.iter().map(|size| {
        let pixels = render_icon(*size);
        (*size, create_bitmap_icon_image(*size, &pixels))
    }).collect();

    let image_offset = ICO_HEADER_SIZE + ICO_DIRECTORY_ENTRY_SIZE * images.len() as u32;
    let mut running_offset = image_offset;
    let mut buffer = Vec::new();

    push_u16(&mut buffer, 0);
    push_u16(&mut buffer, 1);
    push_u16(&mut buffer, images.len() as u16);

    for (size, image) in &images {
        buffer.push(if *size == 256 { 0 } else { *size as u8 });
        buffer.push(if *size == 256 { 0 } else { *size as u8 });
        buffer.push(0);
        buffer.push(0);
        push_u16(&mut buffer, 1);
        push_u16(&mut buffer, 32);
        push_u32(&mut buffer, image.len() as u32);
        push_u32(&mut buffer, running_offset);
        running_offset += image.len() as u32;
    }

    for (_, image) in images {
        buffer.extend_from_slice(&image);
    }

    buffer
}

fn adler32(bytes: &[u8]) -> u32 {
    const MOD_ADLER: u32 = 65_521;
    let mut a = 1_u32;
    let mut b = 0_u32;

    for byte in bytes {
        a = (a + *byte as u32) % MOD_ADLER;
        b = (b + a) % MOD_ADLER;
    }

    (b << 16) | a
}

fn crc32(bytes: &[u8]) -> u32 {
    let mut crc = 0xffff_ffff_u32;

    for byte in bytes {
        crc ^= *byte as u32;
        for _ in 0..8 {
            let mask = (crc & 1).wrapping_neg();
            crc = (crc >> 1) ^ (0xedb8_8320 & mask);
        }
    }

    !crc
}

fn push_png_chunk(buffer: &mut Vec<u8>, name: &[u8; 4], payload: &[u8]) {
    push_be_u32(buffer, payload.len() as u32);
    buffer.extend_from_slice(name);
    buffer.extend_from_slice(payload);

    let mut crc_payload = Vec::with_capacity(name.len() + payload.len());
    crc_payload.extend_from_slice(name);
    crc_payload.extend_from_slice(payload);
    push_be_u32(buffer, crc32(&crc_payload));
}

fn create_zlib_stored_stream(payload: &[u8]) -> Vec<u8> {
    let mut buffer = vec![0x78, 0x01];
    let mut offset = 0;

    while offset < payload.len() {
        let remaining = payload.len() - offset;
        let block_length = remaining.min(65_535);
        let is_last = offset + block_length == payload.len();

        buffer.push(if is_last { 0x01 } else { 0x00 });
        push_u16(&mut buffer, block_length as u16);
        push_u16(&mut buffer, !(block_length as u16));
        buffer.extend_from_slice(&payload[offset..offset + block_length]);
        offset += block_length;
    }

    push_be_u32(&mut buffer, adler32(payload));
    buffer
}

fn generate_png_bytes(size: usize) -> Vec<u8> {
    let pixels = render_icon(size);
    let mut filtered_rows = Vec::with_capacity((size * 4 + 1) * size);

    for y in 0..size {
        filtered_rows.push(0);
        let start = y * size * 4;
        filtered_rows.extend_from_slice(&pixels[start..start + size * 4]);
    }

    let mut buffer = Vec::new();
    buffer.extend_from_slice(b"\x89PNG\r\n\x1a\n");

    let mut ihdr = Vec::with_capacity(13);
    push_be_u32(&mut ihdr, size as u32);
    push_be_u32(&mut ihdr, size as u32);
    ihdr.extend_from_slice(&[8, 6, 0, 0, 0]);
    push_png_chunk(&mut buffer, b"IHDR", &ihdr);
    push_png_chunk(&mut buffer, b"IDAT", &create_zlib_stored_stream(&filtered_rows));
    push_png_chunk(&mut buffer, b"IEND", &[]);

    buffer
}

fn generate_icns_bytes() -> Vec<u8> {
    let mut entries = Vec::new();
    let mut total_length = 8_u32;

    for (size, kind) in ICNS_ICON_SIZES {
        let image = generate_png_bytes(size);
        total_length += 8 + image.len() as u32;
        entries.push((kind, image));
    }

    let mut buffer = Vec::new();
    buffer.extend_from_slice(b"icns");
    push_be_u32(&mut buffer, total_length);

    for (kind, image) in entries {
        buffer.extend_from_slice(kind);
        push_be_u32(&mut buffer, image.len() as u32 + 8);
        buffer.extend_from_slice(&image);
    }

    buffer
}

fn write_file_if_changed(path: &Path, content: &[u8]) -> io::Result<()> {
    if fs::read(path).map(|current| current == content).unwrap_or(false) {
        return Ok(());
    }

    fs::write(path, content)
}

fn ensure_desktop_icons() -> io::Result<()> {
    let icon_dir = Path::new("icons");
    fs::create_dir_all(icon_dir)?;
    write_file_if_changed(&icon_dir.join("icon.ico"), &generate_ico_bytes())?;
    write_file_if_changed(&icon_dir.join("icon.icns"), &generate_icns_bytes())?;

    for size in PNG_ICON_SIZES {
        let filename = match size {
            32 => "32x32.png",
            128 => "128x128.png",
            256 => "128x128@2x.png",
            _ => unreachable!(),
        };
        write_file_if_changed(&icon_dir.join(filename), &generate_png_bytes(size))?;
    }

    Ok(())
}

fn main() {
    ensure_desktop_icons().expect("failed to generate Tauri desktop icons");
    tauri_build::build();
}
