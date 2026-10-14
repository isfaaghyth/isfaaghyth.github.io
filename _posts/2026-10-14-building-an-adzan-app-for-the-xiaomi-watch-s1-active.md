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

![Sholat running on the Xiaomi Watch S1 Active, showing Subuh 04:16 for Jakarta](/assets/images/uploads/sholat-watch.jpg)

I have worn a Xiaomi Watch S1 Active since around 2022. It is a good watch: a big 466x466 AMOLED screen, long battery life, solid fitness tracking. But there was always one thing that bothered me. I could not build anything for it.

Every few months I would search again. `"Xiaomi Watch S1 SDK."` `"S1 Active sideload app."` `"Mi Watch developer."` The answers were always the same: a partner program I could not join, forum posts asking the same question as me, and tutorials for *other* Xiaomi watches that run a different operating system. The S1 Active sat on my wrist as a closed box.

In 2026 that changed, not because Xiaomi opened anything, but LLM agents got good and cheap. Chinese models (mocin) in particular became surprisingly capable for this case, cheap enough that I could let an agent grind through a reverse engineering for hours with powerful. So I tried again, this time with GLM 5.2 (for reverse) and Claude Opus 5.5 (for building the app), and to build my first app: *Adzan Reminder*.

## Why an Adzan app

As a Muslim, I pray five times a day, and the times shift every day with the sun. My phone has an Adzan app, but my phone is not always in my hand. My watch is always on my wrist. A prayer time screen with a countdown to the next prayer, right on the watch face side, is the kind of small thing that makes a real difference in daily life.

It was also a good test project. It needs real math (solar position), a correct timezone, a readable UI, and eventually an alert at the right moment. If I could ship that, I could ship anything on this watch.

## What we discovered

### The S1 Active does not run what everyone assumes

Most recent Xiaomi watches run **Xiaomi Vela** with a QuickApp style JS framework, and Xiaomi's `aiot-toolkit` builds `.rpk` packages for them. The first natural attempt was to build a Vela app and install it. The watch rejected it.

After digging through the store apps and the Mi Fitness companion app, the real picture appeared: the S1 and S1 Active run a **HarmonyOS lite wearable JS runtime** (ACE Lite on top of JerryScript 2.1). The `.rpk` from the store is only a wrapper. The real app lives inside it:

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

### A custom container format

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

### Bytecode is mandatory

The watch only runs a page if a `.bc` file sits next to the `.js`. We proved it by stripping the `.bc` files from a store app: it installed fine and opened to a blank screen.

The `.bc` files are **JerryScript v2.1.0 snapshots** (header `JRRY`, version 24). Building `jerry-snapshot` from the v2.1.0 tag reproduces the store apps' bytecode **byte for byte**. That was the moment I knew the toolchain was solved.

### Icons and pages

Icons are raw bitmaps: an 8 byte header (`00 01 00 00`, width, height) followed by BGRA pixels. Pages are written in the *compiled* form the runtime expects, a render function plus a style sheet plus a `ViewModel`:

| Feature     | Compiled form                                                                       |
| ----------- | ----------------------------------------------------------------------------------- |
| element     | `_c("text", {attrs:{...}, staticClass:["cls"]}, [children])`                        |
| bound text  | `attrs:{value:function(){return t.status}}`                                         |
| event       | `on:{click:t.tap}`                                                                  |
| styles      | `{classSelectors:{cls:{width:466, ...}}}`                                           |
| native APIs | `requireNative("system.app")`, `system.audio`, `system.file`, `system.interconnect` |

Writing in compiled form sounds painful, but a tiny generator script makes it manageable, and honestly the AI handled most of that boilerplate.

### The hidden installer inside Mi Fitness

Building the package is half the story. How do you get it onto the watch? There is no "install from file" button anywhere.

Decompiling Mi Fitness with jadx turned up `ThirdAppDebugFragment`, a developer installer that Xiaomi's own IDE opens over adb. It is hidden in release builds, but Mi Fitness exports an activity (`CommonBaseActivity`) that can host it. A small Android instrumentation test starts that activity with the right fragment and arguments, pointing at our `.rpk`. Mi Fitness then pushes it to the watch over Bluetooth like any store app.

When logcat prints `handleInstallResultPacket code:0`, the app is on your wrist.

