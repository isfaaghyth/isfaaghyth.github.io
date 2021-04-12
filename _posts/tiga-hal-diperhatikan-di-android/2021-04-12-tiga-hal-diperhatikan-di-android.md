---
layout: post
title: "3 Hal yang harus diperhatikan pada Android (Bagian 1)"
date: 2021-04-12" "20:44:32
categories: android
emoticon: 🔥
---

##### 1. Android Context

Ada beberapa hal yang harus diperhatikan ketika mengolah objek `context` pada android. 

Pertama, jika membutuhkan sebuah objek `context`, pastikan jangan mengirim/menerima nya melalui _constructor_ class, karena ketika objek `context` hidup lebih lama _(keeping a long-lived reference)_, ia akan menyebabkan _memory leaks_. seperti:
```kotlin
open class SomeManager constructor(
    private val context: Context
) { ... }
```

Solusinya, buat `setter` untuknya. (nit: gunakan `application context` ketika kamu membuat `singleton class`):
```kotlin
open class SomeManager {

    private var _context: Context? = null

    fun init(context: Context) {
        _context = context
    }

}
```

Kedua, jangan mengirimkan sebuah objek `context` jauh dari kepemilikannya, misalkan:
```kotlin
class HomeFragment : Fragment() {
    ...
    fun doSomething() {
        manager.doMore(context)
    }
}

open class SomeManager constructor(
    private val repository: Repository,
    private val context: Context
) {

    fun doNeedMore() {
        repository.request(context)
    }

}
```

##### 2. Gunakan `SparseArrayCompat` sebagai pengganti `HashMap`

Kamu bisa menggunakan `SparseArrayCompat` sebagai pengganti `HashMap` untuk menyimpan data `key-value`. Karena, `SparseArrayCompat` memiliki lebih sedikit fungsi dan alokasi memori daripada `HashMap`. Perhatikan perbandingan berikut:

```kotlin
class SparseIntArray {
    int[] keys;
    int[] values;
    int size;
}
```
```bash
Class = 12 + 3 * 4 = 24 bytes
Array = 20 + 1000 * 4 = 4024 bytes
Total = 8,072 bytes
```

```kotlin
class HashMap<K, V> {
    Entry<K, V>[] table;
    Entry<K, V> forNull;
    int size;
    int modCount;
    int threshold;
    Set<K> keys
    Set<Entry<K, V>> entries;
    Collection<V> values;
}
```
```bash
Class = 12 + 8 * 4 = 48 bytes
Entry = 32 + 16 + 16 = 64 bytes
Array = 20 + 1000 * 64 = 64024 bytes
Total = 64,136 bytes
```

##### 3. Penggunaan `null-checker` yang efektif

Di Kotlin, kita dapat melakukan validasi dan menghindari NPE dengan menggunakan ekstensi `.let {...}`. Akan tetapi, ekstensi tersebut tidak tepat jika kita hanya gunakan sebagai `null-safety validation`. Misalkan:
```kotlin
private var test: String? = null

fun doSomething() {
    test?.let {
        //TODO
    }
}
```
Ketika kita coba melakukan dekompilasi, akan terlihat seperti ini:
```java
private String test;

public final void doSomething() {
    if (this.test != null) {
        boolean var2 = false;
        boolean var3 = false;
        boolean var5 = false;
    }
}
```
Ada 3 _ghost variable_ (tidak digunakan; tidak memiliki fungsi) yang di _generate_ oleh ekstensi `.let {...}`.

Solusinya menggunakan cara primitif, seperti:
```kotlin
private var test: String? = null

fun doSomething() {
    if (test != null) {
        //TODO
    }
}
```

Berikut hasil dekompilasinya:
```java
private String test;

public final void doSomething() {
    if (this.test != null) {
    }
}
```

<hr>

Bagian kedua akan dipublikasikan di minggu depan.
Sekian!
