//go:build !cli

package main

import "snoreinstaller/buildinfo"

func buildinfoTag() string {
	return buildinfo.InstallerGitHash
}
