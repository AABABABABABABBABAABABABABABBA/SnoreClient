//go:build !cli

/*
 * SPDX-License-Identifier: GPL-3.0
 * SnoreClient launcher screen for the installer GUI
 */

package main

import (
	"image/color"
	"os/exec"
	"runtime"
	"time"

	g "github.com/AllenDang/giu"
)

var showInstallerPage = false
var launcherStatus = ""
var launcherBusy = false

func setLauncherStatus(s string) {
	launcherStatus = s
	g.Update()
}

func openUrl(url string) {
	switch runtime.GOOS {
	case "windows":
		_ = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		_ = exec.Command("open", url).Start()
	default:
		_ = exec.Command("xdg-open", url).Start()
	}
}

func launcherInstall() *DiscordInstall {
	if len(discords) == 0 {
		return nil
	}
	if radioIdx < len(discords) {
		return discords[radioIdx].(*DiscordInstall)
	}
	return discords[0].(*DiscordInstall)
}

func needsUpdate() bool {
	return !IsDevInstall && LatestHash != "Unknown" && InstalledHash != LatestHash
}

// Make sure SnoreClient is installed and current on the chosen Discord, then start Discord.
func launchWithSnoreClient() {
	di := launcherInstall()
	if di == nil || launcherBusy {
		return
	}
	launcherBusy = true
	go func() {
		defer func() { launcherBusy = false; g.Update() }()

		if !di.isPatched || needsUpdate() {
			setLauncherStatus("Updating SnoreClient...")
			if err := InstallLatestBuilds(); err != nil {
				setLauncherStatus("Update failed: " + err.Error())
				return
			}
			if err := di.patch(); err != nil {
				setLauncherStatus("Install failed: " + err.Error())
				return
			}
			InstalledHash = LatestHash
		}

		if isDiscordRunning(di) {
			setLauncherStatus("Discord is already running. Restarting it with SnoreClient...")
			PreparePatch(di)
			time.Sleep(1500 * time.Millisecond)
		}

		setLauncherStatus("Starting Discord...")
		if err := launchDiscord(di); err != nil {
			setLauncherStatus("Could not start Discord: " + err.Error())
			return
		}
		setLauncherStatus("Discord started with SnoreClient " + Ternary(IsDevInstall, "(dev build)", LatestHash[:min(7, len(LatestHash))]))
	}()
}

func launcherUpdate() {
	di := launcherInstall()
	if di == nil || launcherBusy {
		return
	}
	launcherBusy = true
	go func() {
		defer func() { launcherBusy = false; g.Update() }()
		setLauncherStatus("Downloading the latest SnoreClient...")
		if err := InstallLatestBuilds(); err != nil {
			setLauncherStatus("Update failed: " + err.Error())
			return
		}
		if err := di.patch(); err != nil {
			setLauncherStatus("Install failed: " + err.Error())
			return
		}
		InstalledHash = LatestHash
		setLauncherStatus("SnoreClient is up to date. Restart Discord to apply it.")
	}()
}

func bigButton(label string, bg, hover color.RGBA, w float32, disabled bool, onClick func()) g.Widget {
	return g.Style().
		SetColor(g.StyleColorButton, bg).
		SetColor(g.StyleColorButtonHovered, hover).
		SetStyle(g.StyleVarFrameRounding, 10, 10).
		SetDisabled(disabled).
		To(g.Button(label).OnClick(onClick).Size(w, 56))
}

func renderLauncher() g.Widget {
	wi, _ := win.GetSize()
	w := float32(wi) - 96
	di := launcherInstall()

	installed := "Not installed"
	state := DiscordRed
	if di != nil && di.isPatched {
		if needsUpdate() {
			installed = "Installed, update available"
			state = DiscordYellow
		} else {
			installed = "Installed and up to date"
			state = DiscordGreen
		}
	}
	target := "No Discord install found"
	if di != nil {
		target = di.branch + "  ·  " + di.path
	}
	running := ""
	if di != nil && isDiscordRunning(di) {
		running = "  ·  Discord is running"
	}

	rows := g.Layout{}
	for i, d := range discords {
		idx := i
		install := d.(*DiscordInstall)
		rows = append(rows, g.RadioButton(install.branch+"  "+install.path, radioIdx == idx).OnChange(func() { radioIdx = idx }))
	}

	return g.Layout{
		g.Style().SetFontSize(20).To(
			renderErrorCard(state, color.Black, "SnoreClient: "+installed+"\nDiscord: "+target+running, 70),
		),
		g.Dummy(0, 16),
		g.Style().SetFontSize(18).To(g.Label("Discord install to launch")),
		rows,
		g.Dummy(0, 20),
		g.Style().SetFontSize(22).To(
			g.Row(
				bigButton("Launch Discord", DiscordGreen, DiscordGreenHovered, (w-40)/3, di == nil || launcherBusy || GithubError != nil, launchWithSnoreClient),
				bigButton(Ternary(needsUpdate(), "Update SnoreClient", "Reinstall SnoreClient"), DiscordBlue, DiscordBlueHovered, (w-40)/3, di == nil || launcherBusy || GithubError != nil, launcherUpdate),
				bigButton("Installer options", color.RGBA{70, 72, 84, 0xff}, color.RGBA{90, 92, 108, 0xff}, (w-40)/3, false, func() { showInstallerPage = true }),
			),
		),
		g.Dummy(0, 12),
		g.Row(
			g.Button("Open snore.pw").OnClick(func() { openUrl("https://snore.pw") }),
			g.Button("Plugins").OnClick(func() { openUrl("https://snore.pw/plugins") }),
			g.Button("GitHub").OnClick(func() { openUrl("https://github.com/aababababababbabaabababababba/SnoreClient") }),
			g.Button("Settings folder").OnClick(func() { openUrl("file://" + BaseDir) }),
		),
		g.Dummy(0, 16),
		g.Style().SetFontSize(18).To(g.Label(launcherStatus)),
		g.Dummy(0, 8),
		g.Style().SetColor(g.StyleColorText, color.RGBA{160, 160, 175, 0xff}).To(
			g.Label("Latest build: " + LatestHash[:min(7, len(LatestHash))] + "    Installed: " + InstalledHash[:min(7, len(InstalledHash))] + "    Launcher " + buildinfoTag()),
		),
	}
}
