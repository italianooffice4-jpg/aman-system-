# WIA scanner script (ASCII only on purpose: Windows PowerShell 5 misreads UTF-8 without BOM).
# Modes: list  -> prints JSON array of scanners
#        scan  -> scans directly with no legacy dialog, saves JPEG pages into OutDir
param([string]$Mode = 'scan', [string]$Adf = '0', [string]$OutDir = '', [string]$DeviceId = '', [int]$Dpi = 200, [int]$Intent = 1)
$ErrorActionPreference = 'Stop'
$enc = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = $enc
$JPEG = '{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}'

function Get-Scanners {
  $dm = New-Object -ComObject WIA.DeviceManager
  $r = @()
  foreach ($i in $dm.DeviceInfos) {
    if ($i.Type -eq 1) {
      $r += [pscustomobject]@{ id = [string]$i.DeviceID; name = [string]$i.Properties.Item('Name').Value }
    }
  }
  return ,$r
}

function Set-Prop($props, $id, $val) {
  foreach ($p in $props) {
    if ($p.PropertyID -eq $id) { try { $p.Value = $val } catch { } }
  }
}

function Save-Jpeg($img, $path) {
  if ($img.FormatID -ne $JPEG) {
    $ip = New-Object -ComObject WIA.ImageProcess
    $ip.Filters.Add($ip.FilterInfos.Item('Convert').FilterID)
    $ip.Filters.Item(1).Properties.Item('FormatID').Value = $JPEG
    $ip.Filters.Item(1).Properties.Item('Quality').Value = 90
    $img = $ip.Apply($img)
  }
  if (Test-Path $path) { Remove-Item $path -Force }
  $img.SaveFile($path)
}

try {
  if ($Mode -eq 'list') {
    $l = Get-Scanners
    if ($l.Count -eq 0) { Write-Output '[]' } else { Write-Output (ConvertTo-Json -InputObject @($l) -Compress) }
    exit 0
  }

  $info = $null
  $all = Get-Scanners
  if ($all.Count -eq 0) { throw 'NO_SCANNER' }
  $dm = New-Object -ComObject WIA.DeviceManager
  foreach ($i in $dm.DeviceInfos) {
    if ($i.Type -eq 1 -and ($DeviceId -eq '' -or $i.DeviceID -eq $DeviceId)) { $info = $i; break }
  }
  if (-not $info) { foreach ($i in $dm.DeviceInfos) { if ($i.Type -eq 1) { $info = $i; break } } }

  $direct = $true
  try {
    $dev = $info.Connect()
    $item = $dev.Items.Item(1)
    if ($Adf -eq '1') { Set-Prop $dev.Properties 3088 1 }
    Set-Prop $item.Properties 6146 $Intent
    Set-Prop $item.Properties 6147 $Dpi
    Set-Prop $item.Properties 6148 $Dpi
    Set-Prop $item.Properties 6149 0
    Set-Prop $item.Properties 6150 0
    if ($Adf -ne '1') {
      Set-Prop $item.Properties 6151 ([int](8.27 * $Dpi))
      Set-Prop $item.Properties 6152 ([int](11.69 * $Dpi))
    }
    $n = 0
    if ($Adf -eq '1') {
      while ($true) {
        try { $img = $item.Transfer($JPEG) } catch { break }
        if (-not $img) { break }
        $n++
        Save-Jpeg $img (Join-Path $OutDir ('page{0:D3}.jpg' -f $n))
      }
      if ($n -eq 0) { throw 'NO_PAPER_IN_FEEDER' }
    } else {
      $img = $item.Transfer($JPEG)
      Save-Jpeg $img (Join-Path $OutDir 'page001.jpg')
    }
  } catch {
    $m = $_.Exception.Message
    if ($m -match 'NO_PAPER_IN_FEEDER' -or $Adf -eq '1') { throw }
    $direct = $false
  }

  if (-not $direct) {
    # fallback: legacy scanner dialog (only if direct scanning is not supported by the driver)
    $dlg = New-Object -ComObject WIA.CommonDialog
    $img = $dlg.ShowAcquireImage(1, 1, 0, $JPEG, $false, $true, $false)
    if (-not $img) { Write-Output 'CANCEL'; exit 0 }
    Save-Jpeg $img (Join-Path $OutDir 'page001.jpg')
  }
} catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 1
}
