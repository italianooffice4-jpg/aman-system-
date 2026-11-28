# WIA scanner script v2 (ASCII only on purpose: Windows PowerShell 5 misreads UTF-8 without BOM).
# Modes: list -> prints JSON array of scanners
#        scan -> scans directly (no legacy dialog), saves JPEG pages into OutDir
#        diag -> connects to the scanner, dumps device/item properties into the log, no scanning
param([string]$Mode = 'scan', [string]$Adf = '0', [string]$OutDir = '', [string]$DeviceId = '', [int]$Dpi = 200, [int]$Intent = 1, [string]$Legacy = '0', [string]$Log = '')
$ErrorActionPreference = 'Stop'
try { $enc = New-Object System.Text.UTF8Encoding $false; [Console]::OutputEncoding = $enc } catch { }
$JPEG = '{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}'

function Write-Log($m) { if ($Log -ne '') { try { Add-Content -Path $Log -Value ((Get-Date).ToString('o') + ' ps: ' + $m) } catch { } } }

# innermost exception HRESULT as 0x........ (COM errors are wrapped by PowerShell)
function Get-Hr($ex) {
  $e = $ex
  while ($e.InnerException) { $e = $e.InnerException }
  try { return ('0x{0:X8}' -f [int]$e.HResult) } catch { return '' }
}

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

function Get-PropByName($props, $name) {
  foreach ($p in $props) { if ($p.Name -eq $name) { return $p.Value } }
  return $null
}

function Set-Prop($props, $id, $val, $label) {
  $found = $false
  foreach ($p in $props) {
    if ($p.PropertyID -eq $id) {
      $found = $true
      try { $p.Value = $val; Write-Log ('set ' + $label + '=' + $val + ' now=' + $p.Value) }
      catch { Write-Log ('set ' + $label + ' FAILED: ' + $_.Exception.Message) }
    }
  }
  if (-not $found) { Write-Log ('prop ' + $label + ' (' + $id + ') not supported by driver') }
}

function Dump-Props($props, $tag) {
  foreach ($p in $props) {
    try { Write-Log ($tag + ' ' + $p.PropertyID + ' ' + $p.Name + '=' + $p.Value) } catch { }
  }
}

# Saves a WIA ImageFile as JPEG. JPEG straight from the driver is saved as is; any other
# format (BMP/PNG/...) is converted with System.Drawing (more reliable than the WIA Convert filter).
function Save-Jpeg($img, $path) {
  if (Test-Path $path) { Remove-Item $path -Force }
  $fid = ''
  try { $fid = [string]$img.FormatID } catch { }
  Write-Log ('page format=' + $fid)
  if ($fid -eq $JPEG) {
    try { $img.SaveFile($path) } catch { Write-Log ('SaveFile failed: ' + $_.Exception.Message) }
    if (-not ((Test-Path $path) -and ((Get-Item $path).Length -gt 0))) {
      [byte[]]$raw = $img.FileData.BinaryData
      [System.IO.File]::WriteAllBytes($path, $raw)
    }
  } else {
    Add-Type -AssemblyName System.Drawing
    [byte[]]$raw = $img.FileData.BinaryData
    $ms = New-Object System.IO.MemoryStream(,$raw)
    $bmp = [System.Drawing.Image]::FromStream($ms)
    try {
      $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
      $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
      $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]90)
      $bmp.Save($path, $codec, $ep)
    } finally { $bmp.Dispose(); $ms.Dispose() }
  }
  if (-not ((Test-Path $path) -and ((Get-Item $path).Length -gt 0))) { throw 'SAVE_FAILED' }
  Write-Log ('saved ' + $path + ' bytes=' + (Get-Item $path).Length)
}

