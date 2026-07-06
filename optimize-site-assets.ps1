$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Get-JpegCodec {
  [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq 'image/jpeg' } |
    Select-Object -First 1
}

function Save-OptimizedJpeg {
  param(
    [string]$SourceRelativePath,
    [string]$TargetRelativePath,
    [int]$MaxWidth,
    [int]$Quality = 82
  )

  $source = Join-Path $root $SourceRelativePath
  $target = Join-Path $root $TargetRelativePath
  $codec = Get-JpegCodec

  $image = [System.Drawing.Image]::FromFile($source)
  try {
    $scale = [Math]::Min(1.0, $MaxWidth / [double]$image.Width)
    $width = [Math]::Max(1, [int][Math]::Round($image.Width * $scale))
    $height = [Math]::Max(1, [int][Math]::Round($image.Height * $scale))

    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.Clear([System.Drawing.Color]::Black)
        $graphics.DrawImage($image, 0, 0, $width, $height)
      } finally {
        $graphics.Dispose()
      }

      $encoder = New-Object System.Drawing.Imaging.EncoderParameters(1)
      $encoder.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
      $bitmap.Save($target, $codec, $encoder)
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $image.Dispose()
  }
}

Save-OptimizedJpeg 'assets/section-home-bg.jpg' 'assets/section-home-bg-optimized.jpg' 1920 76
Save-OptimizedJpeg 'assets/section-ai-bg.jpg' 'assets/section-ai-bg-optimized.jpg' 1920 74
Save-OptimizedJpeg 'assets/section-ui-bg.jpg' 'assets/section-ui-bg-optimized.jpg' 1920 74
Save-OptimizedJpeg 'assets/section-package-bg.jpg' 'assets/section-package-bg-optimized.jpg' 1920 74
Save-OptimizedJpeg 'assets/section-product-bg.jpg' 'assets/section-product-bg-optimized.jpg' 1920 74
Save-OptimizedJpeg 'assets/profile-liuhai.png' 'assets/profile-liuhai-optimized.jpg' 1600 82
Save-OptimizedJpeg 'assets/section-profile-bg.png' 'assets/section-profile-bg-optimized.jpg' 1600 72
