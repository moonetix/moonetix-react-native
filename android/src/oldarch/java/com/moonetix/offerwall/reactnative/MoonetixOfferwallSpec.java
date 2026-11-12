package com.moonetix.offerwall.reactnative;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;

/** Old architecture (React Native 0.77 to 0.81 with newArchEnabled=false): a bridge module with the same methods. */
abstract class MoonetixOfferwallSpec extends ReactContextBaseJavaModule {

    MoonetixOfferwallSpec(ReactApplicationContext context) {
        super(context);
    }

    public abstract void configure(String appId);

    public abstract void open(String token, @Nullable String title, double toolbarColor, boolean showLogo);

    public abstract void addListener(String eventName);

    public abstract void removeListeners(double count);
}
