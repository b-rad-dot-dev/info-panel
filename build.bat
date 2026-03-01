@echo off
del src\dist\config.json
rmdir /s /q src\dist\modules
docker build . -t info-panel:latest