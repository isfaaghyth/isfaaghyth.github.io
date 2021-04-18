---
layout: post
title: "Membuat Library android independen dengan Library lainnya"
date: 2021-04-18" "16:32:49
categories: android
emoticon: 🧢
---

Terkadang, ketika kita membuat _library_, kita memasukkan semua _deps_ atau _library_ yang terkait kedalam `build.gradle` yang ada pada proyek kita. Tetapi, hal tersebut memiliki dampak `tightly coupled` terhadap _deps_ yang lain.

#### Contoh sederhana

Kita asumsikan, membuat library dengan nama `tracker`. Secara sederhana, _library_ ini hanya mengirimkan _tracker_ ke _analytics_ yang kita gunakan.

Penggunaannya kira-kira seperti ini:
```kotlin
Tracker.instance.init()
Tracker.instance.eventClick("do something")
```

Namun, di modul `tracker` ini, kita membutuhkan data `user` dari module `user_session`, misalnya:
```kotlin
open class Tracker {

    private val userSession by lazy { UserSession() }
    
    ...

    fun eventClick(message: String) {
        val `data` = mapOf(
            "user_id" to userSession.id,
            ...
        )

        sendToAnalytics(`data`)
    }

    ...

}
```

Pada kode diatas, menunjukkan bahwa _library_ `tracker` membutuhkan data `userId` dari _library_ `user_session`, berarti, kita harus memasukkan deps `user_session` kedalam _library_ `tracker`:
```gradle
implementation project(rootProject.ext.libraries.user_session)
```

##### Lalu, bagaimana caranya menghapus userSession dari tracker?

Kita bisa memanfaatkan `Bridge Proxy` untuk menyelesaikan studi kasus diatas. Karena kita hanya membutuhkan data `userId`, kita dapat membuat sebuah `interface class` sebagai penghubung dan pengantar data antar `library`.

Kira-kira solusinya dapat kita selesaikan seperti ini:
```kotlin
interface TrackerProxy {
    val userId: String
}

open class Tracker constructor(
    private val proxy: TrackerProxy
) {

    ...

    fun eventClick(message: String) {
        val `data` = mapOf(
            "user_id" to proxy.userId,
            ...
        )

        sendToAnalytics(`data`)
    }

    ...

}
```

Lalu pada penggunaannya, akan terlihat seperti ini:
```kotlin
Tracker.instance.init(object : TrackerProxy {
    override fun userId = userSession.id
})
Tracker.instance.eventClick("do something")
```

Dengan begitu, kita sudah dapat memisahkan _library_ `user_session` dari _library_ `tracker`.

Metode ini dapat membuat kode kita lebih mudah untuk di pelihara, lebih bersih, dan lebih substantif, dan kita bisa memberikan `userId` darimanapun kita butuhkan (tanpa harus dari `user_session`).

Sekian!