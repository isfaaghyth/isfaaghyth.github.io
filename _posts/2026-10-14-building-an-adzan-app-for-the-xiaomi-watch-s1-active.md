---
title: Building an Adzan App for the Xiaomi Watch S1 Active
emoticon: ⌚️
toc: true
date: 2026-10-14T16:46:21.952Z
categories:
  - exploration
tags:
  - reverse
---

I have worn a **Xiaomi Watch S1 Active** since around 2022. It is a good watch: a big 466x466 AMOLED screen, long battery life, solid fitness tracking. But there was always one thing that bothered me. I could not build anything for it.

Every year I would search again. "Xiaomi Watch S1 SDK." "S1 Active sideload app." "Mi Watch developer." The answers were always the same: a partner program I could not join, forum posts asking the same question as me, and tutorials for other Xiaomi watches that run a different operating system. The S1 Active sat on my wrist as a closed box.

In 2026 that changed, not because Xiaomi opened anything, but because AI coding agents got good and cheap. Chinese models in particular became surprisingly capable for very little money, cheap enough that I could let an agent grind through a decompiled APK for hours without worrying about the bill. So I tried again, this time with an AI pair, and with one concrete goal: an Adzan (prayer time) reminder on my watch.

This article is about why, what we found, how to do it yourself, and where the Adzan app stands today.

### Why an Adzan app

As a Muslim, I pray five times a day, and the times shift every day with the sun. My phone has an Adzan app, but my phone is not always in my hand. My watch is always on my wrist. A prayer time screen with a countdown to the next prayer, right on the watch face side, is the kind of small thing that makes a real difference in daily life.

It was also a good test project. It needs real math (solar position), a correct timezone, a readable UI, and eventually an alert at the right moment. If I could ship that, I could ship anything on this watch.

### What we discovered

#### The S1 Active does not run what everyone assumes

Most recent Xiaomi watches run **Xiaomi Vela** with a QuickApp style JS framework, and Xiaomi's aiot-toolkit builds .rpk packages for them. The first natural attempt was to build a Vela app and install it. The watch rejected it.

After digging through the store apps and the Mi Fitness companion app, the real picture appeared: the S1 and S1 Active run a HarmonyOS lite wearable JS runtime (ACE Lite on top of JerryScript 2.1). The .rpk from the store is only a wrapper. The real app lives inside it:

```
<package>.rpk                      zip, built with aiot-toolkit, signed
 |-- manifest.json, app.js, ...    placeholder Vela app (ignored by the S1)
 |-- key.txt                       signing cert hashes
 `-- entry-release-unsigned.bin    the real app
       |-- config.json             deviceType "liteWearable", bundle name, pages
       |-- assets/entry/...        resource index + icons
       `-- assets/js/default/
             app.js + app.bc
             pages/<p>/<p>.js      compiled page
             pages/<p>/<p>.bc      JerryScript bytecode (REQUIRED)
```

That one finding explained years of dead ends. Everyone was building the wrapper and never the content.

#### A custom container format

`entry-release-unsigned.bin` is not a zip. By comparing two store apps byte by byte, we worked out the layout:

```
u32 LE  0x000000BE                 magic / version
u8      bundle name length, bundle name
repeat until EOF:
  u32 BE name length, name
  u32 BE dir length,  dir
  u64 BE size, data
```

Both store apps parse exactly to end of file with this layout, which gave me confidence it was right. A small Python tool, `litebin.py`, now packs, unpacks and lists these containers.

#### Bytecode is mandatory

The watch only runs a page if a `.bc` file sits next to the `.js`. We proved it by stripping the `.bc` files from a store app: it installed fine and opened to a blank screen.

The `.bc` files are **JerryScript v2.1.0 snapshots** (header JRRY, version 24). Building `jerry-snapshot` from the v2.1.0 tag reproduces the store apps' bytecode byte for byte. That was the moment I knew the toolchain was solved.

#### Icons and pages

