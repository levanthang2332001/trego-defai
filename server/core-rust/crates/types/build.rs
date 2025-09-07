use std::path::Path;

fn main() -> Result<(), Box<dyn std::error::Error>> {
  let proto_files = ["../../proto/core.proto", "../../proto/candles.proto"];

  for file in &proto_files {
    if !Path::new(file).exists() {
      panic!("Proto file not found: {}", file);
    }
    println!("cargo:rerun-if-changed={}", file);
  }

  tonic_build::configure()
    .build_server(true)
    .build_client(true)
    .compile(&proto_files, &["../../proto"])?;

  Ok(())
}
