use std::fs;
use std::io;
use std::path::Path;

const ICON_SIZE: usize = 32;
const ICON_IMAGE_OFFSET: u32 = 22;
const BITMAP_INFO_HEADER_SIZE: u32 = 40;

fn push_u16(buffer: &mut Vec<u8>, value: u16) {
    buffer.extend_from_slice(&value.to_le_bytes());
}

fn push_u32(buffer: &mut Vec<u8>, value: u32) {
    buffer.extend_from_slice(&value.to_le_bytes());
}

fn push_i32(buffer: &mut Vec<u8>, value: i32) {
    buffer.extend_from_slice(&value.to_le_bytes());
}

fn push_pixel(buffer: &mut Vec<u8>, red: u8, green: u8, blue: u8, alpha: u8) {
    buffer.extend_from_slice(&[blue, green, red, alpha]);
}

fn is_stroke_pixel(x: usize, y: usize) -> bool {
    let frame = x >= 8 && x <= 22 && y >= 8 && y <= 22;
    let inner = x >= 11 && x <= 19 && y >= 11 && y <= 19;
    let divider = x >= 13 && x <= 15 && y >= 8 && y <= 22;
    (frame && !inner) || divider
}

fn generate_icon_bytes() -> Vec<u8> {
    let xor_bitmap_bytes = ICON_SIZE * ICON_SIZE * 4;
    let and_mask_bytes = ICON_SIZE * 4;
    let image_bytes = BITMAP_INFO_HEADER_SIZE as usize + xor_bitmap_bytes + and_mask_bytes;
    let mut buffer = Vec::with_capacity(ICON_IMAGE_OFFSET as usize + image_bytes);

    push_u16(&mut buffer, 0);
    push_u16(&mut buffer, 1);
    push_u16(&mut buffer, 1);
    buffer.push(ICON_SIZE as u8);
    buffer.push(ICON_SIZE as u8);
    buffer.push(0);
    buffer.push(0);
    push_u16(&mut buffer, 1);
    push_u16(&mut buffer, 32);
    push_u32(&mut buffer, image_bytes as u32);
    push_u32(&mut buffer, ICON_IMAGE_OFFSET);

    push_u32(&mut buffer, BITMAP_INFO_HEADER_SIZE);
    push_i32(&mut buffer, ICON_SIZE as i32);
    push_i32(&mut buffer, (ICON_SIZE * 2) as i32);
    push_u16(&mut buffer, 1);
    push_u16(&mut buffer, 32);
    push_u32(&mut buffer, 0);
    push_u32(&mut buffer, xor_bitmap_bytes as u32);
    push_i32(&mut buffer, 0);
    push_i32(&mut buffer, 0);
    push_u32(&mut buffer, 0);
    push_u32(&mut buffer, 0);

    for y in (0..ICON_SIZE).rev() {
        for x in 0..ICON_SIZE {
            if is_stroke_pixel(x, y) {
                push_pixel(&mut buffer, 170, 179, 190, 255);
            } else {
                push_pixel(&mut buffer, 7, 16, 29, 255);
            }
        }
    }

    buffer.extend(std::iter::repeat_n(0, and_mask_bytes));
    buffer
}

fn ensure_windows_icon() -> io::Result<()> {
    let icon_path = Path::new("icons/icon.ico");
    if icon_path.exists() {
        return Ok(());
    }

    fs::create_dir_all("icons")?;
    fs::write(icon_path, generate_icon_bytes())
}

fn main() {
    ensure_windows_icon().expect("failed to generate Tauri Windows icon");
    tauri_build::build();
}
