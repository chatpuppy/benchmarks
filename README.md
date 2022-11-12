## Install
Tested on Mac, Linux, Windows and IllumOS Systems

```
npm install sodium
```
`node-sodium` depends on `libsodium`, so if libsodium does not compile on your platform chances are npm install sodium will fail.

Install can fail in some Linux distros due to permission issues. If you see an error similar to the following:
```
npm WARN lifecycle sodium@1.2.3~preinstall: cannot run in wd %s %s (wd=%s) sodium@1.2.3 node install.js --preinstall
```
Try installing with
```
npm install sodium --unsafe-perm
```
Installation will fail if node-gypis not installed on your system. Please run
```
npm install node-gyp -g
```

Before you install `node-sodium`. If you run into permission errors while installing node-gyp run as Adminstrator on Windows or use sudo in other OSes.
```
sudo npm install node-gyp -g
```

Compiling `libsodium` requires `autoconf`, `automake` and `libtool` so if you get an errors about these tools missing please install them. On Mac OS you can do so with:
```
brew install libtool autoconf automake
```
After install, don't forget to link by 
```
brew link libtool
brew link autoconf
brew link automake
```

If you cannot compile `libsodium` on Linux, try installing `libtools` with:
```
sudo apt-get install libtool-bin
```