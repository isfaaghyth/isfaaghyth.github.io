---
title: Reverse and Build IOV app with KMP for Wuling
emoticon: 🚗
toc: true
date: 2026-10-12T09:00:00.000Z
categories:
  - exploration
tags:
  - reverse
---

![WulingX home screen for an Alvez, showing 72 km range, fuel 14%, the car photo and the control tiles](/assets/images/uploads/wulingx-home.jpg)

I drive a Wuling Alvez EX. Like most connected cars here, it comes with an official app, MyWuling+, that can start the engine, turn on the A/C, and lock the doors from your phone. That is about where it stops. The car knows much more than the app shows: it reports its position, it has a sunroof motor, it measures the pressure of every tyre. None of that is reachable from the official app. I could not see where my car is parked, I could not open the sunroof, and I could not check the tyre pressure, even though the data is right there on Wuling's servers.

What I wanted was simple: an app that shows everything the car already reports, and lets me control everything the car already supports.

Earlier I had already captured how the official app talks to Wuling's servers and written it down as API docs (`~/wuling/docs`: auth, the cloud API, the head unit services). The docs sat there for a while. In October 2026 I finally sat down with Claude Opus 5.5 (for building the app, end to end) and gave myself one rule: no multi module setup, everything in one `shared` module, business logic first, UI kept simple. Five days and 27 commits later, I had my own app for Android and iOS: _WulingX_.

## Why my own app

Two reasons.

The everyday one: the missing features. Vehicle position, the sunroof and tyre pressure are things I want weekly, and they are simply not in the official app. And Indonesia is hot. Cooling the cabin before I get in is the single remote feature I use daily, and I wanted it to be one tap, with the real car state on screen (is the engine actually running? are the doors actually locked?) instead of a toast that says "command sent".

The technical one: a car is a good test project. It has a real authentication chain, mutual TLS, asynchronous commands that take seconds to reach the car, and state that comes back in a format nobody documented. If I could make that reliable on two platforms from one codebase, Kotlin Multiplatform had earned its place in my toolbox.

## The reverse engineering

Nothing here comes from a public SDK. Wuling has none. Everything starts from the official Android app, `com.yonyou.cip.sgmw` version 3.2.2, and from the car itself.

### Step 1: the APK

Decompiling the APK gave three things:

- **The endpoints and request bodies.** Every remote command in the official app goes through a `TspManager` class, with methods like `vhlCtrlSunroofWindow(open)` and `vhlCtrlOnlyFourWindow(open)`. That is how we learned the sunroof is control objective `8` and the windows are `2`, long before trying them on the car.
- **The certificates.** The gateway uses mutual TLS. The client certificate, its private key and the self signed gateway CA are shipped inside the APK as BouncyCastle (`.bks`) keystores under `assets/`. Converting them to PEM and then to a `.p12` gave our app the same identity as the official one.
- **The config.** The addresses of the MQTT brokers (more on that below) sit in the app's own configuration.

### Step 2: the traffic

With the certificates in hand, I captured the official app's traffic while pressing every button: login, A/C on, lock, unlock. Each capture became a "known good" request body in the docs. The command cookbook in `iov-cloud-api.md` is literally a list of bodies that worked on my car.

The status endpoint was the real prize. One call, `getRemoteCtrVhlInfo`, returns fuel, range, odometer, GPS position, tyre pressure and temperature, window and sunroof state. The official app reads only a few of these fields. The rest was just never shown.

### Step 3: the car

The head unit is an Android 8 device, and it runs a Wi-Fi hotspot. An `nmap -p- 192.168.43.1` from a laptop on that hotspot found open ports, including a local MQTT broker on `1883` and a "QinkLink" transport service on `18080` (used for phone projection). There is even a hidden recovery mode with stock Android Settings behind a steering wheel button sequence. Interesting, but none of that is needed for a phone app: everything WulingX does goes through the cloud.

Everything was written down in `~/wuling/docs`, together with a small Python client that proves each call works. That Python client was the reference the Kotlin app was checked against.

**Warning:** the keystore passwords and broker credentials are in the APK, but I do not publish them here. If you repeat this, extract them from your own copy of the app.

## The API, in one picture

Before the findings, here is the shape of the whole thing. There are two servers, and they do not trust the same things:

| Server                  | Used for                         | TLS                                                       | Auth                           |
| ----------------------- | -------------------------------- | --------------------------------------------------------- | ------------------------------ |
| `app.wuling.co.id`      | email login, car photo and model | public TLS                                                | the app JWT, raw (no `Bearer`) |
| the IOV gateway (Pateo) | vehicles, commands, status       | **mutual TLS** with a client certificate and a private CA | `Bearer` gateway token         |

