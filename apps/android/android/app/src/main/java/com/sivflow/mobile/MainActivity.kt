package com.sivflow.mobile

import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // 背景、ステータスバー、ナビゲーションバーの色を反映するため、
    // onCreate より前にテーマを AppTheme に設定します。
    // expo-splash-screen で必要です。
    setTheme(R.style.AppTheme);
    super.onCreate(null)
  }

  /**
   * JavaScript 側で登録されたメインコンポーネント名を返します。
   * この名前はコンポーネントの描画を予約するために使われます。
   */
  override fun getMainComponentName(): String = "main"

  /**
   * [ReactActivityDelegate] のインスタンスを返します。
   * [DefaultReactActivityDelegate] を使うことで、[fabricEnabled] の boolean だけで
   * New Architecture を有効化できます。
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
           this,
           BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
           object : DefaultReactActivityDelegate(
               this,
               mainComponentName,
               fabricEnabled
           ){})
  }

  /**
    * Android S の戻るボタン挙動に合わせます。
    * root activity を終了せず、バックグラウンドへ移動する挙動です。
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // root ではない activity では、既定の実装で終了します。
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Android S 以降では既定の戻るボタン実装を使います。
      // 実際には [Activity.moveTaskToBack] より多くの処理を行うためです。
      super.invokeDefaultOnBackPressed()
  }
}
