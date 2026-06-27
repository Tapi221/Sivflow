# プロジェクト固有の ProGuard ルールをここに追加します。
# 適用する設定ファイルの一覧は、build.gradle の proguardFiles 設定で制御できます。
#
# 詳細は次を参照してください。
#   http://developer.android.com/guide/developing/tools/proguard.html

# project が JS 付き WebView を使う場合は、次をコメント解除して、
# JavaScript interface class の完全修飾名を指定してください。
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# stack trace の debug 用に line number 情報を残す場合は、これをコメント解除します。
#-keepattributes SourceFile,LineNumberTable

# line number 情報を残す場合に、元の source file 名を隠すにはこれをコメント解除します。
#-renamesourcefileattribute SourceFile

-keep class com.sun.jna.** { *; }
-keep class * implements com.sun.jna.** { *; }
-dontwarn java.awt.Component
-dontwarn java.awt.GraphicsEnvironment
-dontwarn java.awt.HeadlessException
-dontwarn java.awt.Window

# serializable class の `Companion` object field を残します。
# named companion object と同じように `getDeclaredClasses` 経由の serializer lookup を避けるためです。
-if @kotlinx.serialization.Serializable class **
-keepclassmembers class <1> {
    static <1>$Companion Companion;
}

# serializable class の companion object（default / named の両方）にある `serializer()` を残します。
-if @kotlinx.serialization.Serializable class ** {
    static **$* *;
}
-keepclassmembers class <2>$<3> {
    kotlinx.serialization.KSerializer serializer(...);
}

# serializable object の `INSTANCE.serializer()` を残します。
-if @kotlinx.serialization.Serializable class ** {
    public static ** INSTANCE;
}
-keepclassmembers class <1> {
    public static <1> INSTANCE;
    kotlinx.serialization.KSerializer serializer(...);
}

# @Serializable と @Polymorphic は polymorphic serialization の runtime で使われます。
-keepattributes RuntimeVisibleAnnotations,AnnotationDefault

# kotlinx-serialization class の設定ミスや省略候補に関する note は出力しません。
# 関連: https://github.com/Kotlin/kotlinx.serialization/issues/1900
-dontnote kotlinx.serialization.**

# Serialization core は指定 class 内の cache に `java.lang.ClassValue` を使います。
# `java.lang.ClassValue` がない場合（Android など）は R8/ProGuard が warning を出します。
# ただし、この場合は使われないため warning を無効化します。
-dontwarn kotlinx.serialization.internal.ClassValueReferences

# ProGuard の一部 version では descriptor field の最適化で verification error を起こす誤った bytecode が生成されるため、最適化を無効化します。
# 関連: https://github.com/Kotlin/kotlinx.serialization/issues/2719
-keepclassmembers public class **$$serializer {
    private ** descriptor;
}

# file 名と line number を残します。
-keepattributes SourceFile,LineNumberTable
# custom exception を残します。
-keep public class * extends java.lang.Exception
