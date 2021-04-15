---
layout: post
title: "Beberapa perintah CLI helper ku untuk Android"
date: 2021-04-13" "22:53:36
categories: android
emoticon: ⛳️
---

Hingga saat ini, sudah sangat jarang saya menggunakan _Build/Compile_ yang _built-in_ dari Android Studio. Karena sehari-hari pekerjaanku sudah berorientasi modularisasi, maka penggunaan _Build Project_ yang disedikan oleh Android Studio kurang tepat karena berdampak pada performa _device_ yang digunakan, salah satunya _build time_ yang cukup lama.

Sebagai gantinya, saya menggunakan `CLI` untuk mengeksekusi tugas yang dikerjakan oleh `gradle`.

Melakukan `build project`:
```bash
$ ./gradlew assembleDebug
```

Melakukan `build project` dan dengan memanfaatkan `offline mode`:
```bash
$ ./gradlew assembleDebug --offline
```

Melakukan `build project` dan dengan mengabaikan `linter` _task checker_:
```bash
$ ./gradlew assembleDebug -x lint
```

Mengeksekusi `unit/instrument test`:
```bash
$ ./gradlew test
```

Menginstalasi aplikasi ke _device/emulator_ yang aktif:
```bash
$ ./gradlew installDebug
```

<hr>

##### Tips dari saya:

sebelum melakukan eksekusi perintah `CLI` tersebut, pastikan sudah melakukan <b>kill-process</b> terhadap task Java, dengan menggunakan perintah:
```bash
$ killall -9 java
```

<hr>

Agar memudahkan untuk mengeksekusi perintah diatas, silahkan buat alias di `bash_profile` seperti berikut:
```bash
alias killjava = "killall -9 java"
alias assemble = "./gradlew assembleDebug"
alias assembleOffline = "./gradlew assembleDebug --offline -x lint"
alias installRun = "./gradlew assembleDebug --offline -x lint && adb shell am start -a android.intent.action.VIEW -d '$1'"
```

Untuk `installRun`, silahkan tentukan _target applink_ melalui parameter:
```bash
$ installRun "app://isfaaghyth/home"
```


Beberapa manfaat menggunakan `CLI` (_build_ manual melalui terminal), antara lain:
- _Build time_ jauh lebih cepat (menghemat waktu)
- Dapat memaksimalkan jumlah _thread_ yang ada
- Dapat melakukan _build module_ atau memilih _env flavors_ secara spesifik

Sekian!