### A side quest: talking to the watch directly

Along the way we also built an independent Android companion that speaks the Xiaomi Wear BLE protocol without Mi Fitness or a cloud account. To do that we needed the watch's auth token, which Mi Fitness stores in a private SQLite database. The trick without root: repackage Mi Fitness as `debuggable`, reinstall, re-pair, then read `device_db` with `run-as`. With the token we reimplemented the handshake (HKDF-SHA256 key derivation, AES-CCM auth, AES-CTR for data) and could send notifications to the watch directly from our own app. This matters later for Adzan alerts.

## How to do it yourself

> Tested on Xiaomi Watch S1 Active (M2116W1), firmware 1.4.174. Your mileage may vary on other firmware.

**Requirements:** Node and npm, Python 3, OpenSSL, CMake, git, Android platform tools (adb, apktool, zipalign, apksigner), and an Android phone paired with the watch.

### 1. Make Mi Fitness debuggable

```bash
adb shell pm path com.xiaomi.wearable
```

Pull every split it lists (base plus `split_config.*`), then:

```bash
apktool d base.apk -o apktool_out
```

Set `android:debuggable="true"` on `<application>` in `apktool_out/AndroidManifest.xml`, rebuild, align, and sign **all** splits with the same key:

```bash
apktool b apktool_out -o mi_fitness_debug_base.apk
```

```bash
zipalign -p 4 mi_fitness_debug_base.apk aligned.apk
```

```bash
apksigner sign --ks debug.keystore aligned.apk split_config.*.apk
```

Uninstall the original Mi Fitness, install your build with `adb install-multiple`, log in and re-pair the watch.

**Warning:** never "unbind" the watch inside Mi Fitness. That revokes the token on the server side.

### 2. Build the toolchain once

```bash
(cd watchapp/hello && npm install)
```

```bash
watchapp/tools/build-jerry-snapshot.sh
```

### 3. Build an app

```bash
watchapp/tools/build-app.sh watchapp/lite-hello watchapp/hello
```

The script compiles every page to `.bc`, packs the container, drops it into the aiot-toolkit wrapper, and builds a signed `.rpk` into `watchapp/hello/dist/`.

### 4. Sideload

Stage the file inside Mi Fitness' private storage:

```bash
adb push watchapp/hello/dist/<file>.rpk /data/local/tmp/app.rpk
```

```bash
adb shell "run-as com.xiaomi.wearable mkdir -p files/rpk && run-as com.xiaomi.wearable cp /data/local/tmp/app.rpk files/rpk/app.rpk"
```

Install the companion test APK (`./gradlew installDebugAndroidTest` in `companion/`), then trigger the hidden installer:

```bash
adb shell am instrument -w -e sideload /data/user/0/com.xiaomi.wearable/files/rpk/app.rpk -e pkg dev.miwatch.hello -e ver 2 -e class dev.miwatch.companion.SideloadRpkTest dev.miwatch.companion.test/androidx.test.runner.AndroidJUnitRunner
```

Look for `code:0` in logcat. To update an app, bump the version code in `config.json` and in the page `manifest.json`.

## Building the Adzan app, step by step

Now the fun part. Here is how the Sholat app is put together, from the prayer math to the `.rpk` that lands on the watch.

### Project layout

```
watchapp/lite-prayer/
  src/praytimes.js     prayer time math (ES5)
  src/page.js          page logic: data, countdown, refresh timer
  gen.py               turns src/ into the compiled page the runtime executes
  app/                 the container tree that becomes entry-release-unsigned.bin
    config.json
    assets/entry/...   icons + resource index
    assets/js/default/pages/index/index.js   (generated)
```

### Step 1: Declare the app in `config.json`

This is the HarmonyOS lite manifest. The important bits are `bundleName`, `deviceType: liteWearable`, and the list of pages.

```json
{
  "app": {
    "apiVersion": { "compatible": 3, "target": 3 },
    "vendor": "miwatch",
    "bundleName": "dev.miwatch.prayer",
    "version": { "code": 1, "name": "1.0.0" }
  },
  "deviceConfig": {},
  "module": {
    "abilities": [
      { "iconId": 16777216, "icon": "$media:icon", "name": "default", "label": "Sholat", "type": "page" }
    ],
    "deviceType": ["liteWearable"],
    "distro": { "moduleType": "entry", "deliveryWithInstall": true, "moduleName": "entry" },
    "js": [{ "pages": ["pages/index/index"], "name": "default" }]
  }
}
```

