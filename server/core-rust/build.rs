use std::path::Path;

fn main() -> Result<(), Box<dyn std::error::Error>> {
  let proto_file = "../proto/core.proto";

  if !Path::new(proto_file).exists() {
    panic!("Proto file not found: {}", proto_file);
  }

  println!("cargo:rerun-if-changed={}", proto_file);

  std::env::set_var(
    "PROTOC",
    "C:/Program Files/protoc-32.0-win64/bin/protoc.exe",
  );
  let out_dir = std::env::var("OUT_DIR").unwrap();
  tonic_build::configure()
    .build_server(true)
    .build_client(true)
    .file_descriptor_set_path("src/generated/descriptor.bin")
    .compile(&[proto_file], &["../proto"])?;

  Ok(())
}
