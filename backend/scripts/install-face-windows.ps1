# Install face recognition dependencies on Windows (including Python 3.14).
# Run from backend folder:
#   .\scripts\install-face-windows.ps1

$ErrorActionPreference = "Stop"
$BackendRoot = Split-Path $PSScriptRoot -Parent
Set-Location $BackendRoot

$Python = Join-Path $BackendRoot "venv\Scripts\python.exe"
$Pip = Join-Path $BackendRoot "venv\Scripts\pip.exe"

if (-not (Test-Path $Python)) {
    Write-Error "Virtual environment not found. Create it first: python -m venv venv"
}

$pyVersion = & $Python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
$pyTag = & $Python -c "import sys; print(f'cp{sys.version_info.major}{sys.version_info.minor}')"
Write-Host "Python version: $pyVersion ($pyTag)"

$WheelsDir = Join-Path $BackendRoot "wheels"
New-Item -ItemType Directory -Force -Path $WheelsDir | Out-Null

Write-Host "Installing opencv-python and setuptools..."
& $Pip install "opencv-python>=4.9.0" "setuptools<82"

$DlibWheel = Join-Path $WheelsDir "dlib-20.0.99-$pyTag-$pyTag-win_amd64.whl"
if (-not (Test-Path $DlibWheel)) {
    $DlibUrl = "https://github.com/z-mahmud22/Dlib_Windows_Python3.x/raw/main/dlib-20.0.99-$pyTag-$pyTag-win_amd64.whl"
    Write-Host "Downloading prebuilt dlib wheel..."
    Write-Host $DlibUrl
    try {
        Invoke-WebRequest -Uri $DlibUrl -OutFile $DlibWheel -UseBasicParsing -TimeoutSec 300
    } catch {
        Write-Error @"
Could not download a prebuilt dlib wheel for Python $pyVersion.
Options:
  1) Use Python 3.11 or 3.12 (recommended for easiest setup)
  2) Install Visual Studio C++ Build Tools and CMake, then: pip install dlib
  3) Find a compatible .whl manually from:
     https://github.com/z-mahmud22/Dlib_Windows_Python3.x
"@
    }
}

if ((Get-Item $DlibWheel).Length -lt 1000000) {
    Write-Error "Downloaded dlib wheel looks invalid (file too small). Delete $DlibWheel and retry."
}

Write-Host "Installing dlib from wheel..."
& $Pip install $DlibWheel

Write-Host "Installing face-recognition packages..."
& $Pip install "face-recognition>=1.3.0" "face-recognition-models>=0.3.0"

Write-Host "Verifying installation..."
& $Python -c @"
from app.services.face_service import FACE_LIBS_AVAILABLE
import face_recognition
import dlib
import cv2
assert FACE_LIBS_AVAILABLE, 'FACE_LIBS_AVAILABLE is False'
print('face_recognition: OK')
print('dlib:', dlib.__version__)
print('opencv:', cv2.__version__)
print('Live face recognition is ready.')
"@

Write-Host ""
Write-Host "Done. Restart the Flask server: python run.py"