### Step 2: The prayer math (`src/praytimes.js`)

The runtime is JerryScript 2.1, so everything is plain ES5: no `let`, no arrow functions, no classes. The algorithm is the classic one: compute the sun's declination and the equation of time for the day, find solar noon, then find the hour angle at which the sun reaches each prayer's angle below the horizon.

Location and the Kemenag parameters sit at the top:

```js
var PRAY = {
  LAT: -6.2088, LNG: 106.8456, TZ: 7, CITY: "Jakarta",
  FAJR: 20, ISHA: 18, IHTIYAT: 2,

  rad: function (d) { return d * Math.PI / 180; },
  deg: function (r) { return r * 180 / Math.PI; },
  fix: function (a, b) { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; },
```

Sun position for a Julian date:

```js
  sun: function (jd) {
    var D = jd - 2451545.0;
    var g = this.fix(357.529 + 0.98560028 * D, 360);   // mean anomaly
    var q = this.fix(280.459 + 0.98564736 * D, 360);   // mean longitude
    var L = this.fix(q + 1.915 * Math.sin(this.rad(g)) + 0.020 * Math.sin(this.rad(2 * g)), 360);
    var e = 23.439 - 0.00000036 * D;                    // obliquity
    var RA = this.deg(Math.atan2(Math.cos(this.rad(e)) * Math.sin(this.rad(L)), Math.cos(this.rad(L)))) / 15;
    var eqt = q / 15 - this.fix(RA, 24);
    if (eqt > 12) { eqt -= 24; } else if (eqt < -12) { eqt += 24; }
    var decl = this.deg(Math.asin(Math.sin(this.rad(e)) * Math.sin(this.rad(L))));
    return { decl: decl, eqt: eqt };
  },
```

Hours between solar noon and the moment the sun is `angle` degrees below the horizon:

```js
  hourAngle: function (angle, decl) {
    var lat = this.rad(this.LAT), d = this.rad(decl);
    var v = (-Math.sin(this.rad(angle)) - Math.sin(lat) * Math.sin(d)) / (Math.cos(lat) * Math.cos(d));
    return this.deg(Math.acos(Math.max(-1, Math.min(1, v)))) / 15;
  },
```

And the five prayers (plus sunrise) for a given date, in minutes after local midnight. Ihtiyat is added to every prayer and subtracted from sunrise, then rounded in the safe direction:

```js
  forDate: function (y, m, day) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    var jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
    var s = this.sun(jd + 0.5 - this.LNG / 360);
    var noon = 12 + this.TZ - this.LNG / 15 - s.eqt;
    var asrAlt = -this.deg(Math.atan(1 / (1 + Math.tan(this.rad(Math.abs(this.LAT - s.decl))))));
    var h = {
      subuh:   noon - this.hourAngle(this.FAJR, s.decl),
      terbit:  noon - this.hourAngle(0.833, s.decl),
      dzuhur:  noon,
      ashar:   noon + this.hourAngle(asrAlt, s.decl),
      maghrib: noon + this.hourAngle(0.833, s.decl),
      isya:    noon + this.hourAngle(this.ISHA, s.decl)
    };
    var out = {}, k;
    for (k in h) {
      var mins = h[k] * 60 + (k === "terbit" ? -this.IHTIYAT : this.IHTIYAT);
      out[k] = k === "terbit" ? Math.floor(mins) : Math.ceil(mins);
    }
    return out;
  },
```

Because it is plain JavaScript, you can test it on your laptop with Node before it ever touches the watch:

```bash
node -e 'var P=require("./watchapp/lite-prayer/src/praytimes.js");var t=P.forDate(2026,10,14);for(var k in t)console.log(k,P.hhmm(t[k]))'
```

### Step 3: The page logic (`src/page.js`)

One Caveat: do not trust the device timezone. The page takes the UTC epoch from `Date.now()`, adds the fixed offset, and reads everything with the `getUTC*` methods:

