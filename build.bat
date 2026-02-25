@echo off
del src\dist\config.json
docker build . -t info-panel:latest