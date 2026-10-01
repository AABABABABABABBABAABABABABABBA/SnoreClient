// SnoreClient installer.
//
// Downloads the latest SnoreClient build from GitHub releases plus the
// Equilotl installer, then runs Equilotl pointed at the SnoreClient files so
// it patches Discord with SnoreClient instead of Equicord.
//
// SPDX-License-Identifier: GPL-3.0-or-later
package main

import (
	"bufio"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"
)

const (
	repo         = "aababababababbabaabababababba/SnoreClient"
	releaseBase  = "https://github.com/" + repo + "/releases/latest/download/"
	equilotlBase = "https://github.com/Equicord/Equilotl/releases/latest/download/"
)

var clientFiles = []string{"patcher.js", "preload.js", "renderer.js", "renderer.css"}

func main() {
	uninstall := flag.Bool("uninstall", false, "remove SnoreClient from Discord")
	repair := flag.Bool("repair", false, "repair an existing SnoreClient install")
	cli := flag.Bool("cli", false, "use the terminal installer instead of the graphical one")
	flag.Parse()

	fmt.Println("SnoreClient installer")
	fmt.Println()

	dir, err := dataDir()
	check(err, "finding data directory")
	dist := filepath.Join(dir, "dist", "desktop")
	check(os.MkdirAll(dist, 0o755), "creating "+dist)

	bin := equilotlName(*cli)
	binPath := filepath.Join(dir, bin)
	step("Downloading installer (" + bin + ")")
	check(download(equilotlBase+bin, binPath), "downloading Equilotl")
	check(os.Chmod(binPath, 0o755), "marking installer executable")

	if !*uninstall {
		for _, f := range clientFiles {
			step("Downloading SnoreClient " + f)
			check(download(releaseBase+f, filepath.Join(dist, f)), "downloading "+f)
		}
		check(os.WriteFile(filepath.Join(dist, "package.json"), []byte(`{"name":"snoreclient","main":"patcher.js"}`), 0o644), "writing package.json")
	}

	args := []string{}
	if *cli {
		switch {
		case *uninstall:
			args = append(args, "--uninstall")
		case *repair:
			args = append(args, "--repair")
		default:
			args = append(args, "--install")
		}
	}

	step("Starting Equilotl, pick your Discord install in the window that opens")
	cmd := exec.Command(binPath, args...)
	cmd.Dir = dir
	cmd.Stdin, cmd.Stdout, cmd.Stderr = os.Stdin, os.Stdout, os.Stderr
	cmd.Env = append(os.Environ(),
		"EQUICORD_USER_DATA_DIR="+dir,
		"EQUICORD_DIRECTORY="+dist,
		"EQUICORD_DEV_INSTALL=1",
	)
	if err := cmd.Run(); err != nil {
		fail("running Equilotl", err)
	}

	fmt.Println()
	fmt.Println("Done. Fully quit Discord (including the tray icon) and start it again.")
	fmt.Println("Updates arrive through Settings > SnoreClient > Updater.")
	pauseIfDoubleClicked()
}

func dataDir() (string, error) {
	switch runtime.GOOS {
	case "windows":
		if v := os.Getenv("LOCALAPPDATA"); v != "" {
			return filepath.Join(v, "SnoreClient"), nil
		}
	case "darwin":
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		return filepath.Join(home, "Library", "Application Support", "SnoreClient"), nil
	default:
		if v := os.Getenv("XDG_DATA_HOME"); v != "" {
			return filepath.Join(v, "SnoreClient"), nil
		}
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		return filepath.Join(home, ".local", "share", "SnoreClient"), nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, "SnoreClient"), nil
}

func equilotlName(cli bool) string {
	arch := runtime.GOARCH
	switch runtime.GOOS {
	case "windows":
		if cli {
			if arch == "arm64" {
				return "EquilotlCli-arm64.exe"
			}
			return "EquilotlCli.exe"
		}
		if arch == "arm64" {
			return "Equilotl-arm64.exe"
		}
		return "Equilotl.exe"
	case "darwin":
		if cli {
			if arch == "arm64" {
				return "EquilotlCli-arm64"
			}
			return "EquilotlCli-x64"
		}
		return "EquilotlCli-universal"
	default:
		if cli || os.Getenv("DISPLAY") == "" && os.Getenv("WAYLAND_DISPLAY") == "" {
			if arch == "arm64" {
				return "EquilotlCli-linux-arm64"
			}
			return "EquilotlCli-Linux"
		}
		if arch == "arm64" {
			return "Equilotl-arm64"
		}
		return "Equilotl"
	}
}

func download(url, dest string) error {
	client := &http.Client{Timeout: 5 * time.Minute}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "SnoreClientInstaller")
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return fmt.Errorf("%s returned HTTP %d", url, res.StatusCode)
	}

	tmp := dest + ".part"
	f, err := os.Create(tmp)
	if err != nil {
		return err
	}
	if _, err := io.Copy(f, res.Body); err != nil {
		f.Close()
		return err
	}
	if err := f.Close(); err != nil {
		return err
	}
	return os.Rename(tmp, dest)
}

func step(msg string) {
	fmt.Println("  > " + msg)
}

func check(err error, what string) {
	if err != nil {
		fail(what, err)
	}
}

func fail(what string, err error) {
	fmt.Fprintf(os.Stderr, "\nError while %s: %v\n", what, err)
	pauseIfDoubleClicked()
	os.Exit(1)
}

// On Windows a double clicked console program closes its window on exit, so
// wait for Enter when there is no parent terminal driving us.
func pauseIfDoubleClicked() {
	if runtime.GOOS != "windows" || len(os.Args) > 1 {
		return
	}
	fmt.Print("\nPress Enter to close this window.")
	bufio.NewReader(os.Stdin).ReadString('\n')
}
