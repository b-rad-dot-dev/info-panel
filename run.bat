docker run --rm ^
  -v "%CD%/config.json:/app/config.json" ^
  -v "%CD%/modules/:/app/modules/" ^
  -p 3001:3000 ^
  info-panel:latest