```js
function localNow() {
  var d = new Date(Date.now() + PRAY.TZ * 3600000);
  return {
    y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, day: d.getUTCDate(), wd: d.getUTCDay(),
    mins: d.getUTCHours() * 60 + d.getUTCMinutes()
  };
}
```

The page object holds the bound data and a `refresh` that finds the next prayer. After Isya it rolls over to tomorrow's Subuh:

```js
var page = {
  data: { city: PRAY.CITY, date: "", clock: "", nextName: "", nextTime: "", countdown: "",
          subuh: "", terbit: "", dzuhur: "", ashar: "", maghrib: "", isya: "" },
  timer: null,
  refresh: function () {
    var n = localNow();
    var t = PRAY.forDate(n.y, n.m, n.day);
    // ... fill this.subuh, this.dzuhur, ... with PRAY.hhmm(...)

    var name = null, at = 0, i;
    for (i = 0; i < ORDER.length; i++) {
      if (t[ORDER[i][0]] > n.mins) { name = ORDER[i][1]; at = t[ORDER[i][0]]; break; }
    }
    var left;
    if (name === null) {                       // after Isya: tomorrow's Subuh
      var tm = tomorrow(n);
      at = PRAY.forDate(tm.y, tm.m, tm.day).subuh;
      name = "Subuh"; left = at + 1440 - n.mins;
    } else {
      left = at - n.mins;
    }
    this.nextName = name.toUpperCase();
    this.nextTime = PRAY.hhmm(at);
    this.countdown = "dalam " + (left >= 60 ? Math.floor(left / 60) + "j " : "") + (left % 60) + "m";
  },
  onInit: function () { this.refresh(); },
  onShow: function () {
    var self = this;
    this.refresh();
    if (typeof setInterval === "function") {
      this.timer = setInterval(function () { self.refresh(); }, 30000);
    }
  },
  onHide: function () {
    if (this.timer !== null && typeof clearInterval === "function") { clearInterval(this.timer); }
    this.timer = null;
  }
};
```

The timer only runs while the app is on screen, which is good for battery. `typeof` guards are there because we were not sure at first which globals the runtime exposes.

### Step 4: Generate the compiled page (`gen.py`)

The runtime does not read `.hml` templates. It wants a webpack style module with a render function, a style sheet and a `ViewModel`. Instead of writing that by hand, a small Python script builds it from `src/`.

It inlines the math into the page logic:

```python
pray = open(os.path.join(HERE, "src/praytimes.js")).read()
pray = re.sub(r'if \(typeof module.*\n', '', pray)   # drop the Node export line
logic = open(os.path.join(HERE, "src/page.js")).read().replace("__PRAY__", pray)
```

Builds the render tree with a helper for text elements, static or bound:

```python
def text(cls, value=None, bind=None):
    v = '"%s"' % value if bind is None else 'function(){return t.%s}' % bind
    return '_c("text",{attrs:{value:%s},staticClass:["%s"]})' % (v, cls)

kids = [text("city", bind="city"), text("date", bind="date")]
kids += ['_c("stack",{staticClass:["card"]},[%s,%s,%s])' % (
    text("nextName", bind="nextName"), text("nextTime", bind="nextTime"), text("countdown", bind="countdown"))]
# ... two columns of name/time rows, then the clock
render = 'function(e){var t=e||this;return _c("stack",{staticClass:["page"]},[%s])}' % ",".join(kids)
```

Styles use absolute positions on the 466x466 round screen:

```python
css = {
    "page":      'width:466,height:466,backgroundColor:"#000000"',
    "city":      'left:83,top:40,width:300,height:40,fontSize:30,color:"#ffffff",textAlign:"center"',
    "card":      'left:73,top:120,width:320,height:130,backgroundColor:"#1b5e20",borderRadius:24',
    "nextTime":  'left:0,top:42,width:320,height:50,fontSize:44,color:"#ffffff",textAlign:"center"',
    # ...
}
style = "{classSelectors:{%s}}" % ",".join("%s:{%s}" % kv for kv in css.items())
```

And wraps everything in the module shape the runtime expects, with `new ViewModel(...)` as the export:

