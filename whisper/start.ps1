# Levanta el servidor de dictado local (solo escucha en 127.0.0.1).
# El backend le reenvía el audio en /dictado (ver WHISPER_URL en backend/.env).
param(
    [string]$Modelo = 'small-q5_1',
    [int]$Puerto = 8178,
    # Medido en un Ryzen 5 2400G: con todos los hilos lógicos rinde ~35 % más que con 4.
    [int]$Hilos = [Environment]::ProcessorCount,
    # Ventana de audio del modelo: 768 = 15 s (el máximo es 1500 = 30 s). Los tramos del
    # dictado duran como mucho 14 s, y achicarla reduce el tiempo a la mitad sin perder
    # calidad. No bajarla de 768: con 512 el modelo empieza a inventar texto.
    [int]$AudioCtx = 768
)

$exe = Get-ChildItem (Join-Path $PSScriptRoot 'bin') -Recurse -Filter whisper-server.exe -ErrorAction SilentlyContinue | Select-Object -First 1
$archivo = Join-Path $PSScriptRoot "models\ggml-$Modelo.bin"
if (-not $exe -or -not (Test-Path $archivo)) {
    Write-Host "Falta whisper.cpp o el modelo $Modelo. Corré primero: powershell -ExecutionPolicy Bypass -File whisper/setup.ps1 -Modelo $Modelo"
    exit 1
}

& $exe.FullName -m $archivo --host 127.0.0.1 --port $Puerto -l es -t $Hilos -ac $AudioCtx
