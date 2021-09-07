---
layout: post
title: "Mock Private Property dengan MockK"
date: 2021-09-07" "21:51:34
categories: android
emoticon: 🧟
---

### Context

*MockK* merupakan salah satu _library_ yang dapat kita gunakan untuk _testing_ pada Android. Banyak `API` yang telah disedikan yang memudahkan kita untuk melakukan testing, _mocking private method_ misalnya. Seperti yang kita ketahui, *mockK* memiliki _infix extension_ `getProperty()` yang dapat kita gunakan untuk _mocking_ terhadap `private function` yang ada pada class. Tapi, `getProperty()` tersebut belum mendukung untuk sebuah _private property_. Alasannya, karena sebuah _property_ yang _private_ tidak memiliki `getter/setter`. 

https://github.com/mockk/mockk/issues/104

### Solution

Lalu, bagaimana agar dapat melakukan _mocking_ terhadap _private property_? Kita dapat melakukan secara sederhana, dengan menggunakan _class reflection_ seperti berikut:

```kotlin
data class MockProperty(var propertyName: String, var value: Any)

private infix fun Any.mockProperty(property: MockProperty): Any {
    javaClass.declaredFields
        .filter { it.modifiers.and(Modifier.PRIVATE) > 0 || it.modifiers.and(Modifier.PROTECTED) > 0 }
        .firstOrNull { it.name == property.propertyName}
        ?.also { it.isAccessible = true }
        ?.set(this, property.value)
    return this
}
```

Cara menggunakannya pun cukup mudah:

```kotlin
class Foo {
    private var isSuccess = false

    fun isSuccessStatus() = isSuccess
}

class FooTest {
    
    private val foo = Foo()

    @Test `it should be return isSuccess as true`() {
        // Given
        val expectedValue = true
        foo mockProperty MockProperty("isSuccess", expectedValue)

        // When
        val result = foo.isSuccessStatus()

        // Then
        assertTrue { result == expectedValue }
    }
}

```

Cheers! 🥛