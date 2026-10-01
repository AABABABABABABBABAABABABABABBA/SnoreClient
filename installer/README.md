# SnoreClientInstaller

The SnoreClient Installer allows you to install [SnoreClient, the cutest Discord Desktop client mod](https://github.com/aababababababbabaabababababba/SnoreClient)

![image](https://i.imgur.com/oHN41ss.png)

## Usage

Windows

| | X64 | ARM64 |
| --- | --- | --- |
| GUI | [Download](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstaller.exe) | [Download](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstaller-arm64.exe) |
| CLI | [Download](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstallerCli.exe) | [Download](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstallerCli-arm64.exe) |

MacOS

| | Universal | X64 | ARM64 |
| --- | --- | --- | --- |
| GUI | [Download](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstaller.dmg) | [Download](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstaller-x64.dmg) | [Download](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstaller-arm64.dmg) |
| CLI | [Download](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstallerCli-universal) | [Download](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstallerCli-x64) | [Download](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstallerCli-arm64) |

The CLI builds are plain binaries, so run `chmod +x <file>` after downloading.

Linux

| | X64 | ARM64 |
| --- | --- | --- |
| Combined GUI | [Download](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstaller) | [Download](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstaller-arm64) |
| X11 GUI | [Download](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstaller-x11) | [Download](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstaller-x11-arm64) |
| Wayland GUI | [Download](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstaller-wayland) | [Download](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstaller-wayland-arm64) |
| CLI | [Download](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstallerCli-linux) | [Download](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstallerCli-linux-arm64) |


## Building from source

### Prerequisites

You need to install the [Go programming language](https://go.dev/doc/install) and GCC, the GNU Compiler Collection (MinGW on Windows)

<details>
<summary>Additionally, if you're using Linux, you have to install some additional dependencies:</summary>

#### Base dependencies

```sh
apt install -y pkg-config libsdl2-dev libglx-dev libgl1-mesa-dev
dnf install pkg-config libGL-devel libXxf86vm-devel
```

#### X11 dependencies

```sh
apt install -y xorg-dev
dnf install libXcursor-devel libXi-devel libXinerama-devel libXrandr-devel
```

#### Wayland dependencies

```sh
apt install -y libwayland-dev libxkbcommon-dev wayland-protocols extra-cmake-modules
dnf install wayland-devel libxkbcommon-devel wayland-protocols-devel extra-cmake-modules
```

</details>

### Building

#### Install dependencies

```sh
go mod tidy
```

#### Build the GUI

##### Windows / Mac / Linux X11

```sh
make GUI=1
```

##### Linux Wayland

```sh
make GUI=1 WAYLAND=1
```

#### Build the CLI

```
go build --tags cli
```

You might want to pass some flags to this command to get a better build.
See [the GitHub workflow](https://github.com/aababababababbabaabababababba/SnoreClient/blob/main/.github/workflows/release.yml) for what flags I pass or if you want more precise instructions
