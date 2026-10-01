# Tray helper for the Microsoft Rewards control API.
#
# Spawned by scripts/api/trayControl.js when the user picks "hide to tray". It
# must inherit the parent's console, because GetConsoleWindow() is what gives us
# the window handle to hide and restore - a child launched with its own console
# would hide the wrong window.
#
# Lifetime: the tray icon exists only while the console is hidden. Restoring the
# terminal or the server going away both end this process; "Stop and exit" keeps
# the icon until the server has actually exited, so a hidden server can never
# outlive its only handle.
#
# Protocol: single "__TRAY__ <event>" lines on stdout, read by trayControl.js.
#   hidden      - console hidden, icon visible, ready
#   shown       - console restored, tray icon going away
#   stopping    - the user picked "Stop and exit"; the server should shut down
#   server-gone - the server process exited
#   error <msg> - something failed; the console has been made visible again

param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][int]$ServerPid,
    [string]$Title = 'Microsoft Rewards Script'
)

$ErrorActionPreference = 'Stop'

$script:Url = $Url
$script:ServerPid = $ServerPid
$script:closing = $false
$script:icon = $null
$script:timer = $null
$script:stopDeadline = $null

function Emit([string]$message) {
    try {
        [Console]::Out.WriteLine("__TRAY__ $message")
        [Console]::Out.Flush()
    } catch {
        # The server may already be gone, taking the stdout pipe with it.
    }
}

try {
    Add-Type -Namespace MrsTray -Name Native -MemberDefinition @'
[DllImport("kernel32.dll")]
public static extern IntPtr GetConsoleWindow();
[DllImport("user32.dll")]
public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
[DllImport("user32.dll")]
public static extern bool SetForegroundWindow(IntPtr hWnd);
'@
} catch {
    Emit "error $($_.Exception.Message)"
    exit 1
}

$SW_HIDE = 0
$SW_SHOW = 5

$script:hwnd = [MrsTray.Native]::GetConsoleWindow()
if ($script:hwnd -eq [IntPtr]::Zero) {
    Emit 'error no console window is attached to this process'
    exit 1
}

function Show-Console {
    [void][MrsTray.Native]::ShowWindow($script:hwnd, $SW_SHOW)
    [void][MrsTray.Native]::SetForegroundWindow($script:hwnd)
}

function Close-Tray([string]$reason) {
    if ($script:closing) { return }
    $script:closing = $true
    if ($script:timer) {
        $script:timer.Stop()
        $script:timer.Dispose()
    }
    if ($script:icon) {
        $script:icon.Visible = $false
        $script:icon.Dispose()
    }
    Emit $reason
    [System.Windows.Forms.Application]::Exit()
}

function Test-ServerAlive {
    return [bool](Get-Process -Id $script:ServerPid -ErrorAction SilentlyContinue)
}

try {
    [void][MrsTray.Native]::ShowWindow($script:hwnd, $SW_HIDE)

    $script:icon = New-Object System.Windows.Forms.NotifyIcon
    try {
        $exePath = (Get-Process -Id $script:ServerPid -ErrorAction Stop).Path
        $script:icon.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exePath)
    } catch {
        $script:icon.Icon = [System.Drawing.SystemIcons]::Application
    }
    # NotifyIcon.Text rejects anything longer than 63 characters.
    $tooltip = "$Title`n$script:Url"
    if ($tooltip.Length -gt 63) { $tooltip = $tooltip.Substring(0, 63) }
    $script:icon.Text = $tooltip

    $menu = New-Object System.Windows.Forms.ContextMenuStrip

    $showItem = $menu.Items.Add('Show terminal')
    $showItem.add_Click({ Show-Console; Close-Tray 'shown' })

    $openItem = $menu.Items.Add('Open Web UI')
    $openItem.add_Click({
        try { Start-Process $script:Url } catch {}
    })

    [void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))

    $stopItem = $menu.Items.Add('Stop and exit')
    $stopItem.add_Click({
        # Ask the Node parent to shut down (it reads this line from our stdout)
        # and wait for the process to actually exit. The icon stays as the only
        # visible handle to the hidden console until then.
        if ($script:stopDeadline) { return }
        $script:stopDeadline = (Get-Date).AddSeconds(60)
        $this.Enabled = $false
        $this.Text = 'Stopping...'
        Emit 'stopping'
    })

    $script:icon.ContextMenuStrip = $menu
    $script:icon.add_DoubleClick({ Show-Console; Close-Tray 'shown' })
    $script:icon.Visible = $true

    $script:timer = New-Object System.Windows.Forms.Timer
    $script:timer.Interval = 2000
    $script:timer.add_Tick({
        if (-not (Test-ServerAlive)) {
            Close-Tray 'server-gone'
            return
        }
        if ($script:stopDeadline -and (Get-Date) -gt $script:stopDeadline) {
            # The server never exited. Hand the terminal back rather than leaving
            # a hidden process with no way to reach it.
            Show-Console
            Close-Tray 'error shutdown timed out - terminal restored'
        }
    })
    $script:timer.Start()

    Emit 'hidden'
    [System.Windows.Forms.Application]::Run()
} catch {
    Show-Console
    if ($script:icon) {
        $script:icon.Visible = $false
        $script:icon.Dispose()
    }
    Emit "error $($_.Exception.Message)"
    exit 1
}

exit 0