# One page from the driver: JPEG first, then the driver default format.
function Get-Page($item) {
  try {
    $r = $item.Transfer($JPEG)
    if ($r) { return $r }
  } catch {
    $hr = Get-Hr $_.Exception
    Write-Log ('transfer(jpeg) failed hr=' + $hr + ' ' + $_.Exception.Message)
    # paper empty / jam / paper problem / cover open: retrying in another format is pointless
    if ($hr -eq '0x80210003' -or $hr -eq '0x80210002' -or $hr -eq '0x80210004' -or $hr -eq '0x80210016') { throw }
  }
  Write-Log 'transfer(default format)'
  return $item.Transfer()
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

  Write-Log ('scan begin mode=' + $Mode + ' adf=' + $Adf + ' legacy=' + $Legacy + ' dpi=' + $Dpi + ' ps=' + $PSVersionTable.PSVersion.ToString())
  $ok = $false
  if ($Legacy -ne '1' -or $Mode -eq 'diag') { try {
    $dev = $info.Connect()
    Write-Log ('connected, items=' + $dev.Items.Count)
    $item = $dev.Items.Item(1)
    Write-Log ('item1 name=' + $item.Name)
    Dump-Props $dev.Properties 'dev'
    Dump-Props $item.Properties 'item'
    if ($Mode -eq 'diag') { Write-Output 'DIAG_OK'; exit 0 }

    if ($Adf -eq '1') { Set-Prop $dev.Properties 3088 1 'feeder' } else { Set-Prop $dev.Properties 3088 2 'flatbed' }
    Set-Prop $item.Properties 6146 $Intent 'intent'
    Set-Prop $item.Properties 6147 $Dpi 'xres'
    Set-Prop $item.Properties 6148 $Dpi 'yres'
    Set-Prop $item.Properties 6149 0 'xpos'
    Set-Prop $item.Properties 6150 0 'ypos'
    if ($Adf -ne '1') {
      $w = [int](8.27 * $Dpi); $h = [int](11.69 * $Dpi)
      $bw = Get-PropByName $dev.Properties 'Horizontal Bed Size'
      $bh = Get-PropByName $dev.Properties 'Vertical Bed Size'
      if ($bw -and $bw -gt 0) { $mw = [int]($bw * $Dpi / 1000); if ($mw -gt 100 -and $mw -lt $w) { $w = $mw } }
      if ($bh -and $bh -gt 0) { $mh = [int]($bh * $Dpi / 1000); if ($mh -gt 100 -and $mh -lt $h) { $h = $mh } }
      Set-Prop $item.Properties 6151 $w 'xextent'
      Set-Prop $item.Properties 6152 $h 'yextent'
    }

    $n = 0
    if ($Adf -eq '1') {
      while ($true) {
        Set-Prop $dev.Properties 3096 1 'pages'
        $img = $null
        try { $img = Get-Page $item } catch {
          $hr = Get-Hr $_.Exception
          Write-Log ('adf page ' + ($n + 1) + ' failed hr=' + $hr + ' ' + $_.Exception.Message)
          if ($n -gt 0 -or $hr -eq '0x80210003') { break }
          throw
        }
        if (-not $img) { break }
        $n++
        Save-Jpeg $img (Join-Path $OutDir ('page{0:D3}.jpg' -f $n))
      }
      if ($n -eq 0) { throw 'NO_PAPER_IN_FEEDER' }
    } else {
      Write-Log 'transfer start'
      $img = Get-Page $item
      Write-Log 'transfer done'
      Save-Jpeg $img (Join-Path $OutDir 'page001.jpg')
    }
    $ok = $true
  } catch {
    $m = $_.Exception.Message
    $hr = Get-Hr $_.Exception
    Write-Log ('direct failed hr=' + $hr + ' ' + $m)
    if ($Adf -eq '1') {
      if ($m -match 'NO_PAPER_IN_FEEDER') { throw 'NO_PAPER_IN_FEEDER' }
      throw ('SCAN_FAILED hr=' + $hr + ' ' + $m)
    }
  } }

  if (-not $ok) {
    # fallback: legacy scanner dialog (only if direct scanning is not supported by the driver)
    Write-Log 'legacy dialog'
    $dlg = New-Object -ComObject WIA.CommonDialog
    $img = $dlg.ShowAcquireImage(1, 1, 0, $JPEG, $false, $true, $false)
    if (-not $img) { Write-Output 'CANCEL'; exit 0 }
    Save-Jpeg $img (Join-Path $OutDir 'page001.jpg')
  }
  Write-Log 'done'
} catch {
  Write-Log ('FATAL hr=' + (Get-Hr $_.Exception) + ' ' + $_.Exception.Message)
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 1
}
