---
layout: post
title: "Beberapa perintah CLI helper ku untuk Android"
date: 2021-04-13" "22:53:36
categories: android
emoticon: ⛳️
---

Hingga saat ini, sudah sangat jarang saya menggunakan Build/Compile yang _built-in_ dari Android Studio. Karena sehari-hari pekerjaanku sudah berorientasi modularisasi, maka penggunaan kurang tepat ketika menggunakan _Build Project_ yang disedikan oleh Android Studio. Sebagai gantinya, saya menggunakan `CLI` untuk mengeksekusi tugas yang dikerjakan oleh `gradle`.

Melakukan `build project`:
```bash
$ ./gradlew assembleDebug
```

Melakukan `build project` dan dengan memanfaatkan `offline mode`:
```bash
$ ./gradlew assembleDebug --offline
```

Melakukan `build project` dan dengan mengabaikan _task_ `linter`:
```bash
$ ./gradlew assembleDebug -x lint
```

Mengeksekusi `unit test`:
```bash
$ ./gradlew test
```

Menginstalasi aplikasi ke _device/emulator_ yang aktif:
```bash
$ ./gradlew installDebug
```

Tips dari saya:
```
sebelum melakukan eksekusi perintah CLI tersebut, pastikan sudah melakukan kill-process terhadap task Java, dengan menggunakan perintah:
$ killall -9 java
```


Beberapa manfaat menggunakan `CLI` (_build_ manual melalui terminal), antara lain:
- _Build time_ jauh lebih cepat (menghemat waktu)
- Dapat memaksimalkan jumlah _thread_ yang ada
- Dapat melakukan _build module_ secara spesifik
- _Exponential cache_, maksudnya, setiap menggunakan perintah `CLI`, maka modul yang sudah di _build_, akan ambil dari _cache_ yang sudah terjadi sebelumnya

Sekian!