And every remote command is a three step conversation:

```
1. GET  rcs/vehicle/checkPin/{vin}?pin=...           is this PIN right?
2. POST rcs/remote/V2/sendVhlCtl/{tbox}/180/miniapp   here is the command  -> messageId
3. GET  rcs/remote/V2/getVhlCtlResult/{tbox}/miniapp/{messageId}
        ... repeat every 2 seconds until the car answers (or 60 seconds pass)
```

Then one more read, `datamining/getRemoteCtrVhlInfo/{vin}`, tells you what the car looks like now.

### And the MQTT side

HTTP is not the whole story. The gateway does not talk to the car directly: commands are delivered to the T-Box through an **MQTT broker** run by Pateo (the Chinese supplier behind Wuling's connected platform), over TLS on port `8883`. The official app also listens on that broker. Each car has a broadcast topic:

```
wlynapp/BROADCAST/MOBILE/{tbox}
```

When something changes on the car (engine, A/C and its temperature, door lock, trunk, hood, windows), a "车况信息" (vehicle status) message is pushed there. That is how the official app updates instantly after you lock the car with the physical key.

WulingX now listens there too, so the status on screen updates the moment the car changes, not after a refresh. It follows two strict rules: subscribe only to my own car's topic, and never publish anything. The broker is shared by every user of the official app, and a wrong message there is not something I want to find out about.

## What we discovered

This time I am writing the findings as "what we assumed" versus "what was true", because almost every one of them started as a wrong guess.

### Finding 1: the gateway login does not work for real accounts

**Assumed:** the docs showed a gateway login with a phone number or email plus password, so we built that first.

**Reality:** it returned error `20019` for my account. My main account was created with Google sign in, and accounts like that simply have no gateway password. The working path was the one the official app uses for _email_ login, on the other server:

```
GET app.wuling.co.id/api/dearccCustomer/v1/appUserLogin?email=&password=&deviceId=&deviceType=0
```

Yes, the password goes in the query string. That is how their API works, not my choice. The good news: the response already carries the gateway tokens (`btAccessToken`, `btRefreshToken`), so one login gives access to both servers.

For Google accounts, the workaround is to add an email address as a collaborator on the car inside MyWuling+, then log in to WulingX with that email. The login screen explains the six steps in a bottom sheet.

### Finding 2: iOS refuses a certificate that Android accepts

**Assumed:** load the client `.p12`, pin the Pateo CA, done. On Android this worked on the first try.

**Reality:** iOS rejected the gateway with `OtherTrustValidityPeriod` (-9802). Since 2019, iOS refuses TLS server certificates valid for more than 825 days, _even when you trust the CA yourself_. Pateo's gateway certificate is valid for decades. The fix is to evaluate the chain with the basic X.509 policy instead of the SSL one: the chain and expiry are still checked against our CA, only the 825 day rule is skipped. An ATS exception for the gateway host in `Info.plist` completes it.

### Finding 3: "done" is not the same as "the car did it"

**Assumed:** when the poll returns success, show "A/C on, done".

![The Vehicle position sheet in WulingX: last known location reported 13 hours ago, with an Open in Maps button](/assets/images/uploads/wulingx-vehicle-position.jpg)

**Reality:** success only means the car received the command. To show a real "Turn A/C off" button after turning it on, the app has to read the car state afterwards. The field names were guessable, but the values were not:

| Field                  | Value     | Meaning                           | How we know              |
| ---------------------- | --------- | --------------------------------- | ------------------------ |
| `remoteStartStatus`    | `1` / `0` | engine running / off              | observed                 |
| `doorLockState`        | `0` / `1` | **locked** / unlocked             | unlock flipped it 0 to 1 |
| `no1..no4WindowStatus` | `0` / `9` | closed / not available            | observed                 |
| `acTemperature`        | `10`      | placeholder, not a real set point | ignored outside 17..33   |
| `dormerOpenStatus`     | `0`       | closed, **or no sunroof at all**  | the trap                 |

Note `doorLockState`: `0` means locked, the opposite of what most people would guess. Window "open" (`1`) and the sunroof values started as guesses too, and were confirmed later on the car.

### Finding 4: the gateway drops the first connections

The login sometimes failed with no reason. Logs showed `queryAll` failing twice and then working. We added a silent retry, three attempts, but only for "no response" and 5xx. A real rejection (wrong password) is never retried, so the user sees it immediately.

### Finding 5: the T-Box ID can change under you

Commands are addressed to the T-Box (the car's telematics unit), not the VIN. One day every command failed with the Chinese message `获取车机号码失败` ("failed to get the car unit number"). The T-Box ID cached at login was stale. Now the app looks the ID up again from the vehicle inventory and retries once.

## How to do it yourself

> Tested on a Wuling Alvez with official app version 3.2.2, an Android phone and the iOS simulator. Kotlin 2.3.21, Compose Multiplatform 1.11, Ktor 3.3.0.

**Requirements:** Android Studio or the Android SDK, Xcode for iOS, JDK 17, and your own copy of the client certificate (`client.p12`), its password and the gateway CA (`ca.pem`). These come from the official app and the docs. I do not publish them.

**Warning:** this talks to your real car. A wrong command body can start the engine in a closed garage. Test commands while you can see the car.

### 1. Put the secrets where the build expects them

```bash
cp client.p12 ca.pem shared/src/commonMain/composeResources/files/secrets/
```

Then add the password to `local.properties` (git ignored):

```properties
wuling.p12Password=...
```

### 2. Run the tests

```bash
./gradlew :shared:testAndroidHostTest
```

```bash
./gradlew :shared:iosSimulatorArm64Test
```

### 3. Run the app

```bash
./gradlew :androidApp:installDebug
```

For iOS, open `iosApp/` in Xcode and run.

## Building WulingX, layer by layer

The previous post walked through files in build order. This app is bigger, so here it is by layer instead, from the network up to the release pipeline.

### Layer 1: login on one server, tokens for the other (`AuthRepository.kt`)

The login hits the app domain, takes the gateway token out of the answer, and resolves the car on the gateway:

```kotlin
suspend fun login(email: String, password: String): LoginResult = try {
    gatewayClient.resetCachedToken()
    val loginData = requestLogin(email.trim(), password)
    val rData = loginData?.rData
    val accessToken = rData?.btAccessToken?.takeIf { it.isNotBlank() }
    when {
        rData?.resultCode != SUCCESS_CODE -> LoginResult.Rejected(rData?.errMsg ?: GENERIC_LOGIN_FAILED)
        accessToken == null -> LoginResult.NoGatewayAccess
        else -> {
            val vehicle = fetchDefaultVehicle(accessToken)
            // ... save the session (token, VIN, T-Box ID) and the profile with the car photo
        }
    }
} catch (e: Exception) {
    LoginResult.NetworkError(e)
}
```

And the retry from Finding 4. Anything below 500 is a real answer and goes straight back:

```kotlin
private suspend fun retryTransient(request: suspend () -> HttpResponse): HttpResponse {
    var attempt = 1
    while (true) {
        val response = try {
            request()
        } catch (e: Exception) {
            if (attempt >= LOGIN_ATTEMPTS) throw e
            null
        }
        if (response != null && (response.status.value < 500 || attempt >= LOGIN_ATTEMPTS)) return response
        retryPause(attempt)
        attempt++
    }
}
```

### Layer 2: mutual TLS on iOS (`GatewayEngine.ios.kt`)

Android uses OkHttp with a `KeyManagerFactory` and a `TrustManagerFactory`, standard stuff. iOS needed the trick from Finding 2. The Darwin engine answers two challenges: "who are you" with our client identity, and "do you trust me" with our own check:

```kotlin
NSURLAuthenticationMethodClientCertificate ->
    completionHandler(NSURLSessionAuthChallengeUseCredential, clientCredential)

NSURLAuthenticationMethodServerTrust -> {
    val trust = space.serverTrust
    if (trust != null && evaluateAgainstCa(trust, caCert)) {
        completionHandler(NSURLSessionAuthChallengeUseCredential, NSURLCredential.credentialForTrust(trust))
    } else {
        completionHandler(NSURLSessionAuthChallengeCancelAuthenticationChallenge, null)
    }
}
```

The check itself is four lines. The important one is the first:

```kotlin
private fun evaluateAgainstCa(trust: SecTrustRef, caCert: SecCertificateRef): Boolean = memScoped {
    SecTrustSetPolicies(trust, SecPolicyCreateBasicX509())
    val anchors = CFArrayCreate(null, allocArrayOf(caCert).reinterpret(), 1, kCFTypeArrayCallBacks.ptr)
    SecTrustSetAnchorCertificates(trust, anchors)
    SecTrustSetAnchorCertificatesOnly(trust, true)
    SecTrustEvaluateWithError(trust, null)
}
```

### Layer 3: commands as data (`VehicleCommand.kt`)

Every command is a case of one sealed interface, and each case knows its own JSON body. The car identifies parts by "control objective" numbers: `17` engine, `12` A/C, `2` the four windows, `8` the sunroof. Doors use a separate, simpler object.

```kotlin
sealed interface VehicleCommand {
    data class AcOn(val celsius: Int = AcTemperature.DEFAULT) : VehicleCommand
    data class SetAcTemperature(val celsius: Int) : VehicleCommand
    data object EngineOff : VehicleCommand
    data object LockDoors : VehicleCommand
    data object UnlockDoors : VehicleCommand
    data object CloseWindows : VehicleCommand
    data object OpenWindows : VehicleCommand
    data object CloseSunroof : VehicleCommand
    data object OpenSunroof : VehicleCommand
    // ...
}
```

"A/C on" is really two objects: start the engine, then the A/C at a temperature:

```kotlin
is AcOn -> extendedObjects {
    engine(on = true)
    ac(mode = AC_MODE_ON, celsius = command.celsius)
}
```

```kotlin
private fun JsonArrayBuilder.ac(mode: String, celsius: Int) = addJsonObject {
    put("controlObjective", OBJECTIVE_AC)
    putJsonObject("rctlVhlParams") {
        put("goalValue1", celsius.toString())
        put("remoteACMode", mode)
        put("unitOfValue1", "0")
    }
}
```

The temperature is limited to 17..33 °C, the same range the official app sends. A value outside it fails in the constructor, before anything reaches the car.

### Layer 4: send, then wait for the car (`CommandTracker.kt`)

The tracker turns the three step conversation into a `Flow` the UI can follow: verifying PIN, sending, polling, then succeeded, failed or timed out.

```kotlin
private suspend fun FlowCollector<CommandState>.attempt(session: Session, command: VehicleCommand): CommandState {
    val messageId = when (val sent = remote.send(session, command)) {
        is SendResult.Rejected -> return CommandState.Failed(sent.message, sent.reason)
        is SendResult.Accepted -> sent.messageId
    }
    emit(CommandState.Polling)
    return withTimeoutOrNull(timeout) {
        var outcome: CommandState? = null
        while (outcome == null) {
            delay(pollInterval)
            outcome = when (val result = remote.pollResult(session, messageId)) {
                PollResult.Pending -> null
                PollResult.Succeeded -> CommandState.Succeeded
                is PollResult.Failed -> CommandState.Failed(result.message, result.reason)
            }
        }
        outcome
    } ?: CommandState.TimedOut
}
```

`VehicleRemote` is an interface, so the whole flow is tested with a fake gateway in virtual time. No test ever touches the real car.

### Layer 5: background alerts (`AlertEvaluator.kt`)

Every 30 minutes (WorkManager on Android, `BGTaskScheduler` on iOS, best effort there) the app reads the status and decides whether to notify. The decision is a pure function, same input, same output:

```kotlin
const val FUEL_LOW = 10
const val FUEL_REARM = 15
const val SERVICE_INTERVAL_KM = 10_000L
const val SERVICE_APPROACH_KM = 500L
```

```kotlin
status.fuelPercent?.let { fuel ->
    when {
        fuel < FUEL_LOW && fuelArmed -> {
            fuelArmed = false
            if (settings.fuelAlerts) notices += AlertNotice.LowFuel(fuel, status.rangeKm, status.location)
        }
        fuel > FUEL_REARM -> fuelArmed = true
    }
}
```

The gap between 10% and 15% stops the alert from repeating every half hour while the fuel hovers around the line. The fuel alert opens a Maps search for gas stations near the car, and the service alert (500 km before every 10,000 km) opens one for workshops. When the app is open, the same notice shows as an in app banner instead of a system notification.

## The Result, WulingX Android and iOS app

**WulingX** is one Kotlin Multiplatform codebase that runs on Android and iOS and controls a real Wuling Alvez:

- **Engine and A/C:** on and off, temperature from 17 to 33 °C, with the real engine state shown as a glow under the car photo
- **Doors, windows, sunroof:** lock and unlock, open and close (the sunroof box only appears for cars that have one)
- **Status:** fuel, range, odometer, tyre pressure and temperature, and the car's location, updated in real time over MQTT
- **Nearest dealers:** Wuling dealers and workshops near the car, on a map
- **Alerts:** low fuel below 10%, service every 10,000 km, both with a Maps shortcut
- **Look:** a home screen in the style of the BYD app, a sky to steel blue gradient, Manrope, and dark mode

![The Fuel and trip sheet in WulingX: fuel 14%, range 72 km, odometer 37181 km](/assets/images/uploads/wulingx-fuel-and-trip.jpg)

Built in five days (7 to 11 October 2026), 27 commits, every feature written as an OpenSpec change first and archived into the main specs after.

### Honest limitations

- **Tyre pressure depends on the car reporting it.** When the car sends no reading (flag `7`), the tile says "No data" instead of showing fake numbers, as in the screenshot above.
- **iOS background is best effort.** iOS decides when background tasks run, so alerts can be late.

### What comes next

1. **Bluetooth keyless.** Unlocking the car over BLE when the phone is close, without the cloud.
