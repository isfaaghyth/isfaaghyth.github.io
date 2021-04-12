---
layout: post
title: "Membuat SharedPreferences dinamis"
date: 2021-04-12" "09:54:39
categories: android
emoticon: 🍽
---

Prasyarat:
```
implementation 'com.google.code.gson:gson:x.y.z'
```

Buat `class` dengan `skeleton` sebagai berikut:
```kotlin
internal class SharedPrefreencesManager {

    private var preferences: SharedPreferences? = null

    fun init(context: Context) {
        val prefName = "pref_sample"
        
        preferences = context.getSharedPreferences(
            prefName,
            Context.MODE_PRIVATE
        )
    }

    inline fun <reified T> add(key: String, obj: T) {
        val objString = Gson().toJson(obj, T::class.java)
        preferences?.edit()?.putString(key, objString)
    }

    inline fun <reified T> get(key: String): T? {
        val obj = preferences?.getString(key, null)
        return Gson().fromJson(obj, T::class.java)
    }

}
```

cara penggunaan:
```kotlin
private val preferencesManager by lazy {
    SharedPrefreencesManager(context)
}

private val key_uname = "username"

preferencesManager.add(key_uname, "isfaaghyth")

...

println(preferencesManager.get(key_name))
```