param(
  [Parameter(Mandatory = $true)][string]$EnhancedImage,
  [string]$OriginalImage = "$PSScriptRoot/../public/images/peso-organizational-structure.png",
  [string]$OutputImage = "$PSScriptRoot/../public/images/peso-organizational-structure-clear-portraits.png"
)

# Post-process the imagegen result: keep every original label, logo and layout pixel.
# Only the interiors of the eight existing portrait frames are composited.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$original = [System.Drawing.Bitmap]::new((Resolve-Path -LiteralPath $OriginalImage).Path)
$enhanced = [System.Drawing.Bitmap]::new((Resolve-Path -LiteralPath $EnhancedImage).Path)
$output = $original.Clone()
$graphics = [System.Drawing.Graphics]::FromImage($output)
try {
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $portraits = @(
    @(970, 255, 285, 343), @(1885, 255, 268, 343),
    @(449, 918, 225, 250), @(798, 918, 224, 250),
    @(1144, 918, 224, 250), @(1523, 918, 224, 250),
    @(1884, 918, 225, 250), @(2224, 918, 226, 250)
  )
  foreach ($portrait in $portraits) {
    $target = [System.Drawing.RectangleF]::new($portrait[0], $portrait[1], $portrait[2], $portrait[3])
    $source = [System.Drawing.RectangleF]::new(
      [single]($portrait[0] * $enhanced.Width / $original.Width),
      [single]($portrait[1] * $enhanced.Height / $original.Height),
      [single]($portrait[2] * $enhanced.Width / $original.Width),
      [single]($portrait[3] * $enhanced.Height / $original.Height)
    )
    $graphics.DrawImage($enhanced, $target, $source, [System.Drawing.GraphicsUnit]::Pixel)
  }
  $graphics.Dispose()
  $graphics = $null
  $output.Save([System.IO.Path]::GetFullPath($OutputImage), [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output "Saved portrait-only composite: $OutputImage ($($output.Width)x$($output.Height))"
} finally {
  if ($graphics) { $graphics.Dispose() }
  $output.Dispose()
  $enhanced.Dispose()
  $original.Dispose()
}