```python
out = ('(function(m){var c={};function r(i){if(c[i]){return c[i].exports}'
       'var o=c[i]={i:i,l:false,exports:{}};m[i].call(o.exports,o,o.exports,r);o.l=true;return o.exports}return r(0)})'
       '({0:function(e,t,r){var n=r(1);var u=r(2);var o=r(3);o.styleSheet=u;o.render=n;e.exports=new ViewModel(o)},'
       '1:function(e,t){e.exports=%s},2:function(e,t){e.exports=%s},3:function(e,t){%s\ne.exports=page}});\n'
       % (render, style, logic))
```

Run it:

```bash
python3 watchapp/lite-prayer/gen.py
```

### Step 5: Bytecode, container, `.rpk`

`build-app.sh` does the rest. The core builder of it is three steps:

```bash
# 1. bytecode: the watch only runs pages that have a .bc next to the .js
find "$APP/app/assets/js" -name '*.js' | while read -r js; do
  "$JERRY" generate -o "${js%.js}.bc" "$js" >/dev/null
done

# 2. container
python3 -I "$TOOLS/litebin.py" pack "$BUNDLE" "$APP/app" "$APP/entry-release-unsigned.bin"

# 3. wrapper: copy the payload + key.txt into the aiot-toolkit project and build the .rpk
cp "$APP/entry-release-unsigned.bin" "$WRAP/src/"
(cd "$WRAP" && npx aiot build)
```

Between steps 2 and 3 it also writes `key.txt` with the signing cert fingerprints and syncs the wrapper manifest's package name and version from `config.json`, so the store side and the watch side agree on what this app is.

```bash
watchapp/tools/build-app.sh watchapp/lite-prayer watchapp/hello
```

### Step 6: Install it

Same sideload flow as before, with the prayer package name:

```bash
adb push watchapp/hello/dist/<file>.rpk /data/local/tmp/app.rpk
```

```bash
adb shell "run-as com.xiaomi.wearable mkdir -p files/rpk && run-as com.xiaomi.wearable cp /data/local/tmp/app.rpk files/rpk/app.rpk"
```

```bash
adb shell am instrument -w -e sideload /data/user/0/com.xiaomi.wearable/files/rpk/app.rpk -e pkg dev.miwatch.prayer -e ver 1 -e class dev.miwatch.companion.SideloadRpkTest dev.miwatch.companion.test/androidx.test.runner.AndroidJUnitRunner
```

`code:0` in logcat, and Sholat shows up in the watch app list.

**Want your own city?** Change `LAT`, `LNG`, `TZ` and `CITY` at the top of `praytimes.js` (and the `" WIB"` label in `page.js` if you are in WITA or WIT), bump the version code, then run `gen.py` and `build-app.sh` again.

***

## The Result, Sholat Watch app

The Adzan app is called **Sholat**. It shows today's five prayer times and a live countdown to the next one.

All the math runs on the watch itself, in plain ES5 JavaScript compiled to JerryScript bytecode. It uses the **Kemenag RI** method, the official one in Indonesia:

* Fajr (Subuh) at 20 degrees below the horizon
* Isha (Isya) at 18 degrees
* Shafi'i Asr (shadow length factor 1)
* 2 minutes of *ihtiyat* (safety margin)

For Jakarta on 14 October 2026 it gives Subuh 04:16, Dzuhur 11:41, Ashar 14:46, Maghrib 17:48 and Isya 18:58. Checked against the official Kemenag schedule on several dates, **every time was within one minute.** For something computed from scratch on a smartwatch, I am very happy with that.

### Honest limitations

* **Location is fixed.** The current build is hardcoded to Jakarta (UTC+7).
* **No alarm yet.** The watch runtime has no scheduler or alarm API for third party apps, and the firmware rejects the alarm command set. A watch app simply cannot wake itself up at Maghrib.

### What comes next

The plan is already written down and split into tasks:

1. **Phone does the timing.** The companion app reads the phone's location, computes the same Kemenag times (a Kotlin port tested minute for minute against the JavaScript version), and sets an exact Android alarm for each prayer.
2. **Watch gets the alert.** At prayer time the phone sends a notification to the watch, either directly over our own BLE connection or through Mi Fitness notification forwarding, whichever is available.
3. **Watch follows current location.** Either the phone pushes the city to the watch app over the `system.interconnect` channel, or, if that turns out not to work, the watch gets an on device city picker for Indonesian cities across WIB, WITA and WIT.
