//go:build windows

package main

import (
	"os/exec"
	"path"
)

func launchDiscord(di *DiscordInstall) error {
	name := windowsNames[di.branch]
	cmd := exec.Command(path.Join(di.path, "Update.exe"), "--processStart", name+".exe")
	return cmd.Start()
}

func isDiscordRunning(di *DiscordInstall) bool {
	return findProcessIdByName(windowsNames[di.branch]+".exe") != 0
}
