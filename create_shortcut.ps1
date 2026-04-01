$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath('Desktop')
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\台股當沖損益計算機.lnk")
$Shortcut.TargetPath = "C:\Windows\explorer.exe"
$Shortcut.Arguments = "C:\當沖\index.html"
$Shortcut.WorkingDirectory = "C:\當沖"
$Shortcut.IconLocation = "C:\Windows\System32\shell32.dll, 21"
$Shortcut.Save()
