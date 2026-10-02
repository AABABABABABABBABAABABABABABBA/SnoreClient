//go:build linux

package main

import (
	"errors"
	"os/exec"
	"path"
	"strings"
)

var linuxFlatpakIds = map[string]string{
	"stable": "com.discordapp.Discord",
	"ptb":    "com.discordapp.DiscordPTB",
	"canary": "com.discordapp.DiscordCanary",
	"dev":    "com.discordapp.DiscordDevelopment",
}

func launchDiscord(di *DiscordInstall) error {
	if di.isFlatpak {
		return exec.Command("flatpak", "run", linuxFlatpakIds[di.branch]).Start()
	}
	for _, name := range []string{"Discord", "DiscordPTB", "DiscordCanary", "DiscordDevelopment", "discord", "discord-ptb", "discord-canary"} {
		bin := path.Join(di.path, name)
		if ExistsFile(bin) {
			return exec.Command(bin).Start()
		}
	}
	for _, name := range []string{"discord", "discord-canary", "discord-ptb"} {
		if p, err := exec.LookPath(name); err == nil {
			return exec.Command(p).Start()
		}
	}
	return errors.New("could not find the Discord executable in " + di.path)
}

func isDiscordRunning(di *DiscordInstall) bool {
	out, err := exec.Command("pgrep", "-f", "-i", "discord").Output()
	return err == nil && strings.TrimSpace(string(out)) != ""
}
