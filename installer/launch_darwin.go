//go:build darwin

package main

import "os/exec"

func launchDiscord(di *DiscordInstall) error {
	return exec.Command("open", "-a", di.path).Start()
}

func isDiscordRunning(di *DiscordInstall) bool {
	out, err := exec.Command("pgrep", "-x", "Discord", "Discord Canary", "Discord PTB").Output()
	return err == nil && len(out) > 0
}