Icons are raw bitmaps: an `8 byte header` (\`00 01 00 00\`, width, height) followed by **BGRA pixels**. Pages are written in the compiled form the runtime expects, a render function plus a style sheet plus a ViewModel:

| **Feature** | **Compiled form**                                                                   |
| ----------- | ----------------------------------------------------------------------------------- |
| element     | `_c("text", {attrs:{...}, staticClass:["cls"]}, [children])`                        |
| bound text  | `attrs:{value:function(){return t.status}}`                                         |
| event       | `on:{click:t.tap}`                                                                  |
| styles      | `{classSelectors:{cls:{width:466, ...}}}`                                           |
| native APIs | `requireNative("system.app")`, `system.audio`, `system.file`, `system.interconnect` |

Writing in compiled form sounds painful, but a tiny generator script makes it manageable, and honestly the AI handled most of that boilerplate.

#### The hidden installer inside Mi Fitness

Building the package is half the story. How do you get it onto the watch? There is no "install from file" button anywhere.

Decompiling Mi Fitness with **jadx** turned up `ThirdAppDebugFragment`, a developer installer that Xiaomi's own IDE opens over `adb`. It is hidden in release builds, but Mi Fitness exports an activity (\`CommonBaseActivity\`) that can host it. A small Android instrumentation test starts that activity with the right fragment and arguments, pointing at our `.rpk`. Mi Fitness then pushes it to the watch over Bluetooth like any store app.

When logcat prints `handleInstallResultPacket code:0`, the app is on your wrist.

#### A side quest: talking to the watch directly

Along the way we also built an independent Android companion that speaks the Xiaomi Wear BLE protocol without Mi Fitness or a cloud account. To do that we needed the watch's auth token, which Mi Fitness stores in a private SQLite database. The trick without root: repackage Mi Fitness as debuggable, reinstall, re-pair, then read `device_db` with `run-as`. With the token we reimplemented the handshake (**HKDF-SHA256 key derivation**, **AES-CCM auth**, **AES-CTR for data**) and could send notifications to the watch directly from our own app. This matters later for Adzan alerts.

### How to do it yourself

> Tested on Xiaomi Watch S1 Active (M2116W1), firmware 1.4.174. Your mileage may vary on other firmware.

**Requirements**: `Node` and `npm`, `Python3`, `OpenSSL`, `CMake`, `git`, Android platform tools (\`adb\`, `apktool`, `zipalign`, `apksigner`), and an Android phone paired with the watch.

##### 1. Make Mi Fitness debuggable

```shell
adb shell pm path com.xiaomi.wearable
```

Pull every split it lists (base plus `split_config.*`), then:

```shell
apktool d base.apk -o apktool_out
```

&#x20;Set `android:debuggable="true"` on `<application>` in `apktool_out/AndroidManifest.xml`, `rebuild`, `align`, and `sign` all splits with the same key:

```shell
apktool b apktool_out -o mi_fitness_debug_base.apk
```

```shell
zipalign -p 4 mi_fitness_debug_base.apk aligned.apk
```

```shell
apksigner sign --ks debug.keystore aligned.apk split_config.*.apk
```

Uninstall the original Mi Fitness, install your build with `adb install-multiple`, log in and re-pair the watch.

> Warning: never "unbind" the watch inside Mi Fitness. That revokes the token on the server side.

##### 2. Build the toolchain once

```shell
(cd watchapp/hello && npm install)
```

```shell
watchapp/tools/build-jerry-snapshot.sh
```

##### 3. Build an app

```shell
watchapp/tools/build-app.sh watchapp/lite-hello watchapp/hello
```

The script compiles every page to `.bc`, packs the container, drops it into the aiot-toolkit wrapper, and builds a signed `.rpk` into `watchapp/hello/dist/`.

##### 4. Sideload

Stage the file inside Mi Fitness' private storage:

```shell
adb push watchapp/hello/dist/<file>.rpk /data/local/tmp/app.rpk
```

```shell
adb shell "run-as com.xiaomi.wearable mkdir -p files/rpk && run-as com.xiaomi.wearable cp /data/local/tmp/app.rpk files/rpk/app.rpk"
```

Install the companion test APK (\`./gradlew installDebugAndroidTest\` in companion/), then trigger the hidden installer:

```shell
adb shell am instrument -w -e sideload /data/user/0/com.xiaomi.wearable/files/rpk/app.rpk -e pkg dev.miwatch.hello -e ver 2 -e class dev.miwatch.companion.SideloadRpkTest dev.miwatch.companion.test/androidx.test.runner.AndroidJUnitRunner
```

Look for `code:0` in logcat. To update an app, bump the version code in `config.json` and in the page `manifest.json`.
