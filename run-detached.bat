docker run --rm ^
  -d ^
  -v "./src/config.json:/app/config.json" ^
  -v "./src/modules/:/app/modules/" ^
  -e CONFIG_PATH="/app/config.json" ^
  --name info-panel ^
  -p 3000:3000 ^
  info-panel